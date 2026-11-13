import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function testAdminFormsDatabase(client, check) {
  const owner = (
    await client.query('select id from admin_profiles where active limit 1')
  ).rows[0].id;
  const service = (await client.query('select id from services limit 1'))
    .rows[0].id;
  const call = async (kind, data, services = [service], hours = []) =>
    (
      await client.query(
        'select admin_owner_form($1,$2::jsonb,$3::uuid[],$4::jsonb) r',
        [kind, JSON.stringify(data), services, JSON.stringify(hours)],
      )
    ).rows[0].r;
  const before = (
    await client.query(
      'select jsonb_agg(to_jsonb(a) order by id) snapshot from appointments a',
    )
  ).rows[0].snapshot;
  await client.query('set role authenticated');
  try {
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    let offer;
    await check(
      'owner offer form saves promotion and eligible services atomically',
      async () => {
        offer = await call('promotion', {
          name: 'TEST owner offer',
          description: '',
          kind: 'fixed',
          value: 5000,
          starts_at: '2026-01-01T00:00:00Z',
          ends_at: '2027-01-01T00:00:00Z',
          terms: '',
          active: false,
          code: null,
          max_uses: null,
        });
        const links = (
          await client.query(
            'select service_id from promotion_services where promotion_id=$1',
            [offer.id],
          )
        ).rows;
        assert.deepEqual(
          links.map((r) => r.service_id),
          [service],
        );
        await assert.rejects(
          () =>
            call(
              'promotion',
              { ...offer, name: 'Must roll back', usage_count: undefined },
              [randomUUID()],
            ),
          /foreign key/,
        );
        assert.equal(
          (
            await client.query('select name from promotions where id=$1', [
              offer.id,
            ])
          ).rows[0].name,
          offer.name,
        );
        assert.equal(
          (
            await client.query(
              'select count(*)::int n from promotion_services where promotion_id=$1',
              [offer.id],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await check(
      'owner employee form preserves split shifts and qualifications as one save',
      async () => {
        const hours = [
          { weekday: 1, opens: '09:00', closes: '12:00' },
          { weekday: 1, opens: '14:00', closes: '18:00' },
        ];
        const employee = await call(
          'employee',
          { name: 'TEST owner employee', kind: 'staff', active: true },
          [service],
          hours,
        );
        assert.equal(
          (
            await client.query(
              'select count(*)::int n from working_hours where resource_id=$1',
              [employee.id],
            )
          ).rows[0].n,
          2,
        );
        assert.equal(
          (
            await client.query(
              'select count(*)::int n from qualifications where resource_id=$1',
              [employee.id],
            )
          ).rows[0].n,
          1,
        );
        await assert.rejects(
          () =>
            call(
              'employee',
              {
                id: employee.id,
                kind: 'staff',
                active: true,
                name: 'Must roll back',
              },
              [service],
              [{ weekday: 1, opens: '18:00', closes: '09:00' }],
            ),
          /check constraint/,
        );
        assert.equal(
          (
            await client.query('select name from resources where id=$1', [
              employee.id,
            ])
          ).rows[0].name,
          employee.name,
        );
        assert.equal(
          (
            await client.query(
              'select count(*)::int n from working_hours where resource_id=$1',
              [employee.id],
            )
          ).rows[0].n,
          2,
        );
      },
    );
    await check(
      'composite forms reject protected fields and unauthorized identities',
      async () => {
        await assert.rejects(
          () => call('promotion', { ...offer, usage_count: 900 }),
          /INVALID_INPUT/,
        );
        await assert.rejects(
          () =>
            call('employee', {
              name: 'Equipment bypass',
              kind: 'equipment',
              active: true,
            }),
          /INVALID_INPUT/,
        );
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [randomUUID()],
        );
        await assert.rejects(
          () => call('promotion', { name: 'Forbidden' }),
          /FORBIDDEN/,
        );
      },
    );
  } finally {
    await client.query('reset role');
  }
  await check(
    'admin form changes leave all existing appointment snapshots unchanged',
    async () => {
      assert.deepEqual(
        (
          await client.query(
            'select jsonb_agg(to_jsonb(a) order by id) snapshot from appointments a',
          )
        ).rows[0].snapshot,
        before,
      );
    },
  );
}
