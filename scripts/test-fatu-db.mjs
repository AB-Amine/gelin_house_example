import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
export async function testFatuDatabase(client, check) {
  await client.query(
    "alter table auth.users add column email text, add column raw_user_meta_data jsonb not null default '{}'::jsonb",
  );
  const hash = (v) => createHash('sha256').update(v).digest('hex');
  const user = randomUUID(),
    other = randomUUID();
  await client.query('insert into auth.users(id) values($1),($2)', [
    user,
    other,
  ]);
  await client.query(
    "update salon_settings set approved=true,booking_enabled=true,phone='+212612345678',privacy_text='Fixture privacy',policy_text='Fixture pending policy',notice_minutes=0,horizon_days=90,cancellation_enabled=true,rescheduling_enabled=true,cancellation_notice_hours=0,rescheduling_notice_hours=0 where id=1",
  );
  await client.query(
    'update auth.users set raw_user_meta_data=$1::jsonb where id=$2',
    [
      JSON.stringify({
        name: 'Registration profile fixture',
        phone: '+212612345678',
        locale: 'en',
      }),
      other,
    ],
  );
  const provider = (
    await client.query(
      "insert into resources(name,kind) values('Fatu test artist','staff') returning id",
    )
  ).rows[0].id;
  const service = (
    await client.query(
      "insert into services(name,slug,duration_minutes,price_minor,published,bookable) values('Fatu fixture','fatu-fixture',60,20000,true,true) returning id",
    )
  ).rows[0].id;
  await client.query(
    'insert into qualifications(resource_id,service_id) values($1,$2)',
    [provider, service],
  );
  await client.query(
    "insert into working_hours(resource_id,weekday,opens,closes) select $1,d,'08:00','20:00' from generate_series(0,6)d",
    [provider],
  );
  const day = (
    await client.query(
      "select ((now() at time zone 'Africa/Casablanca')::date+45)::text d",
    )
  ).rows[0].d;
  await client.query(
    "insert into opening_exceptions(day,opens,closes) values($1,'08:00','20:00')",
    [day],
  );
  const city = (
    await client.query(
      "insert into cities(name,slug,travel_fee_minor,active) values('Fixture city','fixture-city',2500,true) returning id",
    )
  ).rows[0].id;
  const unavailableCity = (
    await client.query(
      "insert into cities(name,slug,active) values('Other city','other-city',true) returning id",
    )
  ).rows[0].id;
  await client.query(
    'insert into service_cities(city_id,service_id) values($1,$2)',
    [city, service],
  );
  await client.query(
    "insert into city_hours(city_id,weekday,opens,closes) select $1,d,'09:00','18:00' from generate_series(0,6)d",
    [city],
  );
  const time = async (h) =>
    (
      await client.query(
        "select ($1::date+$2::time) at time zone 'Africa/Casablanca' t",
        [day, h],
      )
    ).rows[0].t.toISOString();
  const at10 = await time('10:00'),
    at12 = await time('12:00'),
    at14 = await time('14:00');
  const quote = async (start = at10, code = '') =>
    (
      await client.query('select fatu_plan($1,$2,$3,$4) q', [
        [service],
        start,
        city,
        code,
      ])
    ).rows[0].q;
  const create = async (
    q,
    key,
    token,
    actor = user,
    address = 'Test event address',
    connection = client,
  ) =>
    (
      await connection.query(
        'select create_fatu_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) b',
        [
          [service],
          q.starts_at,
          city,
          address,
          'Fixture event',
          q.code,
          'Fixture client',
          '+212612345678',
          'test@example.invalid',
          'Client note',
          key,
          hash(token),
          q.fingerprint,
          actor,
        ],
      )
    ).rows[0].b;
  let booking, initialQuote;
  const key = randomUUID(),
    token = randomUUID();
  await check(
    'Fatu quote validates service-city compatibility, city hours and travel fee',
    async () => {
      await assert.rejects(
        () =>
          client.query('select fatu_plan($1,$2,$3)', [
            [service],
            at10,
            unavailableCity,
          ]),
        /CITY_SERVICE_UNAVAILABLE/,
      );
      await assert.rejects(
        () =>
          client.query('select fatu_plan($1,$2,$3)', [
            [service],
            `${day}T07:00:00Z`,
            city,
          ]),
        /SLOT_UNAVAILABLE/,
      );
      initialQuote = await quote();
      assert.equal(initialQuote.total_minor, 22500);
      assert.equal(initialQuote.travel_fee_minor, 2500);
      assert.equal(initialQuote.currency, 'MAD');
    },
  );
  await check(
    'Fatu creation stores city, price, currency and ownership snapshots; exact retry is stable',
    async () => {
      booking = await create(initialQuote, key, token);
      const retry = await create(initialQuote, key, token);
      assert.equal(retry.id, booking.id);
      const a = (
        await client.query('select * from appointments where id=$1', [
          booking.id,
        ])
      ).rows[0];
      assert.equal(a.city_id, city);
      assert.equal(a.travel_fee_minor, 2500);
      assert.equal(a.total_minor, 22500);
      assert.equal(a.client_user_id, user);
      assert.equal(a.status, 'pending');
      await assert.rejects(
        () => create(initialQuote, key, token, other),
        /IDEMPOTENCY_MISMATCH/,
      );
      await assert.rejects(
        () => create(initialQuote, key, token, user, 'Different event address'),
        /IDEMPOTENCY_MISMATCH/,
      );
    },
  );
  await check(
    'Fatu city fee changes invalidate quotes and preserve existing snapshots',
    async () => {
      const q = await quote(at12);
      await client.query(
        'update cities set travel_fee_minor=3500 where id=$1',
        [city],
      );
      await assert.rejects(
        () => create(q, randomUUID(), randomUUID()),
        /QUOTE_CHANGED/,
      );
      const a = (
        await client.query(
          'select total_minor,travel_fee_minor from appointments where id=$1',
          [booking.id],
        )
      ).rows[0];
      assert.equal(a.travel_fee_minor, 2500);
      assert.equal(a.total_minor, 22500);
      await assert.rejects(
        () =>
          client.query('update cities set active=false where id=$1', [city]),
        /EXISTING_APPOINTMENTS/,
      );
      await assert.rejects(
        () =>
          client.query('delete from service_cities where city_id=$1', [city]),
        /EXISTING_APPOINTMENTS/,
      );
    },
  );
  await check(
    'Fatu clients cannot read other bookings, private notes, admin data or grant themselves access',
    async () => {
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [user],
        );
        const own = (await client.query('select client_bookings() b')).rows[0]
          .b;
        assert.equal(own.length, 1);
        assert.equal(own[0].id, booking.id);
        assert.ok(!JSON.stringify(own).includes('token_hash'));
        assert.ok(!JSON.stringify(own).includes('internal_notes'));
        assert.equal(
          (await client.query('select count(*)::int n from appointments'))
            .rows[0].n,
          0,
        );
        assert.equal(
          (await client.query('select count(*)::int n from customers')).rows[0]
            .n,
          0,
        );
        assert.equal(
          (await client.query('select staff_role() r')).rows[0].r,
          null,
        );
        await assert.rejects(
          () => client.query("select admin_save('cities','{}')"),
          /FORBIDDEN/,
        );
        await client.query(
          "select client_profile('Verified fixture','+212612345678','ar')",
        );
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [other],
        );
        assert.deepEqual(
          (await client.query('select client_bookings() b')).rows[0].b,
          [],
        );
        await assert.rejects(
          () =>
            client.query("select client_request($1,'cancel','Test reason')", [
              booking.id,
            ]),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'Fatu pending client requests retain capacity until an administrator decides',
    async () => {
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [user],
        );
        await client.query(
          "select client_request($1,'reschedule','Fixture reschedule',$2)",
          [booking.id, at12],
        );
        await assert.rejects(
          () =>
            client.query(
              "select client_request($1,'cancel','Another request')",
              [booking.id],
            ),
          /one_pending_change/,
        );
      } finally {
        await client.query('reset role');
      }
      const a = (
        await client.query(
          'select starts_at,status,total_minor from appointments where id=$1',
          [booking.id],
        )
      ).rows[0];
      assert.equal(a.starts_at.toISOString(), at10);
      assert.equal(a.status, 'pending');
      assert.equal(a.total_minor, 22500);
      await assert.rejects(() => quote(at10), /SLOT_UNAVAILABLE/);
    },
  );
  await check(
    'Fatu guest claiming requires the capability and cannot transfer an owned booking',
    async () => {
      await assert.rejects(
        () =>
          client.query('select claim_guest_booking($1,$2)', [
            other,
            hash(token),
          ]),
        /FORBIDDEN/,
      );
      await assert.rejects(
        () =>
          client.query('select claim_guest_booking($1,$2)', [
            user,
            hash('wrong'),
          ]),
        /FORBIDDEN/,
      );
      await client.query('set role authenticated');
      try {
        await assert.rejects(
          () =>
            client.query('select claim_guest_booking($1,$2)', [
              user,
              hash(token),
            ]),
          /permission denied/,
        );
      } finally {
        await client.query('reset role');
      }
      const q = await quote(at14),
        guestToken = randomUUID();
      const guest = await create(q, randomUUID(), guestToken, null);
      await client.query('select claim_guest_booking($1,$2)', [
        user,
        hash(guestToken),
      ]);
      assert.equal(
        (
          await client.query(
            'select client_user_id from appointments where id=$1',
            [guest.id],
          )
        ).rows[0].client_user_id,
        user,
      );
    },
  );
  await check(
    'Fatu public projections exclude promotion codes, unconsented portfolio and private translations',
    async () => {
      const hiddenCategory = (
        await client.query(
          "insert into categories(name,slug,published) values('Hidden fixture category','hidden-fatu-fixture',false) returning id",
        )
      ).rows[0].id;
      const hiddenService = (
        await client.query(
          "insert into services(name,slug,category_id,duration_minutes,price_minor,published) values('UNPUBLISHED FIXTURE','hidden-fatu-service',$1,30,1000,true) returning id",
          [hiddenCategory],
        )
      ).rows[0].id;
      await client.query(
        "insert into translations(entity,entity_id,locale,fields) values('services',$1,'en',$2::jsonb)",
        [hiddenService, JSON.stringify({ name: 'UNPUBLISHED TRANSLATION' })],
      );
      await client.query(
        'insert into service_cities(service_id,city_id) values($1,$2)',
        [hiddenService, city],
      );

      await client.query(
        "insert into promotions(name,kind,value,starts_at,ends_at,active,code,max_uses) values('Secret fixture code','fixed',1000,now()-interval '1 day',now()+interval '10 days',true,'SECRET-FIXTURE',1)",
      );
      await client.query(
        "insert into gallery(path,alt,published) values('test-private.webp','Unconsented fixture',true)",
      );
      await client.query(
        "insert into translations(entity,entity_id,locale,fields) values('customers',$1,'en','{\"name\":\"PRIVATE\"}')",
        [randomUUID()],
      );
      await client.query('set role anon');
      try {
        for (const fn of ['public_catalog', 'fatu_catalog']) {
          const c = (await client.query(`select ${fn}() c`)).rows[0].c;
          assert.ok(!JSON.stringify(c).includes('SECRET-FIXTURE'));
          assert.ok(!JSON.stringify(c).includes('Unconsented fixture'));
          assert.ok(!JSON.stringify(c).includes('PRIVATE'));
          assert.ok(!JSON.stringify(c).includes('UNPUBLISHED'));
          if (fn === 'fatu_catalog')
            assert.ok(!JSON.stringify(c).includes(hiddenService));
        }
        await assert.rejects(
          () =>
            client.query('select fatu_plan($1,$2,$3)', [[service], at12, city]),
          /permission denied/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'Fatu coded promotions respect usage limits under concurrent booking attempts',
    async () => {
      const promo = (
        await client.query(
          "select id from promotions where code='SECRET-FIXTURE'",
        )
      ).rows[0].id;
      await client.query(
        'insert into promotion_services(promotion_id,service_id) values($1,$2)',
        [promo, service],
      );
      const at16 = await time('16:00');
      const q = await quote(at16, 'SECRET-FIXTURE');
      assert.equal(q.items[0].discount_minor, 1000);
      const connections = [
        new pg.Client(client.connectionParameters),
        new pg.Client(client.connectionParameters),
      ];
      try {
        await Promise.all(connections.map((c) => c.connect()));
        const results = await Promise.allSettled(
          connections.map((c) =>
            create(
              q,
              randomUUID(),
              randomUUID(),
              user,
              'Concurrent fixture address',
              c,
            ),
          ),
        );
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.match(
          String(results.find((r) => r.status === 'rejected').reason),
          /SLOT_UNAVAILABLE|PROMOTION_UNAVAILABLE/,
        );
        assert.equal(
          (
            await client.query(
              'select usage_count from promotions where id=$1',
              [promo],
            )
          ).rows[0].usage_count,
          1,
        );
        const at17 = await time('17:00');
        await assert.rejects(
          () => quote(at17, 'SECRET-FIXTURE'),
          /PROMOTION_UNAVAILABLE/,
        );
      } finally {
        await Promise.all(connections.map((c) => c.end()));
      }
    },
  );
  const admin = (
    await client.query('select id from admin_profiles where active limit 1')
  ).rows[0].id;
  await check(
    'Fatu payments are real receipts, separate from booking value and cannot over-refund',
    async () => {
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [admin],
        );
        let stats = (
          await client.query(
            "select fatu_admin_summary(now(),now()+interval '90 days') s",
          )
        ).rows[0].s;
        assert.deepEqual(stats.paid, []);
        await client.query(
          "select record_payment($1,5000,'MAD','payment','cash')",
          [booking.id],
        );
        await client.query(
          "select record_payment($1,1000,'MAD','refund','cash')",
          [booking.id],
        );
        await assert.rejects(
          () =>
            client.query(
              "select record_payment($1,5000,'MAD','refund','cash')",
              [booking.id],
            ),
          /INVALID_INPUT/,
        );
        stats = (
          await client.query(
            "select fatu_admin_summary(now()-interval '1 day',now()+interval '90 days') s",
          )
        ).rows[0].s;
        assert.equal(stats.paid[0].total_minor, 4000);
        const request = (
          await client.query(
            "select id from change_requests where appointment_id=$1 and status='pending'",
            [booking.id],
          )
        ).rows[0].id;
        await client.query('select resolve_client_request($1,true)', [request]);
      } finally {
        await client.query('reset role');
      }
      const a = (
        await client.query(
          'select starts_at,total_minor,travel_fee_minor from appointments where id=$1',
          [booking.id],
        )
      ).rows[0];
      assert.equal(a.starts_at.toISOString(), at12);
      assert.equal(a.total_minor, 22500);
      assert.equal(a.travel_fee_minor, 2500);
    },
  );
  await check(
    'Fatu approved portfolio metadata and settings translations reach only the public projection',
    async () => {
      const media = (
        await client.query(
          "insert into gallery(path,alt,title,description,video_url,featured,published,consent_confirmed) values('gallery/test-metadata.webp','Fixture image','Fixture title','Fixture description','https://example.test/video',true,true,true) returning id",
        )
      ).rows[0].id;
      await client.query(
        "insert into translations(entity,entity_id,locale,fields) values('gallery',$1,'ar',$2::jsonb),('salon_settings','00000000-0000-4000-8000-000000000001','en',$3::jsonb)",
        [
          media,
          JSON.stringify({ title: 'Translated fixture title' }),
          JSON.stringify({ about: 'Approved translated biography' }),
        ],
      );
      let catalog = (await client.query('select fatu_catalog() c')).rows[0].c;
      assert.equal(catalog.gallery[0].id, media);
      assert.equal(catalog.gallery[0].video_url, 'https://example.test/video');
      assert.equal(
        catalog.translations.filter((t) => t.entity === 'salon_settings')
          .length,
        1,
      );
      await client.query('update salon_settings set approved=false where id=1');
      catalog = (await client.query('select fatu_catalog() c')).rows[0].c;
      assert.equal(catalog.settings, null);
      assert.equal(
        catalog.translations.filter((t) => t.entity === 'salon_settings')
          .length,
        0,
      );
      await client.query('update salon_settings set approved=true where id=1');
    },
  );
  await check(
    'Fatu private projections carry the business timezone and invalid timezones are rejected',
    async () => {
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [user],
      );
      const cfg = (
        await client.query('select timezone from salon_settings where id=1')
      ).rows[0].timezone;
      const own = (await client.query('select client_bookings() b')).rows[0].b;
      assert.ok(own.length > 0);
      assert.equal(own[0].timezone, cfg);
      assert.equal(
        (await client.query('select manage_booking($1) b', [hash(token)]))
          .rows[0].b.timezone,
        cfg,
      );
      await assert.rejects(
        () =>
          client.query(
            "update salon_settings set timezone='Invalid/Timezone' where id=1",
          ),
        /time zone.*not recognized/,
      );
    },
  );

  await check(
    'Fatu client requests preserve management of legacy bookings without a city',
    async () => {
      const start = await time('18:00'),
        next = await time('19:00'),
        legacyToken = randomUUID();
      const q = (
        await client.query('select quote_booking($1,$2) q', [[service], start])
      ).rows[0].q;
      const legacy = (
        await client.query(
          'select create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9) b',
          [
            [service],
            start,
            'Legacy fixture',
            '+212612345678',
            '',
            '',
            randomUUID(),
            hash(legacyToken),
            q.fingerprint,
          ],
        )
      ).rows[0].b;
      await client.query(
        'update appointments set client_user_id=$1 where id=$2',
        [user, legacy.id],
      );
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [user],
        );
        const request = (
          await client.query(
            "select client_request($1,'reschedule','Legacy fixture request',$2) id",
            [legacy.id, next],
          )
        ).rows[0].id;
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [admin],
        );
        await client.query('select resolve_client_request($1,true)', [request]);
      } finally {
        await client.query('reset role');
      }
      const a = (
        await client.query(
          'select starts_at,total_minor,travel_fee_minor,city_id from appointments where id=$1',
          [legacy.id],
        )
      ).rows[0];
      assert.equal(a.starts_at.toISOString(), next);
      assert.equal(a.total_minor, 20000);
      assert.equal(a.travel_fee_minor, 0);
      assert.equal(a.city_id, null);
    },
  );
  await check(
    'Fatu administrator search combines client, city, service and pending-change filters',
    async () => {
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [admin],
        );
        let found = (
          await client.query(
            "select fatu_search_bookings(p_query=>'Fixture client',p_city=>$1,p_service=>$2,p_client=>$3) r",
            [city, service, user],
          )
        ).rows[0].r;
        assert.ok(found.count >= 1);
        assert.ok(
          found.rows.every(
            (r) => r.client_user_id === user && r.city_id === city,
          ),
        );
        assert.ok(!JSON.stringify(found).includes('token_hash'));
        found = (
          await client.query('select fatu_search_bookings(p_service=>$1) r', [
            randomUUID(),
          ])
        ).rows[0].r;
        assert.equal(found.count, 0);
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [user],
        );
        await assert.rejects(
          () => client.query('select fatu_search_bookings()'),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'Fatu administrator client profiles aggregate history while private notes stay hidden from clients',
    async () => {
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [admin],
        );
        await client.query(
          "select admin_client_note($1,'account','PRIVATE ADMIN CLIENT NOTE')",
          [user],
        );
        const result = (await client.query('select fatu_clients() r')).rows[0]
          .r;
        const account = result.rows.find(
          (r) => r.id === user && r.kind === 'account',
        );
        assert.ok(account);
        assert.ok(account.bookings >= 2);
        assert.ok(!('notes' in account));
        const summary = (
          await client.query(
            "select fatu_admin_summary(now()-interval '1 day',now()+interval '90 days') s",
          )
        ).rows[0].s;
        assert.equal(summary.clients, result.count);
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [user],
        );
        const profile = (await client.query('select client_profile() p'))
          .rows[0].p;
        assert.ok(!('admin_notes' in profile));
        assert.ok(
          !JSON.stringify(profile).includes('PRIVATE ADMIN CLIENT NOTE'),
        );
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [other],
        );
        const initial = (await client.query('select client_profile() p'))
          .rows[0].p;
        assert.equal(initial.name, 'Registration profile fixture');
        assert.equal(initial.locale, 'en');
        await assert.rejects(
          () => client.query('select fatu_clients()'),
          /FORBIDDEN/,
        );
        await assert.rejects(
          () =>
            client.query("select admin_client_note($1,'account','Forbidden')", [
              user,
            ]),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
}
