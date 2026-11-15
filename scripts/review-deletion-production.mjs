// READ-ONLY catalog inspection. Never queries customer/appointment/Auth rows.
// Does not install SQL, invoke application RPCs, or create backups.
import pg from 'pg';
import { writeFile } from 'node:fs/promises';
let project = null;
let databaseProject = null;
try {
  const publicUrl = new URL(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://invalid.local',
  );
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://invalid.local/postgres',
  );
  project = publicUrl.hostname.endsWith('.supabase.co')
    ? publicUrl.hostname.split('.')[0]
    : null;
  databaseProject = url.hostname.startsWith('db.')
    ? url.hostname.split('.')[1]
    : decodeURIComponent(url.username).split('.')[1];
} catch {
  // URL parse errors can include the original credential-bearing input.
  // Never print that error or its input.
}
if (!project || project !== databaseProject) {
  console.log(
    JSON.stringify({
      inspected: false,
      reason: 'PROJECT_IDENTITY_MISMATCH_OR_UNVERIFIED',
    }),
  );
  process.exitCode = 1;
} else {
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
    statement_timeout: 10000,
    application_name: 'gelin-readonly-preproduction-review',
  });
  try {
    await db.connect();
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result = {
      project,
      readOnly: (await db.query('SHOW transaction_read_only')).rows[0]
        .transaction_read_only,
    };
    const queries = {
      server: `SELECT current_setting('server_version') version,current_setting('server_version_num') version_num,current_database() database,current_user role,current_setting('createrole_self_grant',true) createrole_self_grant`,
      roles: `SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls,rolcanlogin,rolreplication FROM pg_roles WHERE rolname IN (current_user,'postgres','authenticated','anon','service_role','gelin_delete_owner','gelin_cleanup_owner','gelin_cleanup_executor') ORDER BY rolname`,
      tables: `SELECT c.relname name,c.relrowsecurity rls,c.relforcerowsecurity force_rls,r.rolname owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY name`,
      columns: `SELECT table_schema,table_name,column_name,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`,
      constraints: `SELECT n.nspname schema,t.relname table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) definition,rn.nspname referenced_schema,rt.relname referenced_table FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_class rt ON rt.oid=c.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rt.relnamespace WHERE n.nspname='public' OR (rn.nspname='auth' AND rt.relname='users') ORDER BY 1,2,3`,
      policies: `SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','auth','storage') ORDER BY 1,2,3`,
      triggers: `SELECT n.nspname schema,c.relname table_name,t.tgname,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth') ORDER BY 1,2,3`,
      eventTriggers: `SELECT evtname,evtevent,evtenabled,evtfoid::regproc::text function FROM pg_event_trigger ORDER BY evtname`,
      functions: `SELECT n.nspname schema,p.proname,pg_get_function_identity_arguments(p.oid) args,p.prosecdef,p.proconfig,r.rolname owner,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE (n.nspname='public' AND p.prokind='f') OR (n.nspname='auth' AND p.proname='uid') OR n.nspname='gelin_delete_private' ORDER BY 1,2,3`,
      tableGrants: `SELECT grantee,table_schema,table_name,privilege_type FROM information_schema.role_table_grants WHERE table_schema IN ('public','auth','storage') ORDER BY 2,3,1,4`,
      columnGrants: `SELECT grantee,table_schema,table_name,column_name,privilege_type FROM information_schema.column_privileges WHERE table_schema='public' ORDER BY 3,4,1,5`,
      functionGrants: `SELECT n.nspname schema,p.proname,pg_get_function_identity_arguments(p.oid) args,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE gr.rolname END grantee,a.privilege_type FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a LEFT JOIN pg_roles gr ON gr.oid=a.grantee WHERE n.nspname IN ('public','auth','storage','gelin_delete_private') AND p.prokind='f' ORDER BY 1,2,3,4,5`,
      schemas: `SELECT n.nspname,pg_get_userbyid(n.nspowner) owner,n.nspacl::text acl FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' ORDER BY 1`,
      extensions: `SELECT e.extname,e.extversion,n.nspname schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY 1`,
    };
    for (const [key, sql] of Object.entries(queries))
      result[key] = (await db.query(sql)).rows;
    await db.query('ROLLBACK');
    await writeFile(
      '.tools/deletion-preproduction-metadata.json',
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify({
        inspected: true,
        project,
        readOnly: result.readOnly,
        server: result.server[0],
        roles: result.roles,
        publicTables: result.tables.length,
        foreignKeys: result.constraints.filter((c) => c.contype === 'f').length,
        triggers: result.triggers.length,
        policies: result.policies.length,
        extensions: result.extensions,
        proposedRolesAlreadyExist: result.roles.some((r) =>
          r.rolname.startsWith('gelin_'),
        ),
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        inspected: false,
        code: typeof error.code === 'string' ? error.code : 'UNAVAILABLE',
      }),
    );
    process.exitCode = 1;
  } finally {
    await db.end().catch(() => {});
  }
}
