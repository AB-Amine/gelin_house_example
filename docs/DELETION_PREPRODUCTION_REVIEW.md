# Production deletion review — STOP / not approved for installation

> Latest outcome: the subsequently authorized inactive base installation is
> complete and verified on production PostgreSQL 17.11. See
> [production status](SAFE_PRODUCTION_STATUS.md). This review's STOP decision and
> installer blockers below are historical. Destructive activation and cleanup
> remain disabled; their remaining recovery/hosting gates were not bypassed.

> 16 November update: see [Auth permission fix](SUPABASE_AUTH_PERMISSION_FIX.md) for the corrected base installer, separate manual-only activation artifact and targeted local non-superuser tests. The installer Auth/SET blockers below describe the earlier SQL. Production has not been altered or freshly reverified; cleanup and the other activation gates remain outstanding.

> Latest restricted-scope request: see [Safe production status](SAFE_PRODUCTION_STATUS.md). Safe read-only production checks and 27 focused tests were completed without creating a backup. Function installation is blocked by missing Auth-schema grant authority; destructive activation stays off. Earlier approval gates below are historical, not a request for another general confirmation.

## Earlier activation request — backup prerequisite still blocked

The subsequent request authorizes completing production activation autonomously, subject to its explicit backup, compatibility and permission safeguards. This is no longer a request to wait for another general installation approval; the prerequisite failure below is the reason work stopped.

Only targeted prerequisite checks were repeated:

- Configured application/database project references both resolve to `xjfnhctfwmxkbkfeminf`.
- No Supabase management token or backup/restore configuration is available in the current environment. No backup archive or restore-verification manifest was found in the workspace. Managed backups may exist in Supabase, but their existence, age and recoverability cannot be verified with the available access.
- No dump/restore or Supabase CLI client was found on the command path. No backup was created, restored or represented as verified.
- Local manual-deletion and cleanup flags remain false/unset. Hosted environment settings were not inspected or changed.

**Stopped at the recoverable-backup prerequisite**, as the latest request explicitly requires. No prior audits or development suites were repeated, no new production query or write was executed, and no SQL/function/grant/scheduler/application deployment was attempted. The separately documented installer/provider compatibility issues below were not fixed or retested in this attempt.

To resume safely, provide access through an approved secure mechanism to the project's backup management and an isolated recovery target, or make available a protected supported backup with verifiable isolated-restoration evidence. Do not paste database passwords, access tokens or customer backup contents into chat. Recovery must be verified before enabling destructive capabilities; this is not a request for another general permission confirmation.

The historical review and evidence follow unchanged.

Review date: 15 November 2026, Africa/Casablanca. Target configured project: **`xjfnhctfwmxkbkfeminf`**, database `postgres`. The project reference in the configured Supabase application URL matches the database connection identity. No production installation, grants, data changes, application deployment, deletion, cleanup invocation, scheduler activation, commit or push occurred.

## Decision

**Do not execute the existing proposal in production.** The mandatory compatibility/recovery gates have not passed. Under Phase 1's instruction to stop on relevant differences, production work stopped after catalog inspection. Installation approval is not being requested yet: there is no production-ready SQL package or verified recovery backup to approve.

Blocking findings:

1. **Installer privileges differ from the earlier successful tests.** Production is PostgreSQL **17.11**, with `postgres` NOSUPERUSER, CREATEROLE, BYPASSRLS and `createrole_self_grant=''`. The previous installation tests used a PostgreSQL 18.6 superuser. A new disposable test with a real non-superuser login reproduced automatic membership `{admin_option:true, inherit_option:false, set_option:false}` on a created owner role. `SET ROLE` failed with SQLSTATE **42501**. The base proposal's schema-ownership/`SET LOCAL ROLE` steps cannot be assumed to work with the present installer. The existing CREATEROLE/BYPASSRLS capabilities do not themselves confer SET membership. No production role was created to test this. [PostgreSQL role-creation defaults](https://www.postgresql.org/docs/17/runtime-config-client.html#GUC-CREATEROLE-SELF-GRANT).
2. **Production has a provider event-trigger function absent from the earlier fixture.** `public.rls_auto_enable()` is SECURITY DEFINER, returns `event_trigger`, has `search_path=pg_catalog` and PUBLIC EXECUTE. The existing cleanup gate excludes ordinary `trigger` functions from its unexpected-function test but does not exclude `event_trigger`. Consequently this provider function makes `unexpected_functions=true` and cleanup would be refused. This is a compatibility false positive; the metadata alone does not establish a publicly callable data-deletion vulnerability. The active `ensure_rls` event trigger and other provider DDL hooks also need coverage in staging. No production trigger/function/grant was changed or invoked.
3. **Backup and recovery have not been verified.** No `pg_dump`, `pg_dumpall`, `pg_restore` or Supabase CLI was found in the inspected command path; the embedded package supplies only server/init tools. No Supabase management token, protected backup destination or encryption configuration is available in the task environment. Managed backup/PITR availability, backup age, a recoverable restore point and a restoration to a separate project have not been verified. No customer/Auth data was exported and no backup file was created. A catalog JSON file is not a recovery backup.
4. **The existing activation artifact couples two authority grants.** `activate-safe-deletion.sql` grants both manual DELETE RPC execution and cleanup RPC execution in one transaction. The newly requested approval sequence requires distinct manual and cleanup activation artifacts. Do not execute the combined file; split and test those grants before submitting revised SQL for approval. No original proposal SQL was modified in this review.

## Read-only production evidence

`scripts/review-deletion-production.mjs` verifies project identity before connecting and explicitly runs `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, then catalog SELECTs followed by ROLLBACK. Two successful catalog snapshots were taken; no business rows, customer identities, passwords, tokens, offers or appointments were selected. No application RPC was called. The outputs are ignored local metadata artifacts, not production data exports.

- PostgreSQL 17.11; configured operator `postgres` is not a superuser.
- 32 public tables; 44 foreign keys including provider Auth references; 10 non-internal public/Auth row triggers; 40 policies across inspected application/Auth/Storage schemas.
- None of `gelin_delete_owner`, `gelin_cleanup_owner`, `gelin_cleanup_executor` exists. No proposed `gelin_*` function is installed.
- Application public tables are owned by `postgres`. Public schema is owned by `pg_database_owner`; PUBLIC has USAGE, not CREATE, in the recorded ACL.
- Provider schemas include Auth, Storage, Realtime and Vault. Extensions include `supabase_vault`, which is not part of the generic embedded fixture. `btree_gist` is in public in production and extensions in the disposable test setup.
- Existing application/Auth FK relationships retain the previously reviewed account CASCADE/SET NULL restrictions; customer/service deletion remains unavailable.

The local comparison builds the repository migration schema in a fresh disposable cluster, then compares the saved catalog metadata; it never connects to production. Results:

| Comparison | Result |
| --- | --- |
| Public column names/types/nullability | No differences found. Defaults were not included in this equivalence check. |
| Public row triggers | No differences found. Provider event triggers are a separate, unmodeled difference. |
| Public RLS policies | No differences found. Provider Auth/Storage policies were inspected but are not emulated completely. |
| Public constraints | Production additionally has `admin_profiles.single_admin_access`, enforcing role=`owner`; the general test harness deliberately skips that legacy single-admin migration. |
| Application SQL definitions | `owner_update_access(...)` differs alongside the single-admin constraint; the provider-only `rls_auto_enable()` is additional. No difference was found for the compared booking/admin-save/catalog application definitions after excluding extension C routines. This is textual comparison, not a formal proof of behavioral equivalence. |
| PostgreSQL engine / installer | Production 17.11/non-superuser versus local 18.6/superuser; the new non-superuser diagnostic reproduced the SET-role failure. |

PostgreSQL 18's catalog representation of NOT NULL constraints was excluded from the constraint diff because nullability is compared separately. Provider extension placement was recorded rather than mistaken for application-function drift. No full hosted Supabase Auth or PostgREST equivalence is claimed.

## Security/function review

The intended boundaries remain appropriate, subject to the blockers above:

- Manual functions have fixed per-entity entry points, empty search paths, qualified objects, session-derived `auth.uid()` and an active-admin check inside the database. No caller-supplied actor ID is trusted. Backend HTTP requests also check the existing administrator session, origin and strict inputs.
- Privileged owners are NOLOGIN, with explicit table/column SELECT, MAINTAIN and the approved parent/owned-child DELETE grants. No application login is granted BYPASSRLS. Owner privilege provisioning and final absence of SET-capable application membership still require verification under the actual installer.
- Private helpers are SECURITY INVOKER, behind a schema without PUBLIC USAGE; public wrappers have restricted EXECUTE. Base installation withholds destructive EXECUTE grants. The exact owner/helper grants remain in the frozen base SQL.
- Target names are fixed; UUIDs are typed; there is no user-controlled SQL or identifier construction. Fingerprints and the explicit confirmation phrase protect against stale/manual mistakes. FK/trigger failures roll back owned-row changes. Shared advisory/table locks coordinate the existing SQL writers.
- Service deletion remains blocked at HTTP and database capability boundaries. It cannot be enabled merely by changing an application flag. Deactivation uses the existing editor/publication fields; already-started REST requests are not atomic with deactivation, but later confirmation revalidates and no service record is removed.
- Empty categories, eligible offers and past terminal appointments retain their conservative dependency checks. Financial/request/notification/idempotency rows block appointment deletion. Customer-account deletion remains postponed; no Auth/profile operation is present.
- Cleanup is parameterless, timestamp-limited, bounded to 25 candidates and protected by a separate executor identity plus server bearer authentication. Upcoming/unexpired offers are not candidates. History/usage ambiguity retains offers; services and booking history remain. The executor has no table privileges, but its production gate currently fails on the provider event trigger.
- PostgreSQL timestamptz/database comparisons and Casablanca display conventions remain in use. Hourly scheduling will be UTC cron cadence, independent of salon offset changes.
- Cleanup bearer credentials remain replayable, and deployment ingress/rate controls, monitoring, secret rotation, TLS and pooler/session identity still require staging verification. No deployed Docker/hosting secret audit was completed.
- Setting an application flag false does **not** disable directly executable RPCs. Database EXECUTE revocation is mandatory for a full shutdown.

## Backup and restoration gate — incomplete

Do not interpret this review as a backup. The saved files contain catalog definitions/ACLs only. There is no verified encrypted production archive, no restored production snapshot and no proven RPO/RTO.

Required supported workflow before installation approval:

1. Obtain authorized Supabase dashboard/management access and a separate isolated restore target. Confirm the target project/plan supports the chosen backup/restore method; do not assume a plan or create a billable project without authorization.
2. Prefer a supported provider backup/clone/restore process preserving the managed schemas. Alternatively provision a compatible PostgreSQL dump/restore toolchain and use a single consistent database snapshot, including the application schema/data, required Auth identities and provider-dependent objects. Capture role memberships/grants, function ownership, RLS/policies and configuration separately as needed, without exporting role passwords to logs.
3. Establish a protected off-database destination, encryption and key custody before export. Store secrets outside source, application images/build contexts and ordinary logs. Do not put plaintext customer/Auth backups in this repository or `.tools`.
4. Confirm the backup's timestamp/project, integrity/hash and completeness. Account for Vault/encryption-key requirements through the provider's supported recovery method. Do not quietly discard provider objects to make a generic local restore appear successful.
5. Restore to an isolated, non-public environment with outbound e-mail, webhooks, notification delivery, application deletion and scheduling disabled. Validate schema/constraints/owners/policies/ACLs, application/Auth relationships and full data integrity without reporting customer details. Record actual restore duration and results, not just successful export.
6. Keep a recoverable pre-install point and a later pre-activation point. Database backup does not include Storage file bodies; confirm separate object recovery where required. This feature does not delete Storage objects. [Supabase backup coverage](https://supabase.com/docs/guides/platform/backups), [supported backup/restore workflow](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

If any item fails, stop before installation/activation. An isolated schema fixture is not a restoration of production data.

## Exact current SQL — frozen, NOT approved for execution

The existing files are the exact sources inspected. They are **not** currently production-installable or ready for approval:

| File | SHA-256 |
| --- | --- |
| `supabase/proposals/safe-deletion.sql` | `736e90448d9f33dffa442a2f8623491e508c7ad92dc5d165b637da64bdc833f6` |
| `supabase/proposals/activate-safe-deletion.sql` | `97dd5c3c7264dd02a77a23aa646538a2fe72531c688120f7fca478c2f2b737f9` |

The base creates exactly three roles, one private schema, five private helpers and eight public entry points:

- Roles: `gelin_delete_owner`, `gelin_cleanup_owner` (NOLOGIN privileged owners), `gelin_cleanup_executor` (NOLOGIN, NOBYPASSRLS, connection limit 2).
- Schema: `gelin_delete_private`.
- Helpers: `require_admin()`, `lock_entity(text)`, `inspect(text,uuid)`, `remove_offer(uuid)`, `manual(text,uuid,boolean,text,text)`.
- Public: four previews (`gelin_preview_service/category/offer/appointment`), three manual delete functions (`gelin_delete_category/offer/appointment`) and `gelin_cleanup_expired_offers()`.
- Owner object/column grants and PUBLIC revocations are explicit in the base file. Only preview execution is granted to authenticated at base installation. Existing business tables, data, FK, RLS policies, Auth/profile records, historical audit records and booking/discount functions are intended to remain unchanged.

Required revisions must be prepared/tested **before** a new approval request: installer-compatible temporary ownership/SET provisioning with final revocation; accurate handling of provider event-trigger functions; independent manual/cleanup grant artifacts; and a non-destructive cleanup eligibility preview/runbook. Do not add permanent application membership in privileged owners or broaden the executor to bypass its gate.

## Staged deployment plan — blocked draft

| Stage | Exact intended action | Approval/state |
| --- | --- | --- |
| Preparation | Resolve compatibility, test on PostgreSQL 17/provider staging, complete verified backup/restore, freeze revised SQL hashes. | Incomplete. No production writes. |
| Installation | Execute only a revised approved base SQL file. Create owners/helpers/public wrappers and owner grants; keep destructive EXECUTE revoked, executor NOLOGIN, both application flags false, scheduler absent. | Requires the exact installation approval question below after prerequisites pass. Do not execute today's base file. |
| Installation verification | Read back owners/signatures/search paths/effective ACLs/memberships; test rejection through non-destructive previews and staging. Verify provider hooks/default grants and unchanged table/policy definitions. | No destructive production test required. Stop on errors; no unapproved fixes. |
| Application release | Separately approved code deployment with manual and cleanup flags false; same session JWT RPC path. Existing service editor remains the activation/deactivation mechanism. | No code deployment approved or performed. |
| Manual authority | Apply only the manual EXECUTE grant below, then enable the UI flag after explicit normal-administrator activation approval. Grant itself enables direct authorized RPCs, so it must not precede that approval. | Separate activation gate; blocked. No service/customer deletion. |
| Cleanup authority | Separately approve and grant only cleanup EXECUTE; provision the executor's LOGIN/password/TLS/network access. Keep hourly schedule and HTTP flag off until cleanup-specific approval. | Separate cleanup gate; blocked. |
| Cleanup preview | Under the cleanup approval sequence, obtain non-destructive aggregate eligibility/blocker counts without customer identities and without invoking the destructive function. | Not performed. Current cleanup function has no dry-run parameter. |
| Hourly activation | Only after separate scheduling approval, enable the HTTP flag and provider-managed hourly caller with secret, monitoring and shutdown controls. | No scheduler configured or enabled. |

The independent authority SQL to freeze in separate artifacts after revision is:

```sql
-- MANUAL AUTHORITY: execute only after manual activation approval.
BEGIN;
GRANT EXECUTE ON FUNCTION public.gelin_delete_category(uuid,text,text),
 public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text)
 TO authenticated;
COMMIT;
```

```sql
-- CLEANUP AUTHORITY: separate file and approval, no scheduling or LOGIN here.
BEGIN;
GRANT EXECUTE ON FUNCTION public.gelin_cleanup_expired_offers()
 TO gelin_cleanup_executor;
COMMIT;
```

These statements were not run against production. They do not repair the base installer or establish a backup. Credentials/LOGIN changes require an independently reviewed provisioning step and must never appear as literal secrets in a reviewed SQL file.

Configuration names: `PERMANENT_DELETION_ENABLED`, `OFFER_CLEANUP_ENABLED`, `OFFER_CLEANUP_SECRET`, `OFFER_CLEANUP_DATABASE_URL`; retain existing `APP_URL` and public Supabase configuration. Documented/local defaults remain false/unset; hosted environment settings were not inspected or changed. The production SQL objects/roles needed for this implementation are absent. Manual calls use session RPCs; cleanup uses only the dedicated executor connection, never migration `DATABASE_URL` or the broad service key. Require verified TLS and a session identity that actually remains `gelin_cleanup_executor`.

The future scheduler is an independent managed hourly invocation of authenticated POST `/api/internal/expired-offer-cleanup`, using a server-only random secret. Its provider wrapper, UTC cron cadence, timeout, invocation protection, monitoring and secrets must be reviewed and approved separately. No database Cron extension/job or hosting setting was installed. No existing expired production offer was inspected as a candidate or deleted.

## Recovery / immediate shutdown

After a future approved installation, an authorized incident operator can revoke manual EXECUTE from authenticated and cleanup EXECUTE from the executor, set the executor NOLOGIN and terminate that executor's sessions. The exact revocation SQL is already recorded in `SAFE_DELETION_FINALIZATION.md`. Disable both flags and the provider schedule, remove/rotate runtime secrets and refresh running instances.

Already-running authenticated RPCs need targeted identification/cancellation through the provider; do not terminate all customer sessions indiscriminately. Transaction termination rolls back uncommitted changes only. A committed deletion requires the previously verified backup/PITR recovery procedure, preferably restoring to isolation first and reconciling later legitimate changes under a reviewed incident plan. No DROP CASCADE, DROP OWNED, global policy changes or destructive maintenance is part of shutdown. Inert revoked functions can remain pending a separately approved exact-object uninstall.

## Tests, production status and changed files

Actually performed in this review:

- Two production catalog inspections: READ ONLY / ROLLBACK, no business-row reads or writes.
- Local migrated-schema comparison and a real non-superuser installer reproduction: completed; revealed the listed differences and SQLSTATE 42501.
- Unit/API suite: **67 passed**. Separate TypeScript, final ESLint (no warnings) and `git diff --check`: **passed**. No application code changed in this review.
- Earlier 70 database, 24 security, browser and build results remain historical local evidence in the finalization report. They were not a production restore or a production installation. Phase 7 live verification and new hosted staging tests were not performed because the compatibility/recovery stop gate failed.
- No backup, restore rehearsal, production installation, destructive verification, cleanup, schedule, commit, push or deployment.

Changed in this review only:

1. `scripts/review-deletion-production.mjs`: identity-checked read-only catalog collector; errors/logs omit credentials and business records.
2. `scripts/check-deletion-compatibility.mjs`: disposable-only comparison and real installer-privilege reproduction.
3. `docs/DELETION_PREPRODUCTION_REVIEW.md`: this blocked review, evidence and staged plan.
4. `docs/SAFE_DELETION_FINALIZATION.md`: link/warning directing production decisions to this review.

Existing uncommitted implementation changes were preserved. Ignored `.tools/deletion-preproduction-metadata.json` and `.tools/deletion-compatibility-comparison.json` contain catalog metadata/diagnostic results only, no customer backup.

Once compatibility and recovery prerequisites pass and the exact revised SQL is frozen, the mandatory question is:

> Do you approve installing the reviewed secure deletion functions and grants in the GELIN HOUSE production Supabase project?

**That question is deferred, not an authorization request for the currently blocked files.** Installation approval must not be interpreted as approval for normal-administrator deletion, automatic cleanup, new disposable production records, application deployment or production business-data changes.
