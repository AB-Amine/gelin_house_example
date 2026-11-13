import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
export async function testAppointmentRequestsDatabase(db, check) {
  const owner = (
    await db.query(
      "select id from admin_profiles where active and role='owner' limit 1",
    )
  ).rows[0].id;
  const before = (
    await db.query(
      'select jsonb_agg(to_jsonb(a) order by id) s from appointments a',
    )
  ).rows[0].s;
  await db.query(
    "update salon_settings set address='TEST fixed salon',approved=true,booking_enabled=true where id=1",
  );
  const services = [];
  for (let i = 0; i < 2; i++)
    services.push(
      (
        await db.query(
          "insert into services(name,slug,duration_minutes,price_type,published) values($1,$2,null,'consultation',true) returning id",
          [`TEST diary ${i}`, `test-diary-${i}`],
        )
      ).rows[0].id,
    );
  const day = (
    await db.query(
      "select ((now() at time zone 'Africa/Casablanca')::date+70)::text d",
    )
  ).rows[0].d;
  const instant = async (time) =>
    (
      await db.query(
        "select ($1::date+$2::time) at time zone 'Africa/Casablanca' t",
        [day, time],
      )
    ).rows[0].t.toISOString();
  // This test exercises start-only behavior, with explicit opening hours.
  await db.query(
    "insert into opening_exceptions(day,opens,closes) values($1,'00:00','23:59')",
    [day],
  );
  const request = async (time = '05:48') =>
    (
      await db.query(
        "insert into contact_messages(name,phone,email,subject,message,service_ids,preferred_date,preferred_time) values('TEST diary client','+212612345678','','Demande de rendez-vous','TEST start-only request',$1,$2,$3) returning id",
        [services, day, time],
      )
    ).rows[0].id;
  const confirm = async (id, connection = db) =>
    (
      await connection.query(
        "select resolve_appointment_request($1,'confirm',$2) r",
        [id, owner],
      )
    ).rows[0].r;
  const created = [];
  let id, a;
  await check(
    'start-time diary confirms two unknown-duration services without fabricated durations or allocations',
    async () => {
      id = await request();
      a = await confirm(id);
      created.push(a.id);
      assert.equal(a.status, 'confirmed');
      const row = (
        await db.query('select * from appointments where id=$1', [a.id])
      ).rows[0];
      assert.equal(row.scheduling_mode, 'diary');
      assert.equal(row.starts_at.toISOString(), await instant('05:48'));
      assert.equal(row.ends_at.toISOString(), row.starts_at.toISOString());
      const items = (
        await db.query(
          'select * from appointment_items where appointment_id=$1',
          [a.id],
        )
      ).rows;
      assert.equal(items.length, 2);
      assert.ok(
        items.every(
          (i) => i.duration_minutes === null && i.resource_id === null,
        ),
      );
      assert.equal(
        (
          await db.query(
            'select count(*)::int n from allocations where appointment_id=$1',
            [a.id],
          )
        ).rows[0].n,
        0,
      );
      assert.equal((await confirm(id)).id, a.id);
    },
  );
  await check(
    'diary confirmation appears in calendar and booking search with customer details',
    async () => {
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from search_appointments('', $1, $2, null) where id=$3",
            [await instant('00:00'), await instant('23:59'), a.id],
          )
        ).rows[0].n,
        1,
      );
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        owner,
      ]);
      const list = (
        await db.query('select fatu_search_bookings(p_from=>$1,p_to=>$2) b', [
          await instant('00:00'),
          await instant('23:59'),
        ])
      ).rows[0].b;
      assert.ok(list.rows.some((row) => row.id === a.id));
    },
  );
  await check(
    'exact duplicate starts are refused but different starts do not promise interval exclusion',
    async () => {
      await assert.rejects(() => request().then(confirm), /START_TIME_TAKEN/);
      const different = await confirm(await request('05:49'));
      created.push(different.id);
      assert.equal(different.status, 'confirmed');
    },
  );
  await check(
    'diary changes only start time atomically and preserves the old start after a collision',
    async () => {
      await db.query("select change_booking($1,'reschedule',$2,$3)", [
        a.id,
        await instant('12:03'),
        owner,
      ]);
      await assert.rejects(
        async () =>
          db.query("select change_booking($1,'reschedule',$2,$3)", [
            a.id,
            await instant('05:49'),
            owner,
          ]),
        /START_TIME_TAKEN/,
      );
      assert.equal(
        (
          await db.query('select starts_at from appointments where id=$1', [
            a.id,
          ])
        ).rows[0].starts_at.toISOString(),
        await instant('12:03'),
      );
    },
  );
  await check(
    'diary cancellation retains history and frees its exact start for another request',
    async () => {
      await db.query("select change_booking($1,'cancelled_by_salon',null,$2)", [
        a.id,
        owner,
      ]);
      assert.equal(
        (await db.query('select status from appointments where id=$1', [a.id]))
          .rows[0].status,
        'cancelled_by_salon',
      );
      const replacement = await confirm(await request('12:03'));
      created.push(replacement.id);
      assert.notEqual(replacement.id, a.id);
      assert.ok(
        (
          await db.query(
            'select count(*)::int n from appointment_history where appointment_id=$1',
            [a.id],
          )
        ).rows[0].n >= 3,
      );
    },
  );
  await check(
    'manual diary creation is idempotent and does not require city event or duration input',
    async () => {
      const key = randomUUID(),
        start = await instant('14:07');
      const args = [
        services,
        start,
        'TEST manual',
        '+212612345678',
        '',
        'TEST note',
        owner,
        key,
      ];
      const one = (
        await db.query(
          'select create_diary_appointment($1,$2,$3,$4,$5,$6,$7,$8) a',
          args,
        )
      ).rows[0].a;
      const two = (
        await db.query(
          'select create_diary_appointment($1,$2,$3,$4,$5,$6,$7,$8) a',
          args,
        )
      ).rows[0].a;
      created.push(one.id);
      assert.equal(one.id, two.id);
    },
  );
  await check(
    'simultaneous confirmations reserve an exact start once; repeated confirmation reuses the appointment',
    async () => {
      const connections = [
        new pg.Client(db.connectionParameters),
        new pg.Client(db.connectionParameters),
      ];
      await Promise.all(connections.map((c) => c.connect()));
      try {
        const ids = [await request('17:11'), await request('17:11')];
        const results = await Promise.allSettled(
          connections.map((c, i) => confirm(ids[i], c)),
        );
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        for (const r of results)
          if (r.status === 'fulfilled') created.push(r.value.id);
        const same = await request('18:13');
        const repeat = await Promise.all(
          connections.map((c) => confirm(same, c)),
        );
        assert.equal(repeat[0].id, repeat[1].id);
        created.push(repeat[0].id);
      } finally {
        await Promise.all(connections.map((c) => c.end()));
      }
    },
  );
  await check(
    'request preference modification and refusal remain separate from confirmation',
    async () => {
      const req = await request('19:17');
      await db.query(
        "select resolve_appointment_request($1,'modify',$2,$3,'19:23')",
        [req, owner, day],
      );
      await db.query("select resolve_appointment_request($1,'reject',$2)", [
        req,
        owner,
      ]);
      assert.equal(
        (
          await db.query(
            'select request_status from contact_messages where id=$1',
            [req],
          )
        ).rows[0].request_status,
        'rejected',
      );
    },
  );
  await check(
    'diary operations retain authentication and existing scheduled records',
    async () => {
      await db.query('set role anon');
      try {
        await assert.rejects(() => confirm(id), /permission denied/);
      } finally {
        await db.query('reset role');
      }
      await assert.rejects(
        () =>
          db.query(
            "select resolve_appointment_request($1,'reject',gen_random_uuid())",
            [id],
          ),
        /FORBIDDEN/,
      );
      const preserved = (
        await db.query(
          'select jsonb_agg(to_jsonb(a) order by id) s from appointments a where id=any($1::uuid[])',
          [(before ?? []).map((a) => a.id)],
        )
      ).rows[0].s;
      assert.deepEqual(preserved, before);
    },
  );
}
