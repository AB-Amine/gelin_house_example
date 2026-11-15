# Stage B — permanent deletion and expired-offer cleanup

> Historical implementation report. The direct BYPASSRLS login design below has been replaced and must not be activated. See [Safe deletion finalization](SAFE_DELETION_FINALIZATION.md) for the current SECURITY DEFINER architecture, staged grants, service controls and verification. Customer-account deletion is postponed and its UI control has been removed.

Implementation date: 14 November 2026. **Implemented for review; production activation is blocked pending the database authority and scheduler setup below.** No production record was deleted, updated or created. No production schema, FK, RLS policy, function, role or grant was changed. No migration was executed against production. No commit, push or deployment.

## Delivered behavior

Discreet Supprimer controls reuse the existing admin styles. The shared native modal displays the exact name/reference, irreversibility warning, and counts of owned rows that would be removed. Appointments include the customer, Casablanca date/time, status and service snapshots. Preview is read-only. Cancel receives focus, Escape closes the modal when idle, focus returns to the trigger, and duplicate requests are guarded synchronously. A changed record requires a new preview. An eligible operation requires typing `SUPPRIMER`; accounts never reach an eligible confirmation state.

The backend authenticates through the existing active-admin architecture, enforces same-origin requests, validates UUID/entity/body, and rechecks administrator activity and dependencies inside the transaction. SQL identifiers come only from internal allowlists; values are parameterized. Success follows COMMIT, not a React state change. The success message remains visible until the modal is closed, then the list refreshes. Relevant dynamic public/admin paths are invalidated after successful deletion. Errors never include raw SQL, credentials or customer payloads. Existing generic configuration deletion remains unchanged.

| Record | Eligible transaction | Blocked cases / current activation status |
| --- | --- | --- |
| Service | Engine can remove an unused service plus only its qualifications, service-resource links, service-city links and matching translations. Resources/cities/images remain. | Booking items, request arrays and offer links block it. **API deletion is additionally blocked unconditionally** because the current request writer is not coordinated; see below. |
| Category | Empty category plus its matching translations. | Any service, including archived/unpublished; no reassignment or service deletion. |
| Offer | Definition plus only promotion-service links and matching translations. | Nonzero/indeterminate usage counter, or any recorded promotion-name history anywhere. Renames make attribution ambiguous, so even unrelated discounted snapshots conservatively block it. No service, booking, discount snapshot or counter is modified. |
| Appointment | Past terminal appointment plus its own items, allocations and history. The effective end must be in the past (start for legacy fixtures without an end). | Active/future records; financial rows, change requests, booking requests, notifications or idempotency rows. No replay protection is removed. Customer/account/service records and promotion counters remain intact. |
| Registered client | **None enabled.** Server always rejects; Auth is never called and profiles/Storage are never deleted. | All accounts remain blocked until distributed concurrency safety is demonstrated. This also protects every administrator and the acting account. The engine explicitly recognizes active/inactive admin identities. No bypass flag enables account deletion. |

All database deletion remains opt-in even for otherwise eligible categories, offers and appointments.

## Why services and accounts remain blocked

`/api/appointment-requests` reads available services, then inserts `contact_messages.service_ids` in a separate REST call. The UUID array has no FK. A pending writer can finish after a deletion transaction releases its locks and save a deleted service ID. Locks on the deleting side alone do not solve this. The engine is tested with controlled writers, but the **publicly reachable service DELETE is refused regardless of its result**. Enabling it requires approval to coordinate this request persistence path, without changing its booking rules, followed by a race test of the entire writer/deleter flow. No such booking-path change was made here.

Auth deletion can set booking/request client references to NULL. A preflight dependency check, including Storage, cannot prevent a reference arriving before the external Auth deletion commits. Holding SQL locks across the Auth API can deadlock. Therefore this implementation never attempts Auth/profile/Storage deletion. Since it always refuses, it does not grant extra Auth/Storage access merely to display a dependency list. Testing safe successful Auth deletion is **not claimed**. The intended strong confirmation is `SUPPRIMER LE COMPTE` only after a coordinated design is approved; no account currently reaches that stage.

## Transactions, privileges and RLS

The server uses a dedicated `DELETE_DATABASE_URL` and never falls back to the migration `DATABASE_URL` or the Supabase elevated REST key. The already-installed `pg` package was moved to runtime dependencies without changing its version.

Transactions acquire the existing booking/admin advisory lock `711042` first, followed by an ordered allowlist of SHARE ROW EXCLUSIVE table locks. Dependencies are re-read while writers are blocked. This serializes cleanup/deletion operations and coordinates existing SQL booking writers that use the advisory lock. A FK/trigger/permission/timeout failure rolls back the owned rows and parent together. No broad cascade, archive/status update, audit insert or storage delete is introduced. The locks are brief but can delay other admin writes; lock timeout is 3 seconds, statement timeout 8 seconds, idle transaction timeout 15 seconds. The application never waits for a browser confirmation or Auth HTTP call while holding them. [PostgreSQL locking and required privileges](https://www.postgresql.org/docs/current/sql-lock.html).

`SET LOCAL row_security=off` does **not** disable RLS policies; it prevents a filtered dependency query from being mistaken for complete visibility. PostgreSQL must either supply full visibility under the approved role or refuse. The connection gate requires a dedicated non-owner role named `gelin_delete_runtime`, with explicitly approved BYPASSRLS authority. It rejects superusers, role/database creators, replication capability, inherited role memberships, table ownership, INSERT/UPDATE/TRUNCATE/TRIGGER rights, and DELETE rights outside the approved parent/owned-child allowlist.

**This is additional database authority and has NOT been provisioned.** The current `anon`/`authenticated` grants and `admin_save` allowlist cannot perform these deletions. Merely setting an environment flag is insufficient. Do not use `postgres`, the migration login, or a general `service_role` connection to work around this gate.

A reviewed provisioning plan should restrict the role to:

- SELECT on the exact dependency, parent and detail tables used by the engine, with narrower column grants where feasible.
- MAINTAIN on the exact locked tables, where the deployed PostgreSQL version supports it, for table-lock authority without granting UPDATE on protected records. PostgreSQL 18 was verified locally; deployment version/support must be confirmed before provisioning.
- DELETE only on the approved parents and owned children: categories, promotions, appointments, translations, promotion_services, appointment_items, allocations and appointment_history. Service/configuration deletion grants are unnecessary until that API action is approved for activation.
- Appropriate database/schema access and verified TLS. No ownership, membership, schema creation, Auth write access, Storage write access or other table-write authority.

The local disposable test demonstrates category deletion under a non-owner BYPASSRLS role with SELECT/MAINTAIN and allowlisted DELETE, while financial DELETE and appointment UPDATE remain denied. It does not prove the deployment provider will permit provisioning this role. If provisioning is unavailable, a narrowly scoped security-definer RPC is an alternative that would require separate explicit approval and database-function installation. No such function or migration was added.

## Automatic expired-offer cleanup

Implemented endpoint: `POST /api/internal/expired-offer-cleanup`. Both `OFFER_CLEANUP_ENABLED=true` and the dedicated deletion connection must be approved/configured. A server-only bearer secret of at least 32 characters is required and compared using constant-time hashes. GET cannot trigger cleanup. The endpoint is not called by browsers or admin page visits.

Each execution selects at most 25 timestamp-expired, apparently unused candidates, then rechecks each one in an independent transaction. Protected known historical offers are counted separately so they do not occupy every candidate slot. Concurrent cleanup may find an already-deleted candidate; that is retained/skipped without a second deletion. The result contains only `removed`, `retained`, and `errors` counts. Unexpected FK/database failures preserve the entire affected offer transaction and produce an error count/503 for monitoring. Existing history is never deleted to unblock cleanup. Retained is a point-in-time count, not a durable audit ledger. No new database audit rows are inserted. A growing error count requires operator investigation; repeatedly failing unknown dependencies can delay later batches.

Expiration is already enforced by the existing public catalog and pricing predicates (`ends_at > now` / captured instant); no discount or public UI changes were needed. Retained expired offers remain in the admin list as expired. Their `active` flag is not rewritten, and no discount can become valid merely because cleanup is delayed. Existing upcoming behavior remains intact.

Timestamp comparisons use PostgreSQL timestamptz and database time, not browser time or string dates. Sessions/display use Africa/Casablanca. For example, `2026-11-20 18:34+01` and `2026-11-20 17:34Z` are the same tested expiration instant. The cleanup recheck requires `ends_at <= transaction_timestamp()`.

### Schedule — inactive, setup approval required

The repository has `netlify.toml` but no existing cleanup schedule. No Supabase Cron job, pg_cron extension, scheduled database write, provider setting or deployment was created.

Proposed cadence is **hourly**, using the existing hosting provider's scheduled-function mechanism to call this authenticated POST endpoint. Offers stop being valid at their expiration timestamp; database removal waits until a subsequent successful batch and may take longer for backlog/dependencies. Netlify scheduling runs in UTC and only automatically on published deploys; the native scheduled wrapper has a 30-second execution limit. Its timeout/retry behavior must be checked against the HTTP job and deployment limits before activation. [Netlify Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/).

The endpoint alone is **not an active automatic schedule**. A small provider wrapper, secret configuration, log monitoring and production role provisioning remain approval/setup tasks. Neither a local server nor an open browser is part of the proposed production mechanism. Supabase Cron was not selected because creating a persisted job/extension would add database changes beyond the current restriction.

## Tests and verification

- TypeScript and ESLint: passed.
- Unit/API tests: 54 passed, including authorization/origin/target/confirmation rejection, backend-only success, sanitized errors, scheduler authentication, disabled defaults and failure status.
- New disposable PostgreSQL deletion suite: 20 checks passed. Covers eligible engine transactions, dependencies, owned-row preservation, rollback after an unexpected FK, stale confirmations, account blocking, concurrent/repeated cleanup, upcoming/active offers, renamed historical ambiguity, timestamps and restricted-role operation.
- Existing disposable PostgreSQL integration suite: 68 checks passed, covering multi-service pricing/bookings/idempotency, authentication boundaries, opening hours, accounts, requests, catalogs, offers and admin edits.
- Public browser regressions: 21 passed on desktop/tablet/mobile using a production-mode local build with external Supabase disabled.
- Admin/calendar/dialog browser regressions: final complete run 21 passed on desktop/tablet/mobile. A prior concurrent run had a mobile calendar timeout; its isolated rerun and the final complete run passed without calendar code changes. The new modal test caught a Cancel-focus issue during loading; this was fixed and all three device checks now pass. Desktop/mobile dialog screenshots were also inspected.
- Final production build: passed with isolated public credentials and deletion/cleanup explicitly disabled. TypeScript is included in that build; separate TypeScript/lint checks also passed. `git diff --check` passed.
- Only mocks and new disposable localhost databases were used for destructive tests. These are not live Supabase Auth/Storage integration tests. No successful account deletion is claimed. The isolated PostgreSQL fixtures are intentionally minimal; the separate 68-check suite exercises the repository migration-based database.
- The browser tests validate blocked-dialog behavior with mocked HTTP; they do not prove successful production deletion. All production activation switches remain off/unconfigured by this work.

## Modified/new files

- `.env.example`: disabled defaults and dedicated server secrets.
- `package.json`, `package-lock.json`: move existing pg to runtime; add isolated deletion test command.
- `src/lib/permanent-deletion-core.mjs`, corresponding `.d.mts`: transactional allowlisted checks, delete engine, cleanup.
- `src/lib/deletion-connection.mjs`, corresponding `.d.mts`: dedicated connection gate and role restrictions.
- `src/app/api/admin/permanent-deletion/route.ts`: authenticated preview/confirmation API and safe blocks.
- `src/app/api/internal/expired-offer-cleanup/route.ts`: disabled-by-default scheduler endpoint.
- `src/components/permanent-delete.tsx`: shared accessible modal, loading/confirmation/result behavior.
- `src/components/fatu-entity-manager.tsx`, `fatu-appointments.tsx`, `fatu-clients.tsx`: small admin action integrations.
- `src/app/admin/admin-premium.css`: scoped modal/action styling; existing public design untouched.
- `src/lib/permanent-deletion-route.test.ts`, `expired-offer-cleanup-route.test.ts`: mocked security/failure tests.
- `scripts/test-permanent-deletion.mjs`: disposable PostgreSQL suite, never reads production credentials.
- `scripts/test-safe-browser.mjs`: explicitly disables deletion/cleanup during isolated browser builds.
- `tests/preview/permanent-deletion.spec.ts`: native dialog/focus/mobile test with blocked mocked backend.
- This report. The pre-existing untracked Stage A report was preserved unchanged.

## Storage impact and remaining approval

Committed deletion removes the specified active rows, not historical backups, WAL or image files. PostgreSQL can reuse free space without reducing allocated disk size immediately. No VACUUM FULL or other disk-shrinking maintenance was run.

Approval is required before provisioning the dedicated runtime role/grants and activating the hourly provider schedule. Service deletion additionally requires a coordinated request-writer design; account deletion requires a separately proven Auth/business-link strategy. Current errors explain these blocks instead of reporting false success. No additional database authority was exercised as part of this implementation.
