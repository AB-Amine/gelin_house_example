# Supabase Auth permission fix — 16 November 2026

> Production update: the exact corrected inactive base is now installed and
> verified on project `xjfnhctfwmxkbkfeminf`, PostgreSQL 17.11, with fully verified
> TLS. See [the latest production status](SAFE_PRODUCTION_STATUS.md) for installed
> objects, permissions and remaining activation gates. Do not rerun first-install
> SQL. Deletion and cleanup remain disabled. The earlier local-only limitations
> and installation sequence below describe the pre-installation evidence.

Target project: **`xjfnhctfwmxkbkfeminf`**. Local source: `main` at
`560f09cb3cfb712d465c283c9c309e0600e3aed6`, plus this uncommitted patch.
All five deletion reports and both original SQL proposals were located in this
checkout after fetching origin. HEAD already matched origin/main; no merge or
fast-forward was needed. The pre-existing `backup-package-lock-before-pull` stash
contains only package-lock.json and was preserved.

## Exact blocker and replacement

The original `supabase/proposals/safe-deletion.sql` contained:

```sql
GRANT USAGE ON SCHEMA public, auth TO gelin_delete_owner;
GRANT EXECUTE ON FUNCTION auth.uid() TO gelin_delete_owner;
```

Its `require_admin()` helper then called `auth.uid()` as `gelin_delete_owner`.
Supabase's installer has Auth USAGE without grant authority, so this does not
provide the custom owner access. Both Auth grants were removed, following
[Supabase's supported SECURITY DEFINER approach](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7).

The exact authentication addition, created as the existing `postgres` installer
before switching to either custom owner, is:

```sql
CREATE FUNCTION gelin_delete_private.current_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() $$;
REVOKE ALL ON FUNCTION gelin_delete_private.current_user_id()
 FROM PUBLIC,anon,authenticated,service_role,gelin_cleanup_owner,gelin_cleanup_executor;
GRANT EXECUTE ON FUNCTION gelin_delete_private.current_user_id() TO gelin_delete_owner;
```

`require_admin()` now uses `gelin_delete_private.current_user_id()` in place of
both `auth.uid()` calls. Its advisory lock, admin-table lock, non-null identity
requirement, active-admin check and exception are unchanged. The helper accepts
no identity argument, returns only the session UUID and reads no Auth tables.
Its EXECUTE owner privilege is retained by postgres; no application role receives
direct access. The schema must remain outside the Data API's exposed schemas.

The existing private schema is now owned by postgres to host this helper.
`gelin_delete_owner` receives USAGE and temporary CREATE; CREATE is revoked at
installation end. Existing invoker helpers and public wrappers retain their
original custom owners. Their PUBLIC revocation explicitly names those invoker
helpers so it does not try to revoke privileges on the postgres-owned helper.

The separately documented non-superuser installer issue is addressed narrowly:

```sql
GRANT gelin_delete_owner,gelin_cleanup_owner TO CURRENT_USER WITH SET TRUE, INHERIT FALSE;
-- Existing owner-specific function installation runs here.
-- After RESET ROLE and temporary schema CREATE revocations:
REVOKE gelin_delete_owner,gelin_cleanup_owner FROM CURRENT_USER;
```

These are newly created application function owners, not privileged Supabase
roles. No provider-role membership or application BYPASSRLS credential is added.
The existing NOLOGIN function owners retain their reviewed privileges. The
installer must be postgres; an explicit guard fails for another current role.
PostgreSQL's automatic creator ADMIN membership can remain for the non-superuser
installer; the added SET membership is removed, as verified with a real separate
installer connection. `createrole_self_grant` is not changed.

## Installation files and proposed sequence

1. Review the exact corrected [base installation SQL](../supabase/proposals/safe-deletion.sql)
   and its diff against HEAD. This is the complete proposed first-installation
   transaction, not a migration command or an instruction to execute now.
2. Confirm the connection belongs to `xjfnhctfwmxkbkfeminf`, postgres still has the
   documented installer capabilities, and the proposed three roles, private
   schema and public gelin functions remain absent. The previous production
   report recorded them absent; no fresh live query was possible in this session.
   Stop on any partial installation instead of dropping or replacing objects.
3. Confirm `gelin_delete_private` is absent from the project's exposed Data API
   schemas. Check provider hooks and PostgreSQL 17 compatibility in hosted
   staging. The local tests use PostgreSQL 18; they do not emulate provider hooks.
4. Show the complete base SQL before any production execution, as requested.
   Install only after that review and resolution of remaining live compatibility
   checks. Do not run db:migrate or the historical combined activation artifact.
5. Base installation leaves manual DELETE execution and cleanup execution
   revoked, and cleanup's executor NOLOGIN/PASSWORD NULL. Only existing guarded
   previews receive authenticated EXECUTE. Both application feature flags remain
   false/unset; no hosted setting was changed here.
6. Before any later destructive activation, verify the existing recovery point
   and isolated restoration evidence required by the previous production report.
   No backup was created in this task. Then separately review
   [manual activation SQL](../supabase/proposals/activate-manual-deletion.sql),
   which temporarily switches to the manual function owner to grant only the
   three manual DELETE entry points and removes that SET grant afterward.
   It grants no cleanup execution or login. Deployment, origin and hosted-session
   verification remain separate outstanding steps.

The original `activate-safe-deletion.sql` couples manual deletion and cleanup.
It remains for historical disposable tests only and must not be used for this
production sequence. The cleanup provider event-trigger mismatch remains out of
scope because automatic cleanup stays disabled.

## Validation and limits

- `scripts/test-deletion-installer.mjs`: seven targeted checks on a fresh local
  database with all 27 repository migrations, including `single_admin_access`,
  and a separate NOSUPERUSER/CREATEROLE/BYPASSRLS postgres installer with
  `createrole_self_grant=''`. Auth belongs to an independent fixture owner;
  postgres has USAGE without grant authority. The unsupported Auth grant is
  reproduced before testing the corrected installer.
- Confirms helper ownership, fixed search_path, restricted execution, no Auth
  USAGE for the deletion owner, no remaining private-schema CREATE or installer
  SET access, and inactive base destructive grants/cleanup login.
- Exercises authenticated admin preview and local-only manual activation; direct
  deletion attempts by anon, customers, inactive admins and missing identities
  fail. Active-admin deletion succeeds only on a disposable local category.
- The existing 24 deletion SECURITY DEFINER checks pass, including rollback,
  dependencies, stale confirmation, concurrency and service/customer protection.
- The fully migrated local schema accepts the corrected installer and its
  existing admin_save definition is unchanged. Windows CRLF is normalized only
  while loading test fixture migrations, whose textual patches expect LF.
- No production credentials, `.env.local` or prior ignored catalog snapshot are
  present here. Current live PostgreSQL 17.11/provider-schema compatibility is
  **not freshly verified**. Earlier production comparisons remain historical
  evidence in [the production review](DELETION_PREPRODUCTION_REVIEW.md).

No production SQL, record writes, deletion RPCs, backups, cleanup jobs, UI
changes, deployment, commit or push were performed. Permanent prestation
deletion and registered-customer deletion remain blocked. Transactional deletion
bodies, dependency protections, fingerprints and concurrency locks are unchanged.
