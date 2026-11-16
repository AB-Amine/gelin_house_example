// Disposable local database only. Does not load environment files or credentials.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

const password = randomBytes(24).toString('hex');
const cluster = new EmbeddedPostgres({
  databaseDir: await mkdtemp(path.join(tmpdir(), 'gelin-auth-installer-')),
  port: 55469,
  user: 'fixture_admin',
  password,
  persistent: false,
  autoRehydrateSymlinks: true,
  postgresFlags: process.platform === 'win32' ? ['-c', 'io_method=sync'] : [],
  onLog: () => {},
  onError: () => {},
});
let root, installer;
let passed = 0;
async function check(name, work) {
  await work();
  console.log(`PASS ${name}`);
  passed++;
}
try {
  await cluster.initialise();
  await cluster.start();
  root = cluster.getPgClient();
  await root.connect();
  await root.query(`
    CREATE ROLE postgres LOGIN NOSUPERUSER CREATEROLE CREATEDB BYPASSRLS PASSWORD '${password}';
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO postgres,authenticated;
    GRANT SELECT,REFERENCES ON auth.users TO postgres;
    CREATE SCHEMA storage AUTHORIZATION postgres;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    ALTER TABLE storage.buckets OWNER TO postgres;
    CREATE SCHEMA extensions;
    CREATE EXTENSION btree_gist WITH SCHEMA extensions;
    ALTER DATABASE postgres OWNER TO postgres;
  `);
  installer = new pg.Client({
    host: '127.0.0.1',
    port: 55469,
    database: 'postgres',
    user: 'postgres',
    password,
  });
  await installer.connect();
  await installer.query("SET createrole_self_grant=''");
  // Use every repository migration, including production's single-admin constraint.
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await installer.query(
      (await readFile(`supabase/migrations/${file}`, 'utf8')).replaceAll(
        '\r\n',
        '\n',
      ),
    );

  await check(
    'installer is not superuser and cannot delegate protected auth USAGE',
    async () => {
      assert.equal(
        (
          await installer.query(
            'SELECT rolsuper FROM pg_roles WHERE rolname=current_user',
          )
        ).rows[0].rolsuper,
        false,
      );
      await installer.query('CREATE ROLE auth_grant_probe NOLOGIN');
      await installer.query('GRANT USAGE ON SCHEMA auth TO auth_grant_probe');
      assert.equal(
        (
          await installer.query(
            "SELECT has_schema_privilege('auth_grant_probe','auth','USAGE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
    },
  );
  const before = (
    await installer.query(
      "SELECT pg_get_functiondef('public.admin_save(text,jsonb,boolean)'::regprocedure) definition",
    )
  ).rows[0].definition;
  await installer.query(
    await readFile('supabase/proposals/safe-deletion.sql', 'utf8'),
  );

  await check(
    'corrected exact installer succeeds on fully migrated schema; admin editor unchanged',
    async () => {
      assert.equal(
        (
          await installer.query(
            "SELECT pg_get_functiondef('public.admin_save(text,jsonb,boolean)'::regprocedure) definition",
          )
        ).rows[0].definition,
        before,
      );
      assert.equal(
        (await installer.query('SHOW createrole_self_grant')).rows[0]
          .createrole_self_grant,
        '',
      );
      for (const role of ['gelin_delete_owner', 'gelin_cleanup_owner']) {
        assert.equal(
          (
            await installer.query(
              "SELECT pg_has_role(current_user,$1,'SET') allowed",
              [role],
            )
          ).rows[0].allowed,
          false,
        );
        await assert.rejects(
          () => installer.query(`SET ROLE ${role}`),
          /permission denied/,
        );
      }
    },
  );
  await check(
    'helper is postgres owned, fixed-path, narrowly executable; owner still lacks auth USAGE',
    async () => {
      const helper = (
        await installer.query(`SELECT p.prosecdef,p.proconfig,r.rolname owner
      FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
      WHERE p.oid='gelin_delete_private.current_user_id()'::regprocedure`)
      ).rows[0];
      assert.equal(helper.owner, 'postgres');
      assert.equal(helper.prosecdef, true);
      assert(helper.proconfig.includes('search_path=""'));
      assert.equal(
        (
          await installer.query(
            "SELECT has_schema_privilege('gelin_delete_owner','auth','USAGE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await installer.query(
            "SELECT has_schema_privilege('gelin_delete_owner','gelin_delete_private','CREATE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      for (const role of [
        'anon',
        'authenticated',
        'service_role',
        'gelin_cleanup_owner',
        'gelin_cleanup_executor',
      ])
        assert.equal(
          (
            await installer.query(
              "SELECT has_function_privilege($1,'gelin_delete_private.current_user_id()','EXECUTE') allowed",
              [role],
            )
          ).rows[0].allowed,
          false,
        );
      await root.query('SET ROLE gelin_delete_owner');
      try {
        await assert.rejects(
          () => root.query('SELECT auth.uid()'),
          /permission denied/,
        );
        assert.equal(
          (await root.query('SELECT gelin_delete_private.current_user_id() id'))
            .rows[0].id,
          null,
        );
      } finally {
        await root.query('RESET ROLE');
      }
    },
  );
  await check(
    'base installation leaves all destructive RPC execution and cleanup login disabled',
    async () => {
      for (const name of ['category', 'offer', 'appointment'])
        assert.equal(
          (
            await installer.query(
              `SELECT has_function_privilege('authenticated','public.gelin_delete_${name}(uuid,text,text)','EXECUTE') allowed`,
            )
          ).rows[0].allowed,
          false,
        );
      assert.equal(
        (
          await installer.query(
            "SELECT has_function_privilege('gelin_cleanup_executor','public.gelin_cleanup_expired_offers()','EXECUTE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await installer.query(
            "SELECT rolcanlogin FROM pg_roles WHERE rolname='gelin_cleanup_executor'",
          )
        ).rows[0].rolcanlogin,
        false,
      );
    },
  );

  const actor = randomUUID(),
    inactive = randomUUID(),
    customer = randomUUID();
  await root.query('INSERT INTO auth.users VALUES($1),($2),($3)', [
    actor,
    inactive,
    customer,
  ]);
  await installer.query(
    "INSERT INTO public.admin_profiles(id,display_name,role,active) VALUES($1,'LOCAL active','owner',true),($2,'LOCAL inactive','owner',false)",
    [actor, inactive],
  );
  const category = (
    await installer.query(
      "INSERT INTO public.categories(name,slug) VALUES('LOCAL auth fix','local-auth-fix') RETURNING id",
    )
  ).rows[0].id;
  await check(
    'active admin preview succeeds without auth schema access',
    async () => {
      await root.query('SET ROLE authenticated');
      try {
        await root.query(
          "SELECT set_config('request.jwt.claim.sub',$1,false)",
          [actor],
        );
        assert.equal(
          (
            await root.query('SELECT public.gelin_preview_category($1) info', [
              category,
            ])
          ).rows[0].info.eligible,
          true,
        );
      } finally {
        await root.query('RESET ROLE');
      }
    },
  );
  // Activate only manual RPCs inside this disposable database to exercise actual
  // authorization checks. No cleanup activation artifact is loaded here.
  await installer.query(
    await readFile('supabase/proposals/activate-manual-deletion.sql', 'utf8'),
  );
  await check(
    'anon, customers, inactive admins and missing identity cannot delete even after local activation',
    async () => {
      for (const [role, id] of [
        ['anon', actor],
        ['authenticated', customer],
        ['authenticated', inactive],
        ['authenticated', ''],
      ]) {
        await root.query(`SET ROLE ${role}`);
        try {
          await root.query(
            "SELECT set_config('request.jwt.claim.sub',$1,false)",
            [id],
          );
          for (const name of ['category', 'offer', 'appointment'])
            await assert.rejects(
              () =>
                root.query(
                  `SELECT public.gelin_delete_${name}($1,'unused','SUPPRIMER')`,
                  [category],
                ),
              /permission denied|GH_FORBIDDEN/,
            );
        } finally {
          await root.query('RESET ROLE');
        }
      }
      assert.equal(
        (
          await installer.query(
            'SELECT count(*)::int n FROM public.categories WHERE id=$1',
            [category],
          )
        ).rows[0].n,
        1,
      );
    },
  );
  await check(
    'separate manual activation works for active admin and leaves cleanup and installer SET disabled',
    async () => {
      assert.equal(
        (
          await installer.query(
            "SELECT pg_has_role(current_user,'gelin_delete_owner','SET') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await installer.query(
            "SELECT has_function_privilege('gelin_cleanup_executor','public.gelin_cleanup_expired_offers()','EXECUTE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
      await root.query('SET ROLE authenticated');
      try {
        await root.query(
          "SELECT set_config('request.jwt.claim.sub',$1,false)",
          [actor],
        );
        const info = (
          await root.query('SELECT public.gelin_preview_category($1) info', [
            category,
          ])
        ).rows[0].info;
        assert.equal(
          (
            await root.query(
              "SELECT public.gelin_delete_category($1,$2,'SUPPRIMER') result",
              [category, info.fingerprint],
            )
          ).rows[0].result.deleted,
          true,
        );
      } finally {
        await root.query('RESET ROLE');
      }
      assert.equal(
        (
          await installer.query(
            'SELECT count(*)::int n FROM public.categories WHERE id=$1',
            [category],
          )
        ).rows[0].n,
        0,
      );
    },
  );
  console.log(
    `${passed} targeted installer/auth checks passed. Disposable PostgreSQL only; hosted provider hooks not emulated.`,
  );
} finally {
  if (installer) await installer.end();
  if (root) await root.end();
  await cluster.stop();
}
