// Isolated PostgreSQL only. Never reads .env.local or DATABASE_URL.
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const cluster = new EmbeddedPostgres({
  databaseDir: await mkdtemp(path.join(tmpdir(), 'gelin-expanded-')),
  port: 55479,
  user: 'postgres',
  password: randomBytes(24).toString('hex'),
  persistent: false,
  autoRehydrateSymlinks: true,
  postgresFlags: process.platform === 'win32' ? ['-c', 'io_method=sync'] : [],
  onLog: () => {},
  onError: () => {},
});
let db,
  other,
  passed = 0;
const actor = randomUUID(),
  client = randomUUID(),
  inactive = randomUUID();
const check = async (name, fn) => {
  await fn();
  console.log(`PASS ${name}`);
  passed++;
};
const insert = async (table, values) => {
  const keys = Object.keys(values);
  return (
    await db.query(
      `INSERT INTO public.${table}(${keys.join(',')}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
      Object.values(values),
    )
  ).rows[0].id;
};
async function asAdmin(fn, who = actor) {
  await db.query('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [who]);
  try {
    return await fn();
  } finally {
    await db.query('RESET ROLE');
  }
}
const plan = (kind, id) =>
  asAdmin(
    async () =>
      (await db.query('SELECT public.gelin_crud_preview($1,$2) p', [kind, id]))
        .rows[0].p,
  );
const remove = (kind, id, p) =>
  asAdmin(
    async () =>
      (
        await db.query(
          "SELECT public.gelin_crud_delete($1,$2,$3,'SUPPRIMER',true) r",
          [kind, id, p.fingerprint],
        )
      ).rows[0].r,
  );
const count = async (table, id) =>
  (
    await db.query(`SELECT count(*)::int n FROM public.${table} WHERE id=$1`, [
      id,
    ])
  ).rows[0].n;
const service = (category_id = null) =>
  insert('services', {
    name: 'TEST service',
    slug: randomUUID(),
    price_type: 'consultation',
    price_minor: null,
    category_id,
    duration_minutes: 30,
  });
let bookingSequence = 0;
async function appointment(status = 'confirmed', user = null) {
  const customer = await insert('customers', {
    name: 'TEST customer',
    phone: '+212600000001',
  });
  const start = Date.UTC(
    status === 'completed' ? 2020 : 2099,
    0,
    1,
    10 + bookingSequence++,
  );
  return insert('appointments', {
    customer_id: customer,
    client_user_id: user,
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + 3600000).toISOString(),
    status,
    total_minor: 0,
    uncertain: true,
    token_hash: randomBytes(32).toString('hex'),
    token_expires_at: '2100-01-01T00:00Z',
  });
}
const item = (appointment_id, service_id) =>
  insert('appointment_items', {
    appointment_id,
    service_id,
    sequence: 1,
    name: 'TEST snapshot',
    duration_minutes: 30,
    buffer_before: 0,
    buffer_after: 0,
    price_type: 'consultation',
    discount_minor: 0,
    starts_at: '2020-01-01T10:00Z',
    ends_at: '2020-01-01T11:00Z',
  });
try {
  await cluster.initialise();
  await cluster.start();
  db = cluster.getPgClient();
  await db.connect();
  await db.query(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);GRANT USAGE ON SCHEMA auth TO authenticated;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE SCHEMA extensions;CREATE EXTENSION btree_gist WITH SCHEMA extensions`,
  );
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.query(
      (await readFile(`supabase/migrations/${file}`, 'utf8')).replaceAll(
        '\r\n',
        '\n',
      ),
    );
  for (const file of [
    'safe-deletion.sql',
    'expanded-admin-crud.sql',
    'activate-expanded-admin-crud.sql',
  ])
    await db.query(await readFile(`supabase/proposals/${file}`, 'utf8'));
  await db.query('INSERT INTO auth.users VALUES($1),($2),($3)', [
    actor,
    client,
    inactive,
  ]);
  await db.query(
    "INSERT INTO public.admin_profiles(id,display_name,active) VALUES($1,'TEST Admin',true),($2,'TEST Inactive',false)",
    [actor, inactive],
  );
  await check(
    'expanded proposal applies to the full repository schema without enabling cleanup',
    async () => {
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO public.idempotency_records(key,request_hash,appointment_id) VALUES($1,'TEST',NULL)",
            [randomUUID()],
          ),
        /gelin_idempotency_tombstone/,
      );
      assert.equal(
        (
          await db.query(
            "SELECT has_function_privilege('gelin_cleanup_executor','public.gelin_cleanup_expired_offers()','EXECUTE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await db.query(
            "SELECT pg_has_role('authenticated','gelin_delete_owner','MEMBER') allowed",
          )
        ).rows[0].allowed,
        false,
      );
    },
  );
  await check(
    'anonymous, ordinary customers and inactive administrators are rejected',
    async () => {
      await db.query('SET ROLE anon');
      await assert.rejects(
        () =>
          db.query("SELECT public.gelin_crud_preview('services',$1)", [
            randomUUID(),
          ]),
        /permission denied/,
      );
      await db.query('RESET ROLE');
      for (const user of [client, inactive])
        await assert.rejects(
          () =>
            asAdmin(
              () =>
                db.query(
                  "SELECT public.gelin_crud_delete('appointments',$1,'x','SUPPRIMER',true)",
                  [randomUUID()],
                ),
              user,
            ),
          /GH_FORBIDDEN/,
        );
    },
  );
  await check(
    'empty category and used offer delete real rows while offer snapshots survive',
    async () => {
      const cat = await insert('categories', {
        name: 'TEST empty',
        slug: randomUUID(),
      });
      assert.equal(
        (await remove('categories', cat, await plan('categories', cat)))
          .deleted,
        true,
      );
      assert.equal(await count('categories', cat), 0);
      const offer = await insert('promotions', {
        name: 'TEST used',
        kind: 'percentage',
        value: 10,
        starts_at: '2020-01-01Z',
        ends_at: '2020-02-01Z',
        usage_count: 3,
      });
      const app = await appointment('completed');
      const svc = await service();
      const it = await item(app, svc);
      await db.query(
        "UPDATE public.appointment_items SET promotion_name='TEST used' WHERE id=$1",
        [it],
      );
      await remove('promotions', offer, await plan('promotions', offer));
      assert.equal(await count('promotions', offer), 0);
      assert.equal(await count('appointment_items', it), 1);
    },
  );
  for (const status of [
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled_by_salon',
    'cancelled_by_customer',
    'rejected',
    'no_show',
  ])
    await check(
      `appointment ${status} deletes its row with explicit dependent confirmation and retains replay keys`,
      async () => {
        const app = await appointment(status);
        const key = randomUUID();
        await db.query(
          "INSERT INTO public.idempotency_records(key,request_hash,appointment_id) VALUES($1,'TEST',$2)",
          [key, app],
        );
        await insert('notification_outbox', {
          appointment_id: app,
          event: 'TEST',
        });
        await insert('payment_records', {
          appointment_id: app,
          amount_minor: 100,
          currency: 'MAD',
          kind: 'payment',
          method: 'TEST',
          recorded_by: actor,
        });
        const p = await plan('appointments', app);
        assert.equal(p.requiresDependenciesConfirmation, true);
        await assert.rejects(
          () =>
            asAdmin(() =>
              db.query(
                "SELECT public.gelin_crud_delete('appointments',$1,$2,'SUPPRIMER',false)",
                [app, p.fingerprint],
              ),
            ),
          /GH_DEPENDENCY_CONFIRMATION/,
        );
        await remove('appointments', app, p);
        assert.equal(await count('appointments', app), 0);
        const replay = (
          await db.query(
            'SELECT appointment_id,deleted_at FROM public.idempotency_records WHERE key=$1',
            [key],
          )
        ).rows[0];
        assert.equal(replay.appointment_id, null);
        assert(replay.deleted_at);
        await assert.rejects(
          () =>
            db.query(
              "SELECT public.create_booking('{}',now(),'TEST customer','+212600000001','','',$1,$2,'TEST')",
              [key, 'a'.repeat(64)],
            ),
          /BOOKING_DELETED/,
        );
      },
    );
  await check(
    'service/category dependency plan deletes only listed records and stale plans are rejected',
    async () => {
      const cat = await insert('categories', {
        name: 'TEST related',
        slug: randomUUID(),
      });
      const svc = await service(cat);
      const app = await appointment();
      await item(app, svc);
      const untouched = await service();
      const p = await plan('categories', cat);
      const msg = await insert('contact_messages', {
        name: 'TEST',
        email: 'test@example.invalid',
        subject: 'TEST',
        message: 'TEST',
        service_ids: [svc],
      });
      await assert.rejects(() => remove('categories', cat, p), /GH_CHANGED/);
      const fresh = await plan('categories', cat);
      assert(
        fresh.affected.some(
          (t) => t.table === 'appointments' && t.rows.some((r) => r.id === app),
        ),
      );
      await remove('categories', cat, fresh);
      for (const [t, id] of [
        ['services', svc],
        ['appointments', app],
        ['categories', cat],
        ['contact_messages', msg],
      ])
        assert.equal(await count(t, id), 0);
      assert.equal(await count('services', untouched), 1);
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO public.contact_messages(id,name,email,subject,message) VALUES($1,'TEST','test@example.invalid','TEST','TEST')",
            [msg],
          ),
        /BOOKING_DELETED/,
      );
    },
  );
  await check(
    'unknown FK failure rolls back the entire explicit deletion plan',
    async () => {
      const svc = await service();
      const app = await appointment();
      await item(app, svc);
      await db.query(
        'CREATE TABLE public.test_protected(id uuid PRIMARY KEY,appointment_id uuid REFERENCES public.appointments(id))',
      );
      await db.query('INSERT INTO public.test_protected VALUES($1,$2)', [
        randomUUID(),
        app,
      ]);
      const p = await plan('services', svc);
      await assert.rejects(() => remove('services', svc, p), /foreign key/);
      assert.equal(await count('appointments', app), 1);
      assert.equal(await count('services', svc), 1);
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int n FROM public.appointment_items WHERE appointment_id=$1',
            [app],
          )
        ).rows[0].n,
        1,
      );
      await db.query('DROP TABLE public.test_protected');
    },
  );
  await check(
    'concurrent request cannot introduce a deleted service reference',
    async () => {
      const svc = await service();
      const p = await plan('services', svc);
      other = cluster.getPgClient();
      await other.connect();
      await db.query('BEGIN');
      await db.query('SELECT pg_advisory_xact_lock(711042)');
      const pending = other
        .query(
          "INSERT INTO public.contact_messages(name,email,subject,message,service_ids) VALUES('TEST','test@example.invalid','TEST','TEST',$1)",
          [[svc]],
        )
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, code: e.code }),
        );
      await remove('services', svc, p);
      await db.query('COMMIT');
      assert.deepEqual(await pending, { ok: false, code: '23503' });
      await other.end();
      other = null;
    },
  );
  await check(
    'a queued booking cannot recreate a service after its deletion',
    async () => {
      const svc = await service();
      const p = await plan('services', svc);
      other = cluster.getPgClient();
      await other.connect();
      await db.query('BEGIN');
      await db.query('SELECT pg_advisory_xact_lock(711042)');
      const pending = other
        .query(
          "SELECT public.create_diary_appointment($1,'2099-03-01T10:00:00Z','TEST customer','+212600000001','','',$2,$3)",
          [[svc], actor, randomUUID()],
        )
        .then(
          () => null,
          (error) => error.message,
        );
      await remove('services', svc, p);
      await db.query('COMMIT');
      assert.equal(await pending, 'SERVICE_UNAVAILABLE');
      await other.end();
      other = null;
    },
  );
  await check(
    'customer deletion is recoverable: application commit, frozen retry state, Auth absence check, final completion',
    async () => {
      await db.query(
        "INSERT INTO public.client_profiles(id,name) VALUES($1,'TEST account')",
        [client],
      );
      const app = await appointment('confirmed', client);
      const p = await plan('clients', client);
      const pending = await remove('clients', client, p);
      assert.equal(pending.pending, true);
      assert.equal(pending.deleted, false);
      assert.equal(await count('appointments', app), 0);
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO public.client_profiles(id,name) VALUES($1,'TEST retry')",
            [client],
          ),
        /ACCOUNT_DELETION_IN_PROGRESS/,
      );
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO public.admin_profiles(id,display_name) VALUES($1,'TEST promotion')",
            [client],
          ),
        /ACCOUNT_DELETION_IN_PROGRESS/,
      );
      await db.query('SET ROLE service_role');
      await assert.rejects(
        () =>
          db.query('SELECT public.gelin_complete_account_deletion($1)', [
            pending.jobId,
          ]),
        /GH_AUTH_DELETION_PENDING/,
      );
      await db.query('RESET ROLE');
      assert.equal(
        (
          await asAdmin(
            async () =>
              (
                await db.query(
                  'SELECT public.gelin_account_deletion_jobs() jobs',
                )
              ).rows[0].jobs,
          )
        ).length,
        1,
      );
      await db.query('DELETE FROM auth.users WHERE id=$1', [client]); // simulated Auth Admin API, isolated DB only
      await db.query('SET ROLE service_role');
      const done = (
        await db.query('SELECT public.gelin_complete_account_deletion($1) r', [
          pending.jobId,
        ])
      ).rows[0].r;
      await db.query('RESET ROLE');
      assert.equal(done.deleted, true);
      await assert.rejects(
        () => plan('clients', actor),
        /GH_ADMIN_ACCOUNT_PROTECTED/,
      );
      await assert.rejects(
        () => plan('clients', inactive),
        /GH_ADMIN_ACCOUNT_PROTECTED/,
      );
    },
  );
  console.log(
    `${passed} expanded CRUD database checks passed. All records and Auth fixtures were disposable; no production connection.`,
  );
} finally {
  await db?.query('ROLLBACK').catch(() => {});
  await other?.end().catch(() => {});
  await db?.end().catch(() => {});
  await cluster.stop();
}
