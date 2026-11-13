import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function testSalonAccountsDatabase(db, check) {
  await db.query('begin');
  const fail = async (sql, args, pattern) => {
    await db.query('savepoint expected_failure');
    try {
      await assert.rejects(() => db.query(sql, args), pattern);
    } finally {
      await db.query('rollback to expected_failure');
      await db.query('release expected_failure');
    }
  };
  const uid = async (id) =>
    db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
  try {
    const owner = (
      await db.query(
        "select id from admin_profiles where active and role='owner' limit 1",
      )
    ).rows[0].id;
    const member = randomUUID(),
      other = randomUUID();
    await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [
      member,
      'salon-member@example.test',
      other,
      'salon-other@example.test',
    ]);
    await uid(member);
    await db.query(
      "select client_profile('TEST registered salon client','+212612345678','fr')",
    );
    await uid(other);
    await db.query("select client_profile('TEST other salon client','','fr')");
    await uid(owner);
    const service = (
      await db.query(
        "insert into services(name,slug,price_minor,price_type,published,bookable) values('TEST salon member service',$1,10000,'fixed',true,false) returning id",
        [`salon-${randomUUID()}`],
      )
    ).rows[0].id;
    const day = (await db.query('select (current_date+200)::text d')).rows[0].d;
    const time = async (value) =>
      (
        await db.query(
          'select ($1::date+$2::time) at time zone (select timezone from salon_settings where id=1) t',
          [day, value],
        )
      ).rows[0].t.toISOString();
    await db.query(
      "insert into opening_exceptions(day,opens,closes) values($1,'09:00','18:00')",
      [day],
    );
    const makeRequest = async (at, user = null) =>
      (
        await db.query(
          "insert into contact_messages(name,phone,email,subject,message,service_ids,preferred_date,preferred_time,client_user_id) values('TEST guest salon client','+212612345678','salon-member@example.test','Demande de rendez-vous','TEST',array[$1::uuid],$2,$3,$4) returning id",
          [service, day, at, user],
        )
      ).rows[0].id;
    const confirm = async (id) =>
      (
        await db.query(
          "select resolve_appointment_request($1,'confirm',$2) r",
          [id, owner],
        )
      ).rows[0].r;
    for (const [name, audience, value] of [
      ['TEST public salon offer', 'public', 10],
      ['TEST member salon offer', 'members', 25],
    ]) {
      const p = (
        await db.query(
          "select admin_owner_form('promotion',$1,array[$2::uuid]) p",
          [
            JSON.stringify({
              name,
              audience,
              kind: 'percentage',
              value,
              starts_at: new Date(Date.now() - 86400000).toISOString(),
              ends_at: new Date(Date.now() + 86400000 * 365).toISOString(),
              active: true,
            }),
            service,
          ],
        )
      ).rows[0].p;
      assert.equal(p.audience, audience);
    }
    let memberBooking, guestBooking;
    await check(
      'diary confirmation enforces exceptional hours and closing boundary without confirming requests',
      async () => {
        for (const at of ['08:59', '18:00']) {
          const request = await makeRequest(at);
          await fail(
            "select resolve_appointment_request($1,'confirm',$2)",
            [request, owner],
            /SALON_CLOSED/,
          );
          assert.equal(
            (
              await db.query(
                'select request_status from contact_messages where id=$1',
                [request],
              )
            ).rows[0].request_status,
            'pending',
          );
        }
        memberBooking = await confirm(await makeRequest('10:00', member));
        guestBooking = await confirm(await makeRequest('11:00'));
      },
    );
    await check(
      'verified request ownership enables member pricing; matching guest contact data does not',
      async () => {
        const memberRow = (
          await db.query(
            'select client_user_id,total_minor from appointments where id=$1',
            [memberBooking.id],
          )
        ).rows[0];
        const guestRow = (
          await db.query(
            'select client_user_id,total_minor from appointments where id=$1',
            [guestBooking.id],
          )
        ).rows[0];
        assert.equal(memberRow.client_user_id, member);
        assert.equal(memberRow.total_minor, 7500);
        assert.equal(guestRow.client_user_id, null);
        assert.equal(guestRow.total_minor, 9000);
      },
    );
    await check(
      'weekly changes and holiday closures warn with references and preserve appointments and hours',
      async () => {
        const original = (
          await db.query(
            'select to_jsonb(a) a from appointments a where id=$1',
            [memberBooking.id],
          )
        ).rows[0].a;
        await db.query('set local role authenticated');
        const close = JSON.stringify({
          resource_id: null,
          starts_at: await time('09:00'),
          ends_at: await time('12:00'),
          reason: 'TEST holiday',
        });
        await fail(
          "select admin_save('closures',$1)",
          [close],
          /EXISTING_APPOINTMENTS/,
        );
        await db.query('reset role');
        assert.deepEqual(
          (
            await db.query(
              'select to_jsonb(a) a from appointments a where id=$1',
              [memberBooking.id],
            )
          ).rows[0].a,
          original,
        );
        // Give the test day weekly hours instead of an exception, then try closing all days.
        await db.query('delete from opening_exceptions where day=$1', [day]);
        await db.query(
          "insert into working_hours(weekday,opens,closes) values(extract(dow from $1::date),'09:00','18:00')",
          [day],
        );
        await fail(
          'select save_salon_week(\'[{"opens":"12:00","closes":"18:00"}]\'::jsonb,array[]::integer[])',
          [],
          /EXISTING_APPOINTMENTS/,
        );
        assert.equal(
          (
            await db.query('select salon_start_open($1) v', [
              await time('10:00'),
            ])
          ).rows[0].v,
          true,
        );
        // A holiday without existing appointments can be saved and blocks confirmation.
        await db.query("select admin_save('closures',$1)", [
          JSON.stringify({
            resource_id: null,
            starts_at: await time('14:00'),
            ends_at: await time('16:00'),
            reason: 'TEST holiday',
          }),
        ]);
        const request = await makeRequest('15:00');
        await fail(
          "select resolve_appointment_request($1,'confirm',$2)",
          [request, owner],
          /SALON_CLOSED/,
        );
        await fail(
          "select change_booking($1,'reschedule',$2,$3)",
          [memberBooking.id, await time('15:00'), owner],
          /SALON_CLOSED/,
        );
        assert.equal(
          (
            await db.query('select starts_at from appointments where id=$1', [
              memberBooking.id,
            ])
          ).rows[0].starts_at.toISOString(),
          await time('10:00'),
        );
      },
    );
    await check(
      'registered directory excludes guests and administrator identities and searches by email',
      async () => {
        const list = (
          await db.query("select fatu_clients('salon-member@example.test') r")
        ).rows[0].r;
        assert.equal(list.count, 1);
        assert.equal(list.rows[0].id, member);
        assert.equal(list.rows[0].bookings, 1);
        assert.ok(list.rows[0].created_at);
        assert.ok(
          (
            await db.query(
              "select count(*) n from customers where email='salon-member@example.test'",
            )
          ).rows[0].n > 0,
        );
        await fail('select client_profile()', [], /FORBIDDEN/);
      },
    );
    await check(
      'exclusive offers are absent from both public catalogs and only available to customer sessions',
      async () => {
        for (const fn of ['public_catalog', 'fatu_catalog']) {
          const catalog = (await db.query(`select ${fn}() c`)).rows[0].c;
          assert.ok(
            catalog.promotions.some(
              (p) => p.name === 'TEST public salon offer',
            ),
          );
          assert.ok(
            !JSON.stringify(catalog).includes('TEST member salon offer'),
          );
        }
        await fail('select client_offers()', [], /FORBIDDEN/);
        await uid(member);
        await db.query('set local role authenticated');
        const offers = (await db.query('select client_offers() p')).rows[0].p;
        assert.ok(offers.some((p) => p.name === 'TEST member salon offer'));
        await db.query('reset role');
      },
    );
    await check(
      'customer history and change requests enforce ownership and allow diary cancellation',
      async () => {
        await uid(other);
        await db.query('set local role authenticated');
        const theirs = (await db.query('select client_bookings() b')).rows[0].b;
        assert.ok(
          !theirs.some(
            (b) => b.id === memberBooking.id || b.id === guestBooking.id,
          ),
        );
        await fail(
          "select client_request($1,'cancel','TEST request')",
          [memberBooking.id],
          /FORBIDDEN/,
        );
        await uid(member);
        const mine = (await db.query('select client_bookings() b')).rows[0].b;
        assert.ok(mine.some((b) => b.id === memberBooking.id));
        assert.ok(!mine.some((b) => b.id === guestBooking.id));
        const request = (
          await db.query(
            "select client_request($1,'cancel','TEST request') id",
            [memberBooking.id],
          )
        ).rows[0].id;
        await uid(owner);
        await db.query('select resolve_client_request($1,true)', [request]);
        await db.query('reset role');
        assert.equal(
          (
            await db.query('select status from appointments where id=$1', [
              memberBooking.id,
            ])
          ).rows[0].status,
          'cancelled_by_customer',
        );
        assert.equal(
          (
            await db.query(
              'select count(*) n from appointment_history where appointment_id=$1',
              [memberBooking.id],
            )
          ).rows[0].n >= 2,
          true,
        );
      },
    );
    await check(
      'saved salon text and weekly hours synchronize through the public projection',
      async () => {
        await uid(owner);
        await db.query("select admin_save('salon_settings',$1)", [
          JSON.stringify({
            id: 1,
            hero_title: 'TEST synchronized salon headline',
            phone: '+212612345678',
          }),
        ]);
        const catalog = (await db.query('select fatu_catalog() c')).rows[0].c;
        assert.equal(
          catalog.settings.hero_title,
          'TEST synchronized salon headline',
        );
        assert.equal(catalog.settings.phone, '+212612345678');
        assert.ok(catalog.working_hours?.length || catalog.hours?.length);
      },
    );
  } finally {
    await db.query('rollback');
  }
}
