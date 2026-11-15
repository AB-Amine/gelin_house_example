import 'server-only';
import pg from 'pg';
export async function cleanupConnection() {
  const url = process.env.OFFER_CLEANUP_DATABASE_URL;
  if (!url || process.env.OFFER_CLEANUP_ENABLED !== 'true')
    throw Error('CLEANUP_DISABLED');
  const parsed = new URL(url);
  if (decodeURIComponent(parsed.username) !== 'gelin_cleanup_executor')
    throw Error('CLEANUP_ROLE_REQUIRED');
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) &&
    parsed.searchParams.get('sslmode') !== 'verify-full'
  )
    throw Error('VERIFIED_TLS_REQUIRED');
  const db = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
    statement_timeout: 8000,
    lock_timeout: 3000,
    application_name: 'gelin-offer-cleanup',
  });
  try {
    await db.connect();
    const { rows } = await db.query(`SELECT
      current_user<>'gelin_cleanup_executor' AS wrong_role,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND
        (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) AS privileged,
      EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=current_user) AS memberships,
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','auth','storage','gelin_delete_private') AND c.relkind IN ('r','p','v','m','f')
        AND (has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
          OR has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
          OR pg_has_role(current_user,c.relowner,'MEMBER'))) AS table_access,
      EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage','gelin_delete_private')
        AND has_schema_privilege(current_user,n.oid,'CREATE')) AS schema_creation,
      EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname IN ('public','auth','storage','gelin_delete_private') AND p.prosecdef
          AND p.prorettype <> 'pg_catalog.trigger'::regtype
          AND has_function_privilege(current_user,p.oid,'EXECUTE')
          AND NOT (n.nspname='public' AND p.proname='gelin_cleanup_expired_offers' AND p.pronargs=0)) AS unexpected_functions`);
    if (!rows.length || Object.values(rows[0]).some(Boolean))
      throw Error('CLEANUP_ROLE_TOO_BROAD');
    return db;
  } catch (e) {
    await db.end();
    throw e;
  }
}
