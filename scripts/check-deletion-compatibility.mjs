// Local-only comparison against saved production CATALOG metadata. No remote
// connection, production rows, credentials or environment files are read.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const production = JSON.parse(
  await readFile('.tools/deletion-preproduction-metadata.json', 'utf8'),
);
const password = randomBytes(24).toString('hex');
const cluster = new EmbeddedPostgres({
  databaseDir: await mkdtemp(path.join(tmpdir(), 'gelin-review-')),
  port: 55459,
  user: 'postgres',
  password: randomBytes(24).toString('hex'),
  persistent: false,
  autoRehydrateSymlinks: true,
  postgresFlags: process.platform === 'win32' ? ['-c', 'io_method=sync'] : [],
  onLog: () => {},
  onError: () => {},
});
let db, installer;
try {
  await cluster.initialise();
  await cluster.start();
  db = cluster.getPgClient();
  await db.connect();
  await db.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key);GRANT USAGE ON SCHEMA auth TO authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  CREATE SCHEMA extensions;CREATE EXTENSION btree_gist WITH SCHEMA extensions`);
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql') && !f.includes('single_admin'))
    .sort())
    await db.query(await readFile(`supabase/migrations/${file}`, 'utf8'));
  const local = {};
  local.columns = (
    await db.query(
      "SELECT table_schema,table_name,column_name,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",
    )
  ).rows;
  local.constraints = (
    await db.query(
      `SELECT n.nspname schema,t.relname table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) definition,rn.nspname referenced_schema,rt.relname referenced_table FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_class rt ON rt.oid=c.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rt.relnamespace WHERE n.nspname='public' ORDER BY 1,2,3`,
    )
  ).rows;
  local.triggers = (
    await db.query(
      `SELECT n.nspname schema,c.relname table_name,t.tgname,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY 1,2,3`,
    )
  ).rows;
  local.policies = (
    await db.query(
      "SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY 1,2,3",
    )
  ).rows;
  local.functions = (
    await db.query(
      "SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY 1,2",
    )
  ).rows;
  const normalize = (v) => JSON.stringify(v ?? null).replace(/\s+/g, ' ');
  const diff = (a, b, key) => {
    const aa = new Map(a.map((r) => [key(r), r])),
      bb = new Map(b.map((r) => [key(r), r]));
    return [...new Set([...aa.keys(), ...bb.keys()])].filter(
      (k) => normalize(aa.get(k)) !== normalize(bb.get(k)),
    );
  };
  const stripDefault = (rows) =>
    rows.map((r) => ({
      table_schema: r.table_schema,
      table_name: r.table_name,
      column_name: r.column_name,
      udt_name: r.udt_name,
      is_nullable: r.is_nullable,
    }));
  const comparison = {
    project: production.project,
    productionVersion: production.server[0].version,
    localVersion: (await db.query('SHOW server_version')).rows[0]
      .server_version,
    columnDifferences: diff(
      stripDefault(production.columns),
      stripDefault(local.columns),
      (r) => `${r.table_name}.${r.column_name}`,
    ),
    constraintDifferences: diff(
      production.constraints.filter(
        (r) => r.schema === 'public' && r.contype !== 'n',
      ),
      local.constraints.filter((r) => r.contype !== 'n'),
      (r) => `${r.table_name}.${r.conname}`,
    ),
    triggerDifferences: diff(
      production.triggers.filter((r) => r.schema === 'public'),
      local.triggers,
      (r) => `${r.table_name}.${r.tgname}`,
    ),
    policyDifferences: diff(
      production.policies.filter((r) => r.schemaname === 'public'),
      local.policies,
      (r) => `${r.tablename}.${r.policyname}`,
    ),
    functionDifferences: diff(
      production.functions
        .filter(
          (r) => r.schema === 'public' && !/LANGUAGE c\b/i.test(r.definition),
        )
        .map(({ proname, args, definition }) => ({
          proname,
          args,
          definition,
        })),
      local.functions.filter((r) => !/LANGUAGE c\b/i.test(r.definition)),
      (r) => `${r.proname}(${r.args})`,
    ),
  };
  // Reproduce the production installer privilege shape using a REAL non-super
  // session, not SET ROLE from a superuser session (which would mask SET issues).
  await db.query(
    `CREATE ROLE review_installer LOGIN CREATEROLE CREATEDB BYPASSRLS REPLICATION NOSUPERUSER PASSWORD '${password}'`,
  );
  installer = new pg.Client({
    host: '127.0.0.1',
    port: 55459,
    user: 'review_installer',
    password,
    database: 'postgres',
  });
  await installer.connect();
  await installer.query("SET createrole_self_grant=''");
  await installer.query('CREATE ROLE review_owned_function NOLOGIN BYPASSRLS');
  comparison.installerMembership = (
    await db.query(
      "SELECT m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='review_owned_function' AND u.rolname='review_installer'",
    )
  ).rows;
  try {
    await installer.query('SET ROLE review_owned_function');
    comparison.installerCanSetOwner = true;
  } catch (e) {
    comparison.installerCanSetOwner = false;
    comparison.installerFailureCode = e.code;
  }
  await writeFile(
    '.tools/deletion-compatibility-comparison.json',
    JSON.stringify(comparison, null, 2),
  );
  console.log(JSON.stringify(comparison));
} finally {
  if (installer) await installer.end();
  if (db) await db.end();
  await cluster.stop();
}
