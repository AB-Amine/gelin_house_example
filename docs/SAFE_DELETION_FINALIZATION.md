# Safe deletion finalization — current implementation

> Current restricted-scope outcome: [Safe production status](SAFE_PRODUCTION_STATUS.md) records live catalogue/Auth checks, 27 focused test passes and the missing installation privilege. No new backup or destructive activation was attempted.

> Production review update: [Pre-production review](DELETION_PREPRODUCTION_REVIEW.md) found installer/provider compatibility blockers and no verified recovery backup. Do not install or activate the current SQL artifacts. The implementation/test evidence below remains local evidence only.

Implementation status: locally verified; production read-only checks are documented separately. **No production installation, destructive authority, scheduler, deployment, commit or push has been performed. Current user authorization remains subject to the requested compatibility/recovery safeguards.** This supersedes the direct-connection proposal in the historical Stage B report. Stage A and the useful historical reports remain intact.

## Service management

The existing `published`/`archived` fields represent activation; no activation column was added. An active service shows **Désactiver**. An inactive/archived service shows **Activer** and, in the real admin list, **Supprimer**. Confirmation names the service and describes the effect. Native dialogs retain keyboard focus, cancel/Escape behavior, busy state and duplicate-click protection.

Deactivation calls the existing session-authorized `admin_save` editor with only `id` and `published:false`. The row, bookings, customer references, prices, history and requests remain. Reactivation sets `published:true, archived:false`; it does not change `bookable`, category visibility, durations, prices or scheduling rules. Existing catalog projections hide unpublished/archived services, and existing request/booking validation rejects new selections after deactivation. The new status route uses the existing editor's authorization, safeguards and existing audit behavior; it does not introduce new audit writes into deletion functions.

Request creation still performs validation and insertion in separate REST calls. A request already in flight can complete after deactivation; later confirmation revalidates service availability. Deactivation is not cancellation of existing requests. No architecture claim is made that those two REST calls are atomic.

**Permanent service deletion remains blocked.** Even an otherwise unused, deactivated service has no public SQL delete function and no service DELETE privilege on either new owner. The preview explains publication, booking-history, request-array and offer dependencies, plus the unresolved concurrent-writer issue. All historical appointment references block deletion, not merely future ones. We did not weaken the request writer or remove dependencies to enable deletion.

## Other entities

| Operation | Allowed only when | Preserved |
| --- | --- | --- |
| Category | No service references it, including archived services. Delete the empty category and only its translations. | All services and other categories. |
| Offer | Zero known usage and no ambiguous promotion-name history anywhere. Delete the definition, its service links and translations. | Services, customers, bookings and discount snapshots. |
| Appointment | End is in the past and status is completed, cancelled, rejected or no-show; no protected dependencies. Delete its own items, allocations and history together. | Customer/account/service records, other appointments, promotion counters, audit logs. |
| Customer account | **Postponed. No operation implemented or enabled.** The previously added customer-delete UI control was removed; the API still rejects legacy requests. | Auth users, profiles, customer management and booking history. |

Appointment deletion always blocks financial rows, change requests, booking requests, notifications and idempotency records. No replay key is deleted or detached. Existing confirmation/cancellation/calendar logic is unchanged. No image file, Auth user, Storage object or guest-customer record is removed by these operations.

## Database architecture and exact SQL

Review-only artifacts, **outside the migration directory**:

1. [`supabase/proposals/safe-deletion.sql`](../supabase/proposals/safe-deletion.sql): base roles, private helpers, fixed public functions, exact object/column grants, ownership, safe search paths and revocations. Destructive EXECUTE grants are withheld. Preview functions still require an active administrator.
2. [`supabase/proposals/activate-safe-deletion.sql`](../supabase/proposals/activate-safe-deletion.sql): separate destructive EXECUTE grants. Applied only to disposable databases in this task. This is an explicit database authority activation step, not a normal migration.

The installer creates no new business tables, columns or FK/RLS changes. It creates a private function schema and two **NOLOGIN** privileged function-owner roles. Their BYPASSRLS authority supplies complete dependency visibility but has no application password or member login. Temporarily granted CREATE on public is revoked before installation commits. They receive SELECT only on required objects/columns, DELETE only on approved parents/owned children, and MAINTAIN for the corresponding table locks. They receive no INSERT/UPDATE, Auth-user writes, customer writes, Storage access or role memberships. See the SQL for the complete column-level grants.

The manual owner handles categories, offers and appointments; the cleanup owner can read only promotions and required association/history columns and delete only promotions, promotion-service links and offer translations. The cleanup owner has no appointment DELETE authority. All helpers use SECURITY INVOKER in the private schema and are inaccessible to application callers; public entry points use SECURITY DEFINER with an empty fixed search path and fully qualified objects. No dynamic SQL is built from caller identifiers.

Public manual functions: `gelin_preview_service`, `gelin_preview_category`, `gelin_preview_offer`, `gelin_preview_appointment`, `gelin_delete_category`, `gelin_delete_offer`, `gelin_delete_appointment`. Each fixes its entity internally. There is no caller-supplied administrator argument, service-delete function or customer-delete function. Inside the database, `auth.uid()` and an active admin profile are mandatory. The existing PostgREST/session mechanism verifies the user's JWT; callers are not given direct database login credentials with which to forge claims.

Public cleanup function: `gelin_cleanup_expired_offers()`, no parameters. Only the separate `gelin_cleanup_executor` identity receives EXECUTE at the activation stage. It additionally requires the actual SQL `session_user` to be that identity. It cannot be called by anonymous/authenticated/manual-RPC callers or the general service role. The executor is **NOBYPASSRLS**, has no table/column/maintenance privileges or memberships, and is initially **NOLOGIN / PASSWORD NULL**. It cannot directly SELECT, INSERT, UPDATE or DELETE business rows or assume either owner role.

Manual HTTP requests use `sessionDb().rpc` with the administrator's session. The broad direct deletion connection, its gate, and the old JavaScript SQL-deletion engine were removed. The old `DELETE_DATABASE_URL` is ignored and is absent from the example configuration. Existing `pg` remains a runtime dependency only for the restricted cleanup connection.

## Transactions and confirmations

The public functions derive authorization, acquire the existing advisory lock `711042`, lock the relevant tables in fixed order, re-read dependencies and perform deletion within the same database statement/transaction. Admin profile changes are locked during manual authorization. Confirmation requires the exact phrase and a database-generated SHA-256 fingerprint of the current target/details/counts. A changed target requires a new preview. Arbitrary entities, UUID fragments, SQL, table names and child ID lists cannot be supplied.

FK/trigger/permission failures roll back the entire manual operation. Cleanup uses subtransactions per candidate; a candidate failure rolls back its own link/translation/parent changes. An uncaught statement/connection failure aborts the outer cleanup transaction. No browser confirmation or external Auth request is awaited while database locks are held. Locks can briefly delay existing writers. The known no-FK service-request race is specifically why service deletion remains unavailable.

Manual RPC EXECUTE permissions are a separate security boundary: an application feature flag cannot prevent direct REST RPC calls once those permissions exist. The base artifact therefore withholds destructive grants, and emergency shutdown must revoke EXECUTE, not merely change an environment variable.

## Expired-offer cleanup and schedule

The prepared server endpoint remains `POST /api/internal/expired-offer-cleanup`. It requires explicit enablement, a server-only bearer secret of at least 32 characters (provision randomly, not a repeated test value), and a verified dedicated database connection. Remote URLs must use `sslmode=verify-full`. Neither migration `DATABASE_URL`, the old deletion URL, nor the general Supabase privileged key is used as a fallback.

The connection gate rejects the wrong identity, BYPASSRLS/elevated flags, memberships, table/view/column/maintenance rights, ownership, schema CREATE privileges and unexpected executable non-trigger SECURITY DEFINER functions in application/Auth/Storage/private schemas. This also detects privileges inherited through PUBLIC. Existing provider functions/default grants must be inspected on the actual deployment; unexpected authority causes a safe refusal rather than automatic privilege changes. The local gate was tested with an actual executor login, including rejection after an accidental column grant and an unexpected PUBLIC function.

The HTTP secret uses constant-time hashed comparison. The SQL statement is fixed and parameterless. The returned/logged payload contains only counts: removed, retained and errors. No identity, URL, SQL error or bearer secret is logged by this feature. The bearer credential is replayable; managed ingress restrictions, secret rotation and rate protection remain deployment requirements. A leaked executor credential can invoke bounded expired-offer cleanup, but cannot choose an arbitrary target or delete active offers, appointments or customers.

Cleanup checks actual `ends_at <= transaction_timestamp()` and conservative historical eligibility, with at most 25 candidates per call. Used/ambiguous offers are counted and retained; their flag is not rewritten. FK dependencies retain the candidate without deleting links. Unknown failures are counted and reported as HTTP 503. Protected candidates cannot occupy every batch solely because of the known historical filters; repeated unknown failures may delay later candidates and need operator attention. Concurrent runs serialize through the shared advisory/table locks. Repeated successful execution removes nothing twice.

Public validity and pricing already require an unexpired timestamp, independently of cleanup. Upcoming behavior and no-early-discount rules are unchanged. Retained expired rows are not valid public promotions. Timestamps are compared as absolute timestamptz values; SQL/display use Africa/Casablanca, not an assumed permanent UTC offset.

Intended cadence: **hourly**, using the existing hosting provider's managed scheduler. No provider function, Supabase Cron job, persisted schedule or production secret was created or activated. A Netlify wrapper, if selected at approval, should POST to the endpoint with its secret; its execution timeout must accommodate the HTTP job and database timeout. A managed scheduler does not rely on browser tabs, dashboard visits or a local process. The executor has a two-connection limit; the runtime sets an 8-second statement timeout and 3-second lock timeout. A provider-compatible direct/session connection preserving `session_user` must be verified; an incompatible shared pooler safely fails the identity check.

## Activation prerequisites — separate approval required

1. Review both exact SQL artifacts and the deployment's PostgreSQL version (MAINTAIN support requires PostgreSQL 17+; PostgreSQL 18 was tested), triggers, provider restrictions and inherited PUBLIC function/schema privileges. A reviewed operator must be able to provision the NOLOGIN owners; do not substitute a broad application role if the provider refuses.
2. Explicitly approve base function/role installation. Install only the base artifact with destructive execution still revoked. Existing production tables, columns, FK and RLS policies remain unchanged; no script here installs itself.
3. Complete an isolated Supabase/PostgREST staging test of real JWT/session routing, provider Auth/Storage behavior and the deployed connection mode. The disposable harness emulates verified JWT claims; it is not a real hosted Auth test.
4. Separately approve/apply the activation grants for the chosen operations. These grants enable direct authorized RPC deletion regardless of the Next.js UI flag. Service and customer deletion remain unavailable.
5. Approve provisioning a random secret for `gelin_cleanup_executor`, enabling LOGIN only on that executor, restricting connection/network access and using verified TLS. Do not store credentials in source, Dockerfiles, build arguments, images, logs, URLs shown to users or `NEXT_PUBLIC_` variables. Neither owner ever receives LOGIN or a password. There is no Docker configuration in this task; a future Docker build requires an explicit secret-excluding build context and runtime secret injection.
6. Deploy only after separate approval, then set `PERMANENT_DELETION_ENABLED=true` for manual functions as intended. Set `OFFER_CLEANUP_ENABLED=true`, `OFFER_CLEANUP_DATABASE_URL` and `OFFER_CLEANUP_SECRET` only after cleanup approval.
7. Configure/approve the hourly scheduler, its bearer handling, timeout, monitoring, rate/ingress controls and operator runbook. Monitor retained/error counts and rerun safely when needed. No production deletion is needed for a development test.

All these production steps remain unperformed. No production connection was used to install or test this package.

## Emergency shutdown and rollback

Disable the scheduler and both application flags, rotate/remove cleanup secrets, and refresh/restart running instances as required. For an immediate database-side stop, an authorized operator can execute the following **only with the appropriate incident authority**; these commands were not run against production:

```sql
BEGIN;
REVOKE EXECUTE ON FUNCTION public.gelin_delete_category(uuid,text,text),
 public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text)
 FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.gelin_cleanup_expired_offers()
 FROM gelin_cleanup_executor;
ALTER ROLE gelin_cleanup_executor NOLOGIN;
COMMIT;
SELECT pg_catalog.pg_terminate_backend(pid)
FROM pg_catalog.pg_stat_activity
WHERE usename='gelin_cleanup_executor' AND pid<>pg_catalog.pg_backend_pid();
```

Revocation blocks new invocations; already-running manual RPCs need separate identification/cancellation through the provider because they share the authenticated connection infrastructure. Do not indiscriminately terminate all customer/authenticated sessions. Terminating an unfinished transaction rolls it back; a committed deletion cannot be undone by toggling a flag. Recover committed data only through the provider's reviewed backup/PITR process. No automated restore, disk-shrinking maintenance, broad cascade, `DROP OWNED` or global role/policy changes are included. Inert functions can remain after revocation; a later approved uninstall must remove only these named objects with RESTRICT and preserve unrelated objects.

## Verification and limitations

Final verification, completed 15 November 2026:

- Unit/API suite: **67 passed** across 12 files. Covers manual authorization/strict inputs/confirmation, fixed RPC calls, disabled defaults, customer/service deletion blocks, cleanup authentication/results, publication-only updates and direct request rejection/reactivation.
- Dedicated SECURITY DEFINER suite: **24 passed**. Installs the exact checked-in base and activation SQL, tests withheld grants before activation, actual executor login and connection gate, column/function privilege-drift rejection, owner isolation, anonymous/customer/inactive-admin refusal, protected dependencies, FK rollback, timestamps and concurrent/repeated cleanup.
- Full migration-based PostgreSQL regression suite: **70 passed**, including multi-service bookings/prices/idempotency, calendars/opening hours, authentication boundaries, public projections, service deactivation/reactivation with unchanged historical/customer snapshots, and proposal installation/deletion on the real repository schema.
- Admin/calendar/status/customer-control browser suite: **24 passed** on desktop/tablet/mobile, with no external writes. Desktop/mobile screenshots exposed an overly narrow new action group; its responsive grid placement and label wrapping were corrected, and the affected **6 browser checks passed again** with explicit button-size/no-overflow assertions. Updated desktop/mobile dialogs were visually inspected; final production build also passed after the CSS correction.
- Public unconfigured-state browser suite: **21 passed** against an isolated production-mode build, covering homepage/gallery/other public routes, languages, responsiveness, basket removal and unauthenticated mutation refusal.
- Catalogue/request browser suite: **23 passed and one tablet timeout initially**; the isolated tablet catalogue rerun passed **all 3 tests**, including that timed-out basket scenario. No public catalogue code was changed. These are fixture/mocked request tests, not production writes.
- Standalone TypeScript, ESLint, production build and `git diff --check`: **passed**. The final build used isolated public credentials and explicit deletion/cleanup-off switches. Earlier intermediate build/type errors and an incomplete browser fixture were corrected before these final passes.

Disposable tests enable LOGIN with a random password only in the disposable cluster. Grants, ownership and function bodies are not replaced with a superuser approximation. Manual caller tests use the existing authenticated role with controlled claims; the scheduler uses real separate NOBYPASSRLS logins and the actual server connection gate. The full migration regression separately exercises a session-authorized category deletion. No successful customer-account or permanent service deletion is claimed.

Service deletion is intentionally not claimed as race-free or enabled. Account deletion is postponed. Hosted Auth HTTP integration, production certificates/poolers, real ingress logging and provider scheduling have not been exercised. No production customer, service, offer, appointment, Auth/profile record, RLS policy, table, column, FK, role or function was changed. Deletion does not immediately shrink allocated PostgreSQL disk or erase backups/WAL. Uploaded images and existing audit records remain.

## Complete changed-file inventory

Current safe-deletion work (including retained Stage B UI foundations):

- `supabase/proposals/safe-deletion.sql`, `supabase/proposals/activate-safe-deletion.sql`: exact review-only SQL and separate authority activation.
- `src/lib/permanent-deletion.ts`: shared contracts, fixed RPC mapping and sanitized database errors.
- `src/lib/offer-cleanup-connection.mjs`, `src/lib/offer-cleanup-connection.d.mts`: execute-only connection and declarations.
- `src/app/api/admin/permanent-deletion/route.ts`: session RPCs and inactive defaults.
- `src/app/api/internal/expired-offer-cleanup/route.ts`: authenticated, fixed-function cleanup call.
- `src/app/api/admin/service-status/route.ts`: minimal existing-editor activation/deactivation.
- `src/components/service-status.tsx`: status confirmation/control.
- `src/components/fatu-entity-manager.tsx`: status/actions and inactive-service deletion requests.
- `src/components/permanent-delete.tsx`: retained confirmation dialog, shared contract import updated.
- `src/components/fatu-appointments.tsx`, `src/app/admin/admin-premium.css`: retained Stage B deletion control/styles and targeted action-group sizing/wrapping fix.
- `src/components/fatu-clients.tsx`: prior destructive control removed; restored to pre-deletion behavior (may have no net diff against repository HEAD).
- `src/lib/permanent-deletion-route.test.ts`, `src/lib/expired-offer-cleanup-route.test.ts`: revised RPC/cleanup API tests.
- `src/lib/service-status-route.test.ts`, `src/lib/service-deactivation-request.test.ts`: status and direct request enforcement tests.
- `scripts/test-permanent-deletion.mjs`: exact-grant disposable SQL/credential/concurrency tests.
- `scripts/test-appointment-requests-db.mjs`, `scripts/test-db.mjs`: full-schema status/preservation and proposal integration tests.
- `tests/preview/permanent-deletion.spec.ts`: status dialogs, reversible changes and absence of customer-delete controls across devices.
- `.env.example`, `scripts/test-safe-browser.mjs`: new restricted configuration and isolated browser defaults.
- `package.json`, `package-lock.json`: retained runtime pg classification and disposable test command; no new package/version introduced.
- `docs/PERMANENT_DELETION_STAGE_B.md`, this document: historical-design warning and current implementation/runbook.

The superseded untracked Stage B files `permanent-deletion-core.mjs/.d.mts` and `deletion-connection.mjs/.d.mts` were removed/replaced. The Stage A report was preserved unchanged. Ignored local test configs/screenshots are verification artifacts, not deployment files.
