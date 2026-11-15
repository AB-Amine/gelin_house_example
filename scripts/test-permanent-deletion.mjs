// Disposable PostgreSQL only. Never reads .env, DATABASE_URL or production data.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const port = 55449,
  password = randomBytes(24).toString('hex');
const cluster = new EmbeddedPostgres({
  databaseDir: await mkdtemp(path.join(tmpdir(), 'gelin-functions-')),
  port,
  user: 'postgres',
  password: randomBytes(24).toString('hex'),
  persistent: false,
  autoRehydrateSymlinks: true,
  postgresFlags: process.platform === 'win32' ? ['-c', 'io_method=sync'] : [],
  onLog: () => {},
  onError: () => {},
});
let db,
  scheduler,
  scheduler2,
  passed = 0;
const actor = randomUUID(),
  customerUser = randomUUID();
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function insert(table, values) {
  const row = { id: randomUUID(), ...values },
    keys = Object.keys(row);
  await db.query(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`,
    Object.values(row),
  );
  return row.id;
}
async function asUser(id, work) {
  await db.query('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    id ?? '',
  ]);
  try {
    return await work();
  } finally {
    await db.query('RESET ROLE');
  }
}
const names = {
  categories: 'category',
  promotions: 'offer',
  appointments: 'appointment',
  services: 'service',
};
async function preview(table, id, user = actor) {
  return asUser(
    user,
    async () =>
      (
        await db.query(
          `SELECT public.gelin_preview_${names[table]}($1) AS result`,
          [id],
        )
      ).rows[0].result,
  );
}
async function remove(table, id, fingerprint, user = actor) {
  const info = fingerprint ?? (await preview(table, id, user)).fingerprint;
  return asUser(
    user,
    async () =>
      (
        await db.query(
          `SELECT public.gelin_delete_${names[table]}($1,$2,'SUPPRIMER') AS result`,
          [id, info],
        )
      ).rows[0].result,
  );
}
const exists = async (table, id) =>
  (await db.query(`SELECT id FROM ${table} WHERE id=$1`, [id])).rows.length;
const cleanup = async (connection = scheduler) =>
  (
    await connection.query(
      'SELECT public.gelin_cleanup_expired_offers() AS result',
    )
  ).rows[0].result;
try {
  await cluster.initialise();
  await cluster.start();
  db = cluster.getPgClient();
  await db.connect();
  await db.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE TABLE admin_profiles(id uuid primary key, active boolean);
    CREATE TABLE categories(id uuid primary key, name text);
    CREATE TABLE services(id uuid primary key, name text, category_id uuid references categories, published boolean default true, archived boolean default false);
    CREATE TABLE promotions(id uuid primary key, name text, usage_count int default 0, starts_at timestamptz, ends_at timestamptz);
    CREATE TABLE customers(id uuid primary key, name text);
    CREATE TABLE appointments(id uuid primary key, reference text, customer_id uuid references customers, starts_at timestamptz, ends_at timestamptz, status text);
    CREATE TABLE appointment_items(id uuid primary key, appointment_id uuid references appointments, service_id uuid references services, name text, promotion_name text);
    CREATE TABLE contact_messages(id uuid primary key, appointment_id uuid references appointments, service_ids uuid[]);
    CREATE TABLE promotion_services(id uuid primary key, promotion_id uuid references promotions, service_id uuid references services);
    CREATE TABLE translations(id uuid primary key, entity text, entity_id uuid);
    ${['allocations', 'appointment_history', 'idempotency_records', 'payment_records', 'change_requests', 'notification_outbox'].map((t) => `CREATE TABLE ${t}(id uuid primary key,appointment_id uuid references appointments);`).join('')}
  `);
  for (const { tablename } of (
    await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")
  ).rows)
    await db.query(
      `ALTER TABLE public.${tablename} ENABLE ROW LEVEL SECURITY; ALTER TABLE public.${tablename} FORCE ROW LEVEL SECURITY`,
    );
  await db.query(
    await readFile('supabase/proposals/safe-deletion.sql', 'utf8'),
  );
  await check(
    'base installation leaves destructive grants inactive independently of application flags',
    async () => {
      assert.equal(
        (
          await db.query(
            "SELECT has_function_privilege('authenticated','public.gelin_delete_category(uuid,text,text)','EXECUTE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await db.query(
            "SELECT has_function_privilege('gelin_cleanup_executor','public.gelin_cleanup_expired_offers()','EXECUTE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
    },
  );
  await db.query(
    await readFile('supabase/proposals/activate-safe-deletion.sql', 'utf8'),
  );
  await db.query('INSERT INTO admin_profiles VALUES($1,true)', [actor]);
  // Only this disposable login activation/password is performed. Production
  // proposal remains NOLOGIN/PASSWORD NULL. ACLs and ownership are unchanged.
  await db.query(
    `ALTER ROLE gelin_cleanup_executor LOGIN PASSWORD '${password}'`,
  );
  const connect = async () => {
    const c = new pg.Client({
      host: '127.0.0.1',
      port,
      database: 'postgres',
      user: 'gelin_cleanup_executor',
      password,
      statement_timeout: 8000,
    });
    await c.connect();
    return c;
  };
  scheduler = await connect();
  const service = await insert('services', { name: 'Manucure' });
  const customer = await insert('customers', { name: 'Cliente locale' });
  const offer = (values = {}) =>
    insert('promotions', {
      name: 'Offre locale',
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2020-02-01T00:00:00Z',
      ...values,
    });
  const appointment = (values = {}) =>
    insert('appointments', {
      reference: 'GH-LOCAL',
      customer_id: customer,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2020-01-01T01:00:00Z',
      status: 'completed',
      ...values,
    });
  await check(
    'exact proposal: login has no table privileges, membership, ownership or BYPASSRLS',
    async () => {
      const { rows } = await scheduler.query(
        `SELECT rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication FROM pg_roles WHERE rolname=current_user`,
      );
      assert(Object.values(rows[0]).every((v) => v === false));
      assert.equal(
        (
          await scheduler.query(
            'SELECT count(*)::int n FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=current_user',
          )
        ).rows[0].n,
        0,
      );
      for (const sql of [
        'SELECT * FROM public.customers',
        'SELECT * FROM public.promotions',
        'DELETE FROM public.promotions',
        "UPDATE public.appointments SET status='completed'",
        "INSERT INTO public.categories(name) VALUES('X')",
        'SET ROLE gelin_delete_owner',
        'SET ROLE gelin_cleanup_owner',
      ])
        await assert.rejects(() => scheduler.query(sql), /permission denied/);
    },
  );
  await check(
    'actual server connection gate accepts only the execute-only local login',
    async () => {
      process.env.OFFER_CLEANUP_ENABLED = 'true';
      process.env.OFFER_CLEANUP_DATABASE_URL = `postgresql://gelin_cleanup_executor:${password}@127.0.0.1:${port}/postgres`;
      const { cleanupConnection } =
        await import('../src/lib/offer-cleanup-connection.mjs');
      await db.query(
        'GRANT SELECT(name) ON public.customers TO gelin_cleanup_executor',
      );
      try {
        await assert.rejects(cleanupConnection, /CLEANUP_ROLE_TOO_BROAD/);
      } finally {
        await db.query(
          'REVOKE SELECT(name) ON public.customers FROM gelin_cleanup_executor',
        );
      }
      await db.query(
        'CREATE FUNCTION public.unexpected_cleanup_authority() RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$SELECT 1$$',
      );
      try {
        await assert.rejects(cleanupConnection, /CLEANUP_ROLE_TOO_BROAD/);
      } finally {
        await db.query('DROP FUNCTION public.unexpected_cleanup_authority()');
      }
      const connection = await cleanupConnection();
      try {
        assert(
          (
            await connection.query(
              'SELECT public.gelin_cleanup_expired_offers() AS result',
            )
          ).rows[0].result,
        );
      } finally {
        await connection.end();
        delete process.env.OFFER_CLEANUP_DATABASE_URL;
        delete process.env.OFFER_CLEANUP_ENABLED;
      }
    },
  );
  scheduler2 = await connect();
  await check(
    'function owners are NOLOGIN and app cannot call private helpers',
    async () => {
      const roles = (
        await db.query(
          "SELECT rolcanlogin FROM pg_roles WHERE rolname IN ('gelin_delete_owner','gelin_cleanup_owner')",
        )
      ).rows;
      assert(roles.every((r) => !r.rolcanlogin));
      await asUser(actor, () =>
        assert.rejects(
          () =>
            db.query('SELECT gelin_delete_private.remove_offer($1)', [
              randomUUID(),
            ]),
          /permission denied/,
        ),
      );
      await assert.rejects(
        () =>
          scheduler.query('SELECT gelin_delete_private.remove_offer($1)', [
            randomUUID(),
          ]),
        /permission denied/,
      );
    },
  );
  await check(
    'anonymous, ordinary customer and inactive administrator cannot invoke manual deletion',
    async () => {
      const id = await insert('categories', { name: 'Privée' });
      await db.query('SET ROLE anon');
      try {
        await assert.rejects(
          () => db.query('SELECT public.gelin_preview_category($1)', [id]),
          /permission denied/,
        );
      } finally {
        await db.query('RESET ROLE');
      }
      await assert.rejects(
        () => preview('categories', id, customerUser),
        /GH_FORBIDDEN/,
      );
      const inactive = await insert('admin_profiles', { active: false });
      await assert.rejects(
        () => preview('categories', id, inactive),
        /GH_FORBIDDEN/,
      );
      await assert.rejects(
        () => preview('categories', id, null),
        /GH_FORBIDDEN/,
      );
      await remove('categories', id);
    },
  );
  await check(
    'manual callers cannot impersonate an actor argument or directly delete rows',
    async () => {
      await asUser(actor, async () => {
        await assert.rejects(
          () => db.query('DELETE FROM public.categories'),
          /permission denied/,
        );
        await assert.rejects(
          () =>
            db.query('SELECT public.gelin_delete_category($1,$2,$3,$4)', [
              randomUUID(),
              'x',
              'SUPPRIMER',
              actor,
            ]),
          /does not exist/,
        );
        await assert.rejects(
          () => db.query('SELECT public.gelin_cleanup_expired_offers()'),
          /permission denied/,
        );
      });
      await assert.rejects(
        () =>
          scheduler.query('SELECT public.gelin_preview_category($1)', [
            randomUUID(),
          ]),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          scheduler.query('SELECT public.gelin_delete_category($1,$2,$3)', [
            randomUUID(),
            'x',
            'SUPPRIMER',
          ]),
        /permission denied/,
      );
    },
  );
  await check(
    'empty category succeeds; used category remains with service',
    async () => {
      const id = await insert('categories', { name: 'Test' });
      await db.query('UPDATE services SET category_id=$1 WHERE id=$2', [
        id,
        service,
      ]);
      await assert.rejects(() => remove('categories', id), /GH_DELETE_BLOCKED/);
      await db.query('UPDATE services SET category_id=NULL WHERE id=$1', [
        service,
      ]);
      await remove('categories', id);
      assert.equal(await exists('categories', id), 0);
      assert.equal(await exists('services', service), 1);
    },
  );
  await check(
    'confirmation and stale fingerprint are enforced inside the database',
    async () => {
      const id = await offer();
      const info = await preview('promotions', id);
      await asUser(actor, () =>
        assert.rejects(
          () =>
            db.query('SELECT public.gelin_delete_offer($1,$2,$3)', [
              id,
              info.fingerprint,
              '',
            ]),
          /GH_CONFIRMATION/,
        ),
      );
      await db.query("UPDATE promotions SET name='Renommée' WHERE id=$1", [id]);
      await assert.rejects(
        () => remove('promotions', id, info.fingerprint),
        /GH_CHANGED/,
      );
      await remove('promotions', id);
    },
  );
  await check(
    'eligible offer removes owned links and translations only',
    async () => {
      const id = await offer();
      await insert('promotion_services', {
        promotion_id: id,
        service_id: service,
      });
      await insert('translations', { entity: 'promotions', entity_id: id });
      await remove('promotions', id);
      assert.equal(await exists('services', service), 1);
    },
  );
  await check(
    'usage counter and ambiguous renamed historical offers remain protected',
    async () => {
      const id = await offer({ usage_count: 1 });
      await assert.rejects(() => remove('promotions', id), /GH_DELETE_BLOCKED/);
      const other = await offer();
      const appt = await appointment();
      const item = await insert('appointment_items', {
        appointment_id: appt,
        service_id: service,
        name: 'Test',
        promotion_name: 'Ancien nom',
      });
      await assert.rejects(
        () => remove('promotions', other),
        /GH_DELETE_BLOCKED/,
      );
      assert.equal((await cleanup()).removed, 0);
      assert.equal(await exists('promotions', other), 1);
      await db.query('DELETE FROM appointment_items WHERE id=$1', [item]);
    },
  );
  await check(
    'past terminal appointment removes owned items/history, preserves customer/service',
    async () => {
      const id = await appointment();
      await insert('appointment_items', {
        appointment_id: id,
        service_id: service,
        name: 'Manucure',
      });
      await insert('allocations', { appointment_id: id });
      await insert('appointment_history', { appointment_id: id });
      const info = await preview('appointments', id);
      assert.equal(info.details.customer, 'Cliente locale');
      assert.deepEqual(info.details.services, ['Manucure']);
      await remove('appointments', id);
      assert.equal(await exists('customers', customer), 1);
      assert.equal(await exists('services', service), 1);
    },
  );
  for (const table of [
    'idempotency_records',
    'payment_records',
    'change_requests',
    'contact_messages',
    'notification_outbox',
  ])
    await check(
      `${table} blocks deletion without losing protected rows`,
      async () => {
        const id = await appointment();
        const child = await insert(table, { appointment_id: id });
        await assert.rejects(
          () => remove('appointments', id),
          /GH_DELETE_BLOCKED/,
        );
        assert.equal(await exists(table, child), 1);
      },
    );
  await check(
    'active and future terminal appointments remain protected',
    async () => {
      for (const values of [
        { status: 'confirmed' },
        { ends_at: '2099-01-01T00:00:00Z' },
      ]) {
        const id = await appointment(values);
        await assert.rejects(
          () => remove('appointments', id),
          /GH_DELETE_BLOCKED/,
        );
      }
    },
  );
  await check(
    'service deletion has no callable delete function, even when deactivated and unused',
    async () => {
      let info = await preview('services', service);
      assert(info.reasons.some((r) => r.includes('Désactivez')));
      await db.query('UPDATE services SET published=false WHERE id=$1', [
        service,
      ]);
      info = await preview('services', service);
      assert.equal(info.eligible, false);
      assert(info.reasons.some((r) => r.includes('concurrentes')));
      const request = await insert('contact_messages', {
        service_ids: [service],
      });
      info = await preview('services', service);
      assert(info.reasons.some((r) => r.includes('demandes')));
      const promo = await offer();
      await insert('promotion_services', {
        promotion_id: promo,
        service_id: service,
      });
      info = await preview('services', service);
      assert(info.reasons.some((r) => r.includes('offres')));
      const appt = await appointment();
      const item = await insert('appointment_items', {
        appointment_id: appt,
        service_id: service,
        name: 'Historique',
      });
      info = await preview('services', service);
      assert(info.reasons.some((r) => r.includes('historiques')));
      await asUser(actor, () =>
        assert.rejects(
          () => db.query('SELECT public.gelin_delete_service($1)', [service]),
          /does not exist/,
        ),
      );
      assert.equal(await exists('services', service), 1);
      assert.equal(await exists('contact_messages', request), 1);
      await db.query('DELETE FROM appointment_items WHERE id=$1', [item]);
    },
  );
  await check(
    'missing targets and SQL injection identifiers never reach arbitrary tables',
    async () => {
      await assert.rejects(
        () => preview('categories', randomUUID()),
        /GH_NOT_FOUND/,
      );
      await asUser(actor, () =>
        assert.rejects(
          () =>
            db.query('SELECT public.gelin_preview_category($1)', [
              'x; DROP TABLE services;',
            ]),
          /uuid/,
        ),
      );
      assert.equal(await exists('services', service), 1);
    },
  );
  await check(
    'FK failure rolls back owned-link deletion in the same function call',
    async () => {
      await db.query(
        'CREATE TABLE unexpected_dependency(id uuid primary key,promotion_id uuid references promotions)',
      );
      const id = await offer();
      const link = await insert('promotion_services', {
        promotion_id: id,
        service_id: service,
      });
      await insert('unexpected_dependency', { promotion_id: id });
      await assert.rejects(() => remove('promotions', id), /foreign key/);
      assert.equal(await exists('promotion_services', link), 1);
      const result = await cleanup();
      assert(result.retained >= 1);
      assert.equal(await exists('promotion_services', link), 1);
      await db.query('DROP TABLE unexpected_dependency');
    },
  );
  await check(
    'upcoming/active offers survive concurrent repeated cleanup under real executor logins',
    async () => {
      const upcoming = await offer({
        starts_at: '2098-01-01T00:00:00Z',
        ends_at: '2099-01-01T00:00:00Z',
      });
      const active = await offer({ ends_at: '2099-01-01T00:00:00Z' });
      const expired = await offer();
      await cleanup();
      const another = await offer();
      const results = await Promise.all([
        cleanup(scheduler),
        cleanup(scheduler2),
      ]);
      assert.equal(
        results.reduce((n, r) => n + r.removed, 0),
        1,
      );
      assert.equal(await exists('promotions', another), 0);
      assert.equal(await exists('promotions', expired), 0);
      assert.equal(await exists('promotions', upcoming), 1);
      assert.equal(await exists('promotions', active), 1);
      assert.equal((await cleanup()).removed, 0);
    },
  );
  await check(
    'Casablanca expiration boundaries use absolute timestamps',
    async () => {
      const { rows } = await db.query(
        "SELECT '2026-11-20 18:34+01'::timestamptz='2026-11-20 17:34Z'::timestamptz AS same",
      );
      assert.equal(rows[0].same, true);
      const id = await offer({
        ends_at: new Date(Date.now() + 3600000).toISOString(),
      });
      await cleanup();
      assert.equal(await exists('promotions', id), 1);
      await db.query(
        "UPDATE promotions SET ends_at=clock_timestamp()-interval '1 second' WHERE id=$1",
        [id],
      );
      await cleanup();
      assert.equal(await exists('promotions', id), 0);
    },
  );
  await check(
    'customers have no deletion functions or new table privileges',
    async () => {
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_proc WHERE proname LIKE 'gelin_%client%' OR proname LIKE 'gelin_%customer%'",
          )
        ).rows[0].n,
        0,
      );
      await assert.rejects(
        () => scheduler.query('DELETE FROM public.customers'),
        /permission denied/,
      );
    },
  );
  await check(
    'PUBLIC cannot execute new functions; owners have safe search paths and no app membership',
    async () => {
      const { rows } = await db.query(
        `SELECT p.proname,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'gelin_%'`,
      );
      assert.equal(rows.length, 8);
      assert(rows.every((r) => r.proconfig.includes('search_path=""')));
      for (const { proname } of rows)
        assert.equal(
          (
            await db.query(
              "SELECT has_function_privilege('anon',p.oid,'EXECUTE') allowed FROM pg_proc p WHERE proname=$1",
              [proname],
            )
          ).rows[0].allowed,
          false,
        );
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid WHERE r.rolname IN ('gelin_delete_owner','gelin_cleanup_owner')",
          )
        ).rows[0].n,
        0,
      );
    },
  );
  console.log(
    `${passed} SECURITY DEFINER checks passed on disposable PostgreSQL; exact proposal grants installed, no production connection used.`,
  );
} finally {
  if (scheduler2) await scheduler2.end();
  if (scheduler) await scheduler.end();
  if (db) await db.end();
  await cluster.stop();
}
