import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { testFatuDatabase } from './test-fatu-db.mjs';
const password = randomBytes(24).toString('hex');
const databaseDir = await mkdtemp(path.join(tmpdir(), 'gelin-pg-'));
const cluster = new EmbeddedPostgres({
  databaseDir,
  port: 55439,
  user: 'postgres',
  password,
  persistent: false,
  autoRehydrateSymlinks: true,
  // Avoid orphaned PostgreSQL 18 I/O workers holding native files open on Windows.
  postgresFlags: process.platform === 'win32' ? ['-c', 'io_method=sync'] : [],
  onLog: () => {},
  onError: () => {},
});
let client;
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
try {
  await cluster.initialise();
  await cluster.start();
  client = cluster.getPgClient();
  await client.connect();
  // Isolated local compatibility fixtures, not a replacement for live Supabase Auth/Storage tests.
  await client.query(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key); grant usage on schema auth to authenticated;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  // Supabase commonly keeps extensions outside public; verify this layout too.
  await client.query(
    'create schema extensions; create extension btree_gist with schema extensions',
  );
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql') && !f.includes('single_admin'))
    .sort())
    await client.query(await readFile(`supabase/migrations/${file}`, 'utf8'));
  await check('base and booking migrations apply to PostgreSQL', async () => {
    assert.equal(
      (
        await client.query(
          "select count(*)::int n from pg_tables where schemaname='public'",
        )
      ).rows[0].n >= 20,
      true,
    );
  });
  await check('booking is disabled until configured', async () => {
    await assert.rejects(
      () =>
        client.query(
          'select public.available_slots(array[gen_random_uuid()],current_date+7)',
        ),
      /NOT_CONFIGURED/,
    );
  });
  await check(
    'anonymous users cannot read private data or call booking transactions',
    async () => {
      await client.query('set role anon');
      try {
        await assert.rejects(
          () => client.query('select * from customers'),
          /permission denied/,
        );
        await assert.rejects(
          () => client.query("select public.manage_booking('x')"),
          /permission denied/,
        );
        const c = (await client.query('select public.public_catalog() c'))
          .rows[0].c;
        assert.equal(c.settings, null);
      } finally {
        await client.query('reset role');
      }
    },
  );
  const owner = randomUUID(),
    staffUser = randomUUID();
  await client.query('insert into auth.users values($1),($2)', [
    owner,
    staffUser,
  ]);
  await client.query(
    "insert into admin_profiles(id,display_name,role) values($1,'Test owner','owner'),($2,'Test staff','staff')",
    [owner, staffUser],
  );
  const provider = (
    await client.query(
      "insert into resources(name,kind) values('Test provider','staff') returning id",
    )
  ).rows[0].id;
  const equipment = (
    await client.query(
      "insert into resources(name,kind) values('Test equipment','equipment') returning id",
    )
  ).rows[0].id;
  const s1 = (
    await client.query(
      "insert into services(name,slug,duration_minutes,price_minor,published,bookable) values('Fixture A','fixture-a',60,10000,true,true) returning id",
    )
  ).rows[0].id;
  const s2 = (
    await client.query(
      "insert into services(name,slug,duration_minutes,price_minor,published,bookable) values('Fixture B','fixture-b',30,5000,true,true) returning id",
    )
  ).rows[0].id;
  await client.query(
    'insert into qualifications(resource_id,service_id) values($1,$2),($1,$3)',
    [provider, s1, s2],
  );
  await client.query(
    'insert into service_resources(service_id,resource_id) values($1,$2)',
    [s1, equipment],
  );
  await client.query(
    "insert into working_hours(resource_id,weekday,opens,closes) select r.id,d,'10:00','21:00' from (select null::uuid id union all select id from resources) r cross join generate_series(0,6) d",
  );
  await client.query(
    "update salon_settings set approved=true,booking_enabled=true,phone='+212600000000',privacy_text='Fixture privacy',policy_text='Fixture policy',cancellation_enabled=true,rescheduling_enabled=true",
  );
  const start = (
    await client.query(
      "select ((now() at time zone 'Africa/Casablanca')::date+7+time '11:00') at time zone 'Africa/Casablanca' t",
    )
  ).rows[0].t.toISOString();
  const start2 = (
    await client.query("select ($1::timestamptz+interval '3 hours') t", [start])
  ).rows[0].t.toISOString();
  const hash = () => createHash('sha256').update(randomBytes(32)).digest('hex');
  async function quote(services, time) {
    return (
      await client.query('select quote_booking($1,$2) q', [services, time])
    ).rows[0].q;
  }
  async function create(
    services,
    time,
    {
      key = randomUUID(),
      token = hash(),
      fingerprint,
      source = 'website',
      connection = client,
    } = {},
  ) {
    const q = fingerprint ?? (await quote(services, time)).fingerprint;
    return (
      await connection.query(
        'select create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) b',
        [
          services,
          time,
          'Test Customer',
          '+212600000000',
          '',
          '',
          key,
          token,
          q,
          source,
          source === 'website' ? null : owner,
        ],
      )
    ).rows[0].b;
  }
  let first,
    token = hash(),
    key = randomUUID(),
    q;
  await check(
    'multi-service sequential booking snapshots and pending occupancy',
    async () => {
      q = await quote([s1, s2], start);
      assert.equal(q.total_minor, 15000);
      assert.equal(Date.parse(q.ends_at) - Date.parse(start), 90 * 60000);
      first = await create([s1, s2], start, {
        key,
        token,
        fingerprint: q.fingerprint,
      });
      assert.equal(first.status, 'pending');
      assert.equal(
        (
          await client.query(
            'select count(*)::int n from allocations where appointment_id=$1 and active',
            [first.id],
          )
        ).rows[0].n,
        3,
      );
    },
  );
  await check('idempotent retry returns the original booking', async () => {
    assert.equal(
      (
        await create([s1, s2], start, {
          key,
          token,
          fingerprint: q.fingerprint,
        })
      ).id,
      first.id,
    );
    await assert.rejects(
      () =>
        create([s1, s2], start, {
          key,
          token: hash(),
          fingerprint: q.fingerprint,
        }),
      /IDEMPOTENCY_MISMATCH/,
    );
  });
  await check('overlap rejected and after-close slot refused', async () => {
    await assert.rejects(() => quote([s1], start), /SLOT_UNAVAILABLE/);
    const late = start.replace('T10:', 'T20:');
    const lateInstant = (
      await client.query(
        "select ((($1::timestamptz at time zone 'Africa/Casablanca')::date)+time '20:30') at time zone 'Africa/Casablanca' t",
        [late],
      )
    ).rows[0].t;
    await assert.rejects(
      () => quote([s1, s2], lateInstant),
      /SLOT_UNAVAILABLE/,
    );
  });
  await check(
    'management token required; public data excludes customer contacts',
    async () => {
      assert.equal(
        (await client.query('select manage_booking($1) b', [hash()])).rows[0].b,
        null,
      );
      const b = (await client.query('select manage_booking($1) b', [token]))
        .rows[0].b;
      assert.equal(b.reference, first.reference);
      assert.equal(b.phone, undefined);
    },
  );
  await check('staff cannot change catalog', async () => {
    await client.query('set role authenticated');
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [
      staffUser,
    ]);
    try {
      await assert.rejects(
        () =>
          client.query("select admin_save('services',$1)", [
            JSON.stringify({ name: 'No' }),
          ]),
        /FORBIDDEN/,
      );
    } finally {
      await client.query('reset role');
    }
  });
  let concurrent;
  await check(
    'two simultaneous submissions commit exactly one appointment',
    async () => {
      const pq = await quote([s1], start2);
      const other = new pg.Client({
        host: '127.0.0.1',
        port: 55439,
        user: 'postgres',
        password,
        database: 'postgres',
      });
      await other.connect();
      try {
        const results = await Promise.allSettled([
          create([s1], start2, { fingerprint: pq.fingerprint }),
          create([s1], start2, {
            fingerprint: pq.fingerprint,
            connection: other,
          }),
        ]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        concurrent = results.find((r) => r.status === 'fulfilled').value;
      } finally {
        await other.end();
      }
    },
  );
  await check(
    'conflicting reschedule preserves old schedule and allocations',
    async () => {
      await assert.rejects(
        () =>
          client.query('select change_booking($1,$2,$3,$4)', [
            first.id,
            'reschedule',
            start2,
            owner,
          ]),
        /SLOT_UNAVAILABLE/,
      );
      const a = (
        await client.query('select starts_at from appointments where id=$1', [
          first.id,
        ])
      ).rows[0];
      assert.equal(a.starts_at.toISOString(), start);
      assert.equal(
        (
          await client.query(
            'select count(*)::int n from allocations where appointment_id=$1 and active',
            [first.id],
          )
        ).rows[0].n,
        3,
      );
    },
  );
  await check(
    'cancellation releases capacity; terminal transitions refused',
    async () => {
      await client.query('select change_booking($1,$2,null,null,$3)', [
        first.id,
        'cancelled_by_customer',
        token,
      ]);
      assert.equal((await quote([s1, s2], start)).total_minor, 15000);
      await assert.rejects(
        () =>
          client.query("select change_booking($1,'confirmed',null,$2)", [
            first.id,
            owner,
          ]),
        /INVALID_TRANSITION/,
      );
    },
  );
  await check(
    'database exclusion constraint independently prevents overlapping resources',
    async () => {
      await assert.rejects(
        () =>
          client.query(
            'insert into allocations(resource_id,starts_at,ends_at) values($1,$2,$3)',
            [
              provider,
              start2,
              new Date(Date.parse(start2) + 3600000).toISOString(),
            ],
          ),
        /exclusion constraint/,
      );
    },
  );
  await check('manual appointment reserves public capacity', async () => {
    await client.query(
      "select change_booking($1,'cancelled_by_salon',null,$2)",
      [concurrent.id, owner],
    );
    const manual = await create([s1], start2, { source: 'phone' });
    assert.ok(manual.reference);
    await assert.rejects(() => quote([s1], start2), /SLOT_UNAVAILABLE/);
  });
  await check(
    'calendar changes cannot invalidate future bookings',
    async () => {
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        const hours = (
          await client.query(
            "select id from working_hours where resource_id=$1 and weekday=extract(dow from $2::timestamptz at time zone 'Africa/Casablanca') limit 1",
            [provider, start2],
          )
        ).rows[0];
        const safe = (
          await client.query("select admin_save('working_hours',$1) h", [
            JSON.stringify({ weekday: 1, opens: '09:00', closes: '19:00' }),
          ])
        ).rows[0].h;
        assert.ok(safe.id);
        await assert.rejects(
          () =>
            client.query("select admin_save('working_hours',$1)", [
              JSON.stringify({ id: hours.id, closes: '12:00' }),
            ]),
          (error) =>
            error.message === 'EXISTING_APPOINTMENTS' &&
            JSON.parse(error.detail).some((a) => a.reference.startsWith('GH-')),
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'archived services cannot be newly booked; history stays intact',
    async () => {
      await client.query('update services set archived=true where id=$1', [s2]);
      await assert.rejects(() => quote([s2], start), /SERVICE_UNAVAILABLE/);
      assert.equal(
        (
          await client.query(
            'select name from appointment_items where appointment_id=$1 and service_id=$2',
            [first.id, s2],
          )
        ).rows[0].name,
        'Fixture B',
      );
    },
  );
  await check(
    'owner catalog edits persist, audit, and reach the public catalog',
    async () => {
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        const record = (
          await client.query("select admin_save('services',$1) s", [
            JSON.stringify({
              name: 'Integration only',
              slug: 'integration-only',
              duration_minutes: 45,
              price_minor: 7000,
              published: true,
              bookable: false,
            }),
          ])
        ).rows[0].s;
        assert.equal(record.price_minor, 7000);
        const updated = (
          await client.query("select admin_save('services',$1) s", [
            JSON.stringify({ id: record.id, price_minor: 8000 }),
          ])
        ).rows[0].s;
        assert.equal(updated.price_minor, 8000);
        const catalog = (await client.query('select public_catalog() c'))
          .rows[0].c;
        assert.equal(
          catalog.services.find((s) => s.id === record.id).price_minor,
          8000,
        );
        assert.equal(
          (
            await client.query(
              'select count(*)::int n from audit_logs where entity_id=$1',
              [record.id],
            )
          ).rows[0].n,
          2,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'promotion expiry, no stacking, quote changes and immutable price snapshots',
    async () => {
      const p = (
        await client.query(
          "insert into promotions(name,kind,value,starts_at,ends_at,active) values('Fixture offer','percentage',15,now()-interval '1 day',now()+interval '1 day',true) returning id",
        )
      ).rows[0].id;
      await client.query(
        'insert into promotion_services(promotion_id,service_id) values($1,$2)',
        [p, s1],
      );
      const before = await quote([s1], start);
      assert.equal(before.total_minor, 8500);
      await client.query('update services set price_minor=12000 where id=$1', [
        s1,
      ]);
      await assert.rejects(
        () => create([s1], start, { fingerprint: before.fingerprint }),
        /QUOTE_CHANGED/,
      );
      assert.equal((await quote([s1], start)).total_minor, 10200);
      await client.query(
        "update promotions set ends_at=now()-interval '1 second' where id=$1",
        [p],
      );
      assert.equal((await quote([s1], start)).total_minor, 12000);
      assert.equal(
        (
          await client.query(
            'select original_minor from appointment_items where appointment_id=$1 and service_id=$2',
            [first.id, s1],
          )
        ).rows[0].original_minor,
        10000,
      );
    },
  );
  await check(
    'closure and staff leave remove slots without overriding bookings',
    async () => {
      await client.query(
        'insert into closures(resource_id,starts_at,ends_at,reason) values($1,$2,$3,$4)',
        [
          provider,
          start,
          new Date(Date.parse(start) + 3600000).toISOString(),
          'Fixture leave',
        ],
      );
      await assert.rejects(() => quote([s1], start), /SLOT_UNAVAILABLE/);
      await client.query('delete from closures');
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        await assert.rejects(
          () =>
            client.query("select admin_save('closures',$1)", [
              JSON.stringify({
                resource_id: null,
                starts_at: start2,
                ends_at: new Date(Date.parse(start2) + 3600000).toISOString(),
                reason: 'Blocked fixture',
              }),
            ]),
          /EXISTING_APPOINTMENTS/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'successful reschedule preserves prices and creates historical revision',
    async () => {
      const b = await create([s1], start);
      const later = new Date(Date.parse(start) + 24 * 3600000).toISOString();
      await client.query('select change_booking($1,$2,$3,$4)', [
        b.id,
        'reschedule',
        later,
        owner,
      ]);
      assert.equal(
        (
          await client.query('select starts_at from appointments where id=$1', [
            b.id,
          ])
        ).rows[0].starts_at.toISOString(),
        later,
      );
      assert.equal(
        (
          await client.query(
            'select count(*)::int n from appointment_history where appointment_id=$1 and action=$2',
            [b.id, 'reschedule'],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await client.query(
            "select token_expires_at=ends_at+interval '90 days' valid from appointments where id=$1",
            [b.id],
          )
        ).rows[0].valid,
        true,
      );
      assert.equal((await quote([s1], start)).total_minor, 12000);
    },
  );
  await check(
    'the last owner cannot be removed and ordinary staff cannot grant access',
    async () => {
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        await assert.rejects(
          () =>
            client.query('select owner_update_access($1,$2,$3)', [
              owner,
              'staff',
              true,
            ]),
          /LAST_OWNER/,
        );
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [staffUser],
        );
        await assert.rejects(
          () =>
            client.query('select owner_update_access($1,$2,$3)', [
              staffUser,
              'owner',
              true,
            ]),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'dashboard counts use real appointments and exact booked values',
    async () => {
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        const stats = (
          await client.query('select admin_stats($1,$2) s', [
            new Date(Date.parse(start) - 86400000).toISOString(),
            new Date(Date.parse(start) + 10 * 86400000).toISOString(),
          ])
        ).rows[0].s;
        assert.equal(stats.count >= 3, true);
        assert.equal(stats.estimated_minor > 0, true);
        assert.equal(stats.popular.length > 0, true);
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'customer privacy anonymization revokes management access and preserves service history',
    async () => {
      const customer = (
        await client.query('select customer_id from appointments where id=$1', [
          first.id,
        ])
      ).rows[0].customer_id;
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        await client.query('select anonymize_customer($1,$2)', [
          customer,
          'TEST-REQUEST-1',
        ]);
        const c = (
          await client.query(
            'select name,phone,email,notes from customers where id=$1',
            [customer],
          )
        ).rows[0];
        assert.equal(c.phone, '');
        assert.equal(c.email, null);
      } finally {
        await client.query('reset role');
      }
      assert.equal(
        (await client.query('select manage_booking($1) b', [token])).rows[0].b,
        null,
      );
      assert.equal(
        (
          await client.query(
            'select count(*)::int n from appointment_items where appointment_id=$1',
            [first.id],
          )
        ).rows[0].n,
        2,
      );
    },
  );
  await check(
    'date-specific opening intervals override weekly hours and can be removed',
    async () => {
      const day = (
        await client.query(
          "select ((($1::timestamptz at time zone 'Africa/Casablanca')::date)+3)::text d",
          [start],
        )
      ).rows[0].d;
      const morning = (
        await client.query(
          "select ($1::date+time '11:00') at time zone 'Africa/Casablanca' t",
          [day],
        )
      ).rows[0].t.toISOString();
      const afternoon = (
        await client.query(
          "select ($1::date+time '14:00') at time zone 'Africa/Casablanca' t",
          [day],
        )
      ).rows[0].t.toISOString();
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      let exception;
      try {
        exception = (
          await client.query("select admin_save('opening_exceptions',$1) e", [
            JSON.stringify({
              resource_id: null,
              day,
              opens: '13:00',
              closes: '18:00',
            }),
          ])
        ).rows[0].e;
      } finally {
        await client.query('reset role');
      }
      await assert.rejects(() => quote([s1], morning), /SLOT_UNAVAILABLE/);
      assert.equal((await quote([s1], afternoon)).total_minor, 12000);
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        await client.query("select admin_save('opening_exceptions',$1,true)", [
          JSON.stringify({ id: exception.id }),
        ]);
      } finally {
        await client.query('reset role');
      }
      assert.equal((await quote([s1], morning)).total_minor, 12000);
    },
  );
  let scopedBooking, scopedToken, scopedProvider;
  await check(
    'staff read and operational permissions are limited to assigned appointments',
    async () => {
      scopedProvider = (
        await client.query(
          "insert into resources(name,kind) values('Private test provider','staff') returning id",
        )
      ).rows[0].id;
      const svc = (
        await client.query(
          "insert into services(name,slug,duration_minutes,price_minor,published,bookable) values('Private fixture','private-fixture',20,3000,true,true) returning id",
        )
      ).rows[0].id;
      await client.query(
        'insert into qualifications(resource_id,service_id) values($1,$2)',
        [scopedProvider, svc],
      );
      await client.query(
        "insert into working_hours(resource_id,weekday,opens,closes) select $1,d,'10:00','21:00' from generate_series(0,6)d",
        [scopedProvider],
      );
      scopedToken = hash();
      scopedBooking = await create(
        [svc],
        new Date(Date.parse(start) + 4 * 86400000).toISOString(),
        { token: scopedToken },
      );
      await client.query('update resources set admin_user_id=$1 where id=$2', [
        staffUser,
        provider,
      ]);
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [staffUser],
      );
      try {
        assert.equal(
          (
            await client.query('select id from appointments where id=$1', [
              first.id,
            ])
          ).rowCount,
          1,
        );
        assert.equal(
          (
            await client.query('select id from appointments where id=$1', [
              scopedBooking.id,
            ])
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await client.query(
              'select * from appointment_history where appointment_id=$1',
              [scopedBooking.id],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (await client.query('select * from audit_logs')).rowCount,
          0,
        );
        const matches = await client.query(
          'select * from search_appointments($1,$2,$3)',
          [
            scopedBooking.reference,
            new Date(Date.parse(start) - 86400000).toISOString(),
            new Date(Date.parse(start) + 10 * 86400000).toISOString(),
          ],
        );
        assert.equal(matches.rowCount, 0);
        await assert.rejects(
          () =>
            client.query('select admin_stats($1,$2)', [
              start,
              new Date(Date.parse(start) + 10 * 86400000).toISOString(),
            ]),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
      await assert.rejects(
        () =>
          client.query("select change_booking($1,'in_progress',null,$2)", [
            scopedBooking.id,
            staffUser,
          ]),
        /FORBIDDEN/,
      );
    },
  );
  await check(
    'reference, phone and provider search honor database permissions',
    async () => {
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        const end = new Date(Date.parse(start) + 10 * 86400000).toISOString();
        assert.equal(
          (
            await client.query(
              'select * from search_appointments($1,$2,$3,$4)',
              [scopedBooking.reference, start, end, scopedProvider],
            )
          ).rowCount,
          1,
        );
        assert.equal(
          (
            await client.query(
              'select * from search_appointments($1,$2,$3,$4)',
              ['+212600000000', start, end, scopedProvider],
            )
          ).rowCount,
          1,
        );
        assert.equal(
          (
            await client.query(
              'select * from search_appointments($1,$2,$3,$4)',
              ['nobody-matches', start, end, scopedProvider],
            )
          ).rowCount,
          0,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'internal notes stay private, are audited and clear on anonymization',
    async () => {
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        await client.query('select admin_note($1,$2)', [
          scopedBooking.id,
          'Private test note',
        ]);
        assert.equal(
          (
            await client.query(
              'select internal_notes from appointments where id=$1',
              [scopedBooking.id],
            )
          ).rows[0].internal_notes,
          'Private test note',
        );
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [staffUser],
        );
        await assert.rejects(
          () =>
            client.query('select admin_note($1,$2)', [
              first.id,
              'Not permitted',
            ]),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
      const guest = (
        await client.query('select manage_booking($1) b', [scopedToken])
      ).rows[0].b;
      assert.equal(guest.internal_notes, undefined);
      await client.query(
        "select change_booking($1,'cancelled_by_salon',null,$2)",
        [scopedBooking.id, owner],
      );
      const customer = (
        await client.query('select customer_id from appointments where id=$1', [
          scopedBooking.id,
        ])
      ).rows[0].customer_id;
      await client.query('set role authenticated');
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [owner],
      );
      try {
        await client.query('select anonymize_customer($1,$2)', [
          customer,
          'TEST-REQUEST-2',
        ]);
        assert.equal(
          (
            await client.query(
              'select internal_notes from appointments where id=$1',
              [scopedBooking.id],
            )
          ).rows[0].internal_notes,
          '',
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'single-admin upgrade preserves accounts and removes access distinctions',
    async () => {
      const before = (
        await client.query('select id,active from admin_profiles order by id')
      ).rows;
      await client.query(
        await readFile(
          'supabase/migrations/202611110008_single_admin.sql',
          'utf8',
        ),
      );
      assert.deepEqual(
        (await client.query('select id,active from admin_profiles order by id'))
          .rows,
        before,
      );
      assert.equal(
        (
          await client.query(
            "select count(*)::int n from admin_profiles where role<>'owner'",
          )
        ).rows[0].n,
        0,
      );
      await assert.rejects(
        () =>
          client.query("update admin_profiles set role='staff' where id=$1", [
            staffUser,
          ]),
        /single_admin_access/,
      );
      await client.query('update admin_profiles set active=true where id=$1', [
        staffUser,
      ]);
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [staffUser],
        );
        assert.equal(
          (await client.query('select staff_role() r')).rows[0].r,
          'owner',
        );
        assert.equal(
          (
            await client.query('select can_read_appointment($1) allowed', [
              first.id,
            ])
          ).rows[0].allowed,
          true,
        );
        await client.query('select admin_note($1,$2)', [
          first.id,
          'Updated by equal administrator',
        ]);
        await client.query(
          "select admin_stats(now()-interval '1 day',now()+interval '60 days')",
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await check(
    'single-admin access preserves last administrator and rejects inactive accounts',
    async () => {
      await client.query('update admin_profiles set active=(id=$1)', [owner]);
      await client.query('set role authenticated');
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [owner],
        );
        await assert.rejects(
          () =>
            client.query("select owner_update_access($1,'owner',false)", [
              owner,
            ]),
          /LAST_OWNER/,
        );
        await assert.rejects(
          () =>
            client.query("select owner_update_access($1,'manager',true)", [
              owner,
            ]),
          /INVALID_INPUT/,
        );
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,false)",
          [staffUser],
        );
        await assert.rejects(
          () =>
            client.query('select admin_note($1,$2)', [first.id, 'Forbidden']),
          /FORBIDDEN/,
        );
      } finally {
        await client.query('reset role');
      }
    },
  );
  await testFatuDatabase(client, check);
  console.log(
    `${passed} database integration checks passed. Auth/Storage HTTP integrations still require Supabase.`,
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
  await cluster.stop();
}
