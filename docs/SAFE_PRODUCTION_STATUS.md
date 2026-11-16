# Safe production configuration — 16 November 2026

## Current outcome — expanded database installation and RPC activation complete

Following the owner's explicit approval of both reviewed artifacts, installation
and restricted database activation completed in **`xjfnhctfwmxkbkfeminf`** on
**PostgreSQL 17.11**, using the existing Session Pooler connection with verified
TLS. No new backup was required by the owner. The 14-function base was not
reinstalled. See [expanded CRUD details](EXPANDED_ADMIN_CRUD.md).

- Installed the exact approved `expanded-admin-crud.sql` and
  `activate-expanded-admin-crud.sql`; their recorded SHA-256 checksums match.
  Each transaction was verified before COMMIT, then checked again after commit.
  An initial verification-count mismatch rolled back completely: PostgreSQL adds
  four internal FK triggers in addition to the 28 specified application triggers.
  Only the verifier was corrected; neither approved SQL file was changed.
- **24 functions total**, three private tables, 28 new application triggers,
  replay-key tombstone column/check, and the three reviewed booking replay guards
  are installed. The private request/service link table was backfilled with
  **15 associations**; deletion jobs and deleted-request reservations are empty.
- `authenticated` has EXECUTE on `gelin_crud_preview(text,uuid)`,
  `gelin_crud_delete(text,uuid,text,text,boolean)` and
  `gelin_account_deletion_jobs()`. All require an active administrator.
  Only `service_role` has application-role EXECUTE on
  `gelin_complete_account_deletion(uuid)`, which verifies Auth absence.
  Anonymous access, private-table access and private-function execution remain
  denied. The legacy three DELETE grants remain withheld.
- Function bodies/owners/fixed empty search paths and EXECUTE boundaries passed.
  Anonymous, missing-identity and non-administrator preview probes were rejected.
  The unchanged administrator guard requires `active`; no inactive administrator
  existed for a live inactive-identity probe. Existing public/Auth function bodies,
  ACLs and triggers were preserved except the explicitly reviewed booking guards
  and private lock helper. Existing constraints, RLS policies, table ownership and
  direct application table privileges remain unchanged apart from the approved
  replay-key constraint/nullability changes.
- Post-install public catalogue RPC returned HTTP 200 with 67 services and one
  offer; no hidden services or expired offers were listed. The existing editor
  EXECUTE permission and active-staff check remain present. The private schema
  still returns HTTP 406 / PGRST106 when requested through the public API.
- **No existing business or authentication records were inserted, updated or
  deleted.** No destructive RPC, Auth deletion, fixture creation or migration
  runner was used. Only the new private association table received backfill rows.
  No commit, push or deployment occurred; existing work and stash are preserved.

### Local application activation — enabled; hosted release still required

Database RPC authority is active for authorized administrators independently of
the website flags. Following the owner's local activation request, the ignored
`.env.local` now sets `PERMANENT_DELETION_ENABLED=true` and
`EXPANDED_DELETION_ENABLED=true`, with `OFFER_CLEANUP_ENABLED=false`.
The local route consequently selects `gelin_crud_preview` / `gelin_crud_delete`,
not the legacy appointment eligibility functions. Hosted flag values remain
unverified; this authorization and activation apply to the local application.

The owner confirmed that the signed-in local panel shows the expanded preview
for a future confirmed appointment, including the related-record review and
SUPPRIMER confirmation field. Focused rechecks passed: 26 route tests, 28 isolated
desktop/mobile dialog checks and 16 disposable PostgreSQL checks, including real
row removal for all eight appointment statuses, stale-plan rejection, dependency
rollback and unauthorized access. Destructive tests used only isolated fixtures;
no existing production record was deleted. No SQL was reinstalled or RLS changed.

Next.js was restarted using Node 24 for both the server and worker PATH. The first
direct launch omitted the worker PATH correction, causing an older-Node CSS
compilation error; the corrected launch changes no source code or dependencies.
The generated `.next/dev` cache was preserved by renaming it before rebuilding.
Final local checks passed: home and admin login HTTP 200, signed-in promotions
page HTTP 200 in the server log, and unauthenticated deletion preview HTTP 403.
A read-only expanded preview under an active administrator's database identity
confirmed a future `confirmed` appointment is eligible, lists four groups with
exact related IDs and requires dependent-record confirmation. This SQL identity
probe is distinct from the owner's signed-in browser confirmation above.

## Public/admin integration review — offer data flow

The offers page and homepage use the same `getCatalog()` result from
`public.fatu_catalog()`. The loader uses a request-scoped React cache, an explicit
no-store Supabase fetch, and a force-dynamic public layout. Offers are filtered
by active status and end time in the loader, then discounts independently require
the start time to have passed. The database projection additionally excludes
member-only offers, code-restricted offers, exhausted usage limits and links to
unpublished/archived prestations. Thus an offer in the admin list may correctly
be absent from public cards; upcoming public offers are announced without early
discounts. Admin datetime-local fields are converted from Africa/Casablanca via
Temporal before saving.

Admin offer/prestation/settings saves previously returned success without
explicitly revalidating public routes. The public routes are dynamic and fetch
uncached data, but client-side route caches could retain an earlier response.
Successful offer saves now revalidate home, offers and services; successful
managed catalogue/settings/gallery/content saves revalidate the public pages.
No database schema or production records were changed. Focused API/domain tests
passed (22 tests across four files). TypeScript and targeted ESLint checks were
started; results are recorded when they complete. Broader live CRUD scenarios
require authenticated administrator credentials and isolated production fixtures;
none were created in production.
The reviewed source supports all five entity types, explicit dependency plans,
typed confirmation, immediate refresh and durable Auth completion/retry; its
previous TypeScript, lint and production build checks were not repeated for this
environment-only activation. No live hosted UI or Auth deletion was exercised.

Only an unlinked `netlify.toml` is available. There is no linked Netlify/Vercel
project metadata or deployment credential, and configured APP_URL is local.
To finish, provide the **existing hosting provider, site/project ID, production
HTTPS URL, and secure deployment/environment-settings access**. Deploy the reviewed
working-tree source to that identified site (without committing/pushing unless
separately authorized), verify its Supabase project/public key and server-only
`SUPABASE_SECRET_KEY`, set exact HTTPS `APP_URL`, then enable both manual/expanded
flags and restart/redeploy. Verify administrator previews, permission failures and
pending-job visibility without deleting existing records.

**Automatic cleanup remains disabled:** `OFFER_CLEANUP_ENABLED` is false locally,
cleanup EXECUTE is withheld and its executor remains NOLOGIN. No scheduler was
enabled. Earlier inactive-base/recovery sections below are historical and do not
override this installation or the owner's backup waiver.

## Historical manual activation preparation — before expanded approval

The installed inactive base was not reinstalled. A targeted read-only check
confirmed that all 14 installed definitions still match the reviewed source and
that destructive EXECUTE remains withheld. The existing manual activation SQL
grants only the three category/offer/appointment DELETE RPCs to authenticated;
each still independently requires an active administrator and all existing
eligibility, dependency, confirmation and concurrency checks. No grants, flags,
records, policies, credentials or application code changed in this task.

The website source uses the installed fixed RPC names through the administrator
session. Its manual flag remains false locally and gates both preview and delete
modes. Prestation deletion, customer-account deletion and automatic cleanup
remain disabled. Hosted configuration and deployment are unconfirmed: only a
local APP_URL and an unlinked netlify.toml are available, without hosting project
metadata, deployment identity, provider token or confirmed production URL.

Recovery is **not verified**. No workspace archive/restore-verification report
or backup-management connection/token is available. Possible provider backups
have not been inspected or restored to isolation. Neither a database connection
nor prior local tests establish a recovery point. No new backup was created.

See [manual activation preparation](MANUAL_DELETION_ACTIVATION.md) for exact
grants, eligibility, source/deployment findings, the remaining ordered steps and
prepared revocation SQL. Recovery must precede the EXECUTE grant itself, because
the website flag does not protect direct RPC execution. No destructive RPC,
activation SQL, feature enablement, deployment, commit or push occurred; previous
development suites/audits were not repeated. Existing uncommitted work and the
package-lock stash remain preserved.

## Historical outcome — inactive production base installed and verified

The previously authorized, non-destructive base installation completed in
Supabase project **`xjfnhctfwmxkbkfeminf`**, PostgreSQL **17.11**, using the supplied
Session Pooler and existing postgres installer. The supplied CA certificate was
validated as a non-expired CA, copied to ignored `.tools/prod-supabase.cer`, and
configured through DATABASE_URL's `sslrootcert` option. TLS remained
`sslmode=verify-full`; the actual client TLS socket reported authorized=true.
No certificate or hostname verification was disabled. Other environment
variables and the locally stored password were preserved without logging values.

### Installation scope and compatibility

- API URL and authenticated pooler username match the intended project. The live
  SQL session confirmed database postgres, current_user/session_user postgres,
  server_version_num 170011 and `createrole_self_grant=''`.
- All 16 required application tables and referenced columns exist and are owned
  by postgres. Existing database/schema CREATE, Auth USAGE/uid EXECUTE,
  CREATEROLE and BYPASSRLS installer capabilities were sufficient. No additional
  privileged Supabase role membership or application credential was introduced.
- Proposed roles, private schema and gelin public functions were absent before
  installation. Existing provider event triggers were inspected: this installer
  creates no business table or extension and performs no DROP. The RLS-on-table-
  creation hook therefore has no table changes to apply; extension hooks do not
  match an extension creation. Existing PostgREST DDL notifications remain intact.
- The exact reviewed base SQL was installed with SHA-256
  `ACE89D13EF5608ECAC396A064F686C8AC8200BD766D8183CB6388D4A355038B9`.
  The final COMMIT was withheld until verification passed; all other reviewed
  statements ran unchanged. Verification was repeated after COMMIT. Neither
  activation SQL file was loaded or executed.

### Installed database functions

| Schema / owner | Installed functions |
| --- | --- |
| gelin_delete_private / postgres | `current_user_id()` — parameterless SECURITY DEFINER Auth UUID helper. |
| gelin_delete_private / gelin_delete_owner | `require_admin()`, `lock_entity(text)`, `inspect(text,uuid)`, `remove_offer(uuid)`, `manual(text,uuid,boolean,text,text)` — SECURITY INVOKER helpers. |
| public / gelin_delete_owner | `gelin_preview_service(uuid)`, `gelin_preview_category(uuid)`, `gelin_preview_offer(uuid)`, `gelin_preview_appointment(uuid)` — guarded SECURITY DEFINER previews. |
| public / gelin_delete_owner | `gelin_delete_category(uuid,text,text)`, `gelin_delete_offer(uuid,text,text)`, `gelin_delete_appointment(uuid,text,text)` — installed, destructive execution withheld. |
| public / gelin_cleanup_owner | `gelin_cleanup_expired_offers()` — installed, execution withheld and executor NOLOGIN. |

All **14 functions** have the expected owners and empty fixed search_path.
The private schema remains owned by postgres and is confirmed excluded from
the Data API: requesting it returns HTTP 406 / PGRST106 before and after install.

### Production verification passed

- Authenticated sessions have EXECUTE only on the four new preview entry points.
  The three new DELETE entry points and cleanup are not executable by anon,
  authenticated, service_role or gelin_cleanup_executor. Those roles also have
  no EXECUTE on the new private helpers; the cleanup owner receives only its
  specified invoker helpers. The postgres-owned Auth helper remains restricted.
- Both function owners and the executor are NOLOGIN/NOINHERIT, with no
  SUPERUSER/CREATEROLE/CREATEDB/REPLICATION. Only the two reviewed non-login
  function owners have BYPASSRLS. No app/executor membership permits assuming
  them; installer SET membership and temporary schema CREATE were removed.
  The deletion owner still has no USAGE on auth. Neither function owner can
  DELETE services, customers, client_profiles or admin_profiles.
- Three short SAVEPOINT-scoped production preview probes rejected anon,
  authenticated-without-identity and authenticated-with-a-non-admin identity.
  The latter use a nonexistent target and synthetic identity; no login, real
  administrator impersonation or authentication record mutation occurred.
  No DELETE or cleanup RPC was invoked, even as a denied-access probe.
  The active-admin guard was verified in the installed definition. Inactive-
  administrator behavior retains the previously passed local tests; no real
  inactive account was used for an additional production probe.
- Before/after metadata fingerprints matched for existing application/Auth
  function definitions, ACLs and owners; existing public table ownership/RLS
  flags; public/Auth row triggers and constraints; and public/Auth/Storage RLS
  policies. This includes the existing service editor. New grants are only those
  in the reviewed base SQL and target the newly created non-login roles.
- The existing `admin_save(text,jsonb,boolean)` remains executable by
  authenticated sessions and `staff_role()` retains its active-admin check.
  No real service was toggled. Deployment of the web buttons and hosted browser
  editing were not newly verified.
- The final public catalogue read returned HTTP 200, **67 services, one offer,
  zero explicitly hidden services listed and zero expired offers listed**.
  Only aggregate counts were logged; no business record was edited.
- Local PERMANENT_DELETION_ENABLED and OFFER_CLEANUP_ENABLED remain false.
  Hosted environment variables were not accessed or changed. Withheld database
  EXECUTE and executor NOLOGIN independently keep the new destructive entry
  points inactive for application callers.

### Operational status and remaining activation work

The Auth-schema permission blocker and inactive base installation are resolved
in production. Guarded previews are available at the SQL permission boundary
for active administrators; no hosted browser preview success is claimed.
Service editing and request-time offer expiry retain their existing database
and source behavior. No website source/design or hosting release was changed.

**Permanent deletion and automatic cleanup remain disabled.** Permanent
prestation deletion still has no public DELETE function or owner table DELETE
privilege; registered-customer deletion remains unavailable. No scheduler,
executor password or LOGIN was activated. No existing business record or Auth
record was changed by this installation: no business INSERT/UPDATE/DELETE was
issued, and no destructive function ran. Concurrent normal salon operations were
not frozen or included in a business-data snapshot.

Do not rerun the first-installation SQL: its objects now exist. Before any later
manual deletion activation, verify the previously required recoverable recovery
point/restoration evidence, review only the separate manual activation SQL and
complete the authorized hosted session/deployment checks. No such activation is
part of this task. Automatic cleanup remains outside scope; its historical
provider event-trigger connection-gate mismatch was not changed or activated.

This task performed only essential live metadata/permission checks, three
unauthorized preview probes and public reads; it did not rerun development
suites or broad audits. Evidence is in ignored local metadata/result files.
No credentials were printed or added to tracked files. No backup, commit, push
or deployment occurred; existing uncommitted work and the package-lock stash
were preserved. The previously shared secrets should still be rotated through
the provider and the ignored local settings updated afterward.

## Previous attempt — Session Pooler configured; TLS trust certificate required

Only DATABASE_URL in the ignored `.env.local` was changed to the official
Session Pooler connection supplied by the user. All other environment variables
were compared before/after and remain unchanged. The password was recovered
from the previous local URL, decoded and URL-encoded for the replacement;
its round trip was verified without printing it. No credential was invented,
displayed, added to tracked files or committed. TLS remains `sslmode=verify-full`.
The local deletion and cleanup flags remain explicitly false.

Connection configuration now uses host `aws-1-eu-west-3.pooler.supabase.com`,
port 5432, database postgres and the project-qualified postgres username for
**`xjfnhctfwmxkbkfeminf`**. This confirms the intended configured tenant, not
successful authentication to the live database.

The existing read-only catalog checker reached the pooler's TLS handshake but
failed with **`SELF_SIGNED_CERT_IN_CHAIN`**. This replaces the previous direct
IPv6 network blocker. Authentication and PostgreSQL queries were not reached;
the password, actual server version, schema compatibility, installer privileges
and existing function state remain unverified in this attempt.

No project CA certificate was found among workspace certificate files, relevant
user Downloads, or conventional PostgreSQL user root-certificate locations.
NODE_EXTRA_CA_CERTS, PGSSLROOTCERT, SSL_CERT_FILE and SSL_CERT_DIR are not set
in the current process. Certificate verification was not disabled and no
unverified certificate was trusted.

**Required next action:** download the database CA certificate from this
project's Supabase dashboard, Database Settings / SSL configuration, and save it
locally as `.tools/prod-supabase.cer` (or provide its existing local path).
It is a public CA certificate, not a private key or password. Then point the
connection's `sslrootcert` option at that trusted file while retaining
`sslmode=verify-full`, and resume the authorized preflight/installation.
[Supabase SSL instructions](https://supabase.com/docs/guides/platform/ssl-enforcement)
require the downloaded CA for verified database TLS.

No production SQL ran and no functions, roles, grants, RLS policies, business
records or Auth records were changed. Neither activation file was executed;
permanent deletion and cleanup were not enabled. No deployment, backup, commit
or push occurred, and no previous development tests/audits were rerun. The
corrected base SQL remains unchanged, pending verified TLS and live preflight.

## Previous attempt — configured credentials; direct database IPv6 unreachable

The supplied connection settings were configured in the Git-ignored `.env.local`
without printing their values. DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY are present when
loaded by Node. The legacy JWT secret was not stored or used. Both local
PERMANENT_DELETION_ENABLED and OFFER_CLEANUP_ENABLED are explicitly false.
The server secret is configured but was not used or validated in these checks.

The configured API and direct database host identities both match the intended
project **`xjfnhctfwmxkbkfeminf`**. This verifies configuration consistency, not
successful SQL authentication or the live database role/version.

Essential connection and public-read results:

| Check | Verified result |
| --- | --- |
| Direct PostgreSQL connection | Failed before authentication with ENOTFOUND, both inside and outside the restricted process sandbox. |
| Database DNS | No IPv4 A record (ENODATA); one IPv6 AAAA address exists. |
| TCP reachability to that resolved IPv6 address on port 5432 | Failed with ENETUNREACH. This machine has no usable route to the supplied database endpoint. No password was sent by the TCP-only diagnostic. |
| Public Auth settings | HTTP 200 using the configured publishable key; no login or Auth record update. |
| Public fatu_catalog read RPC | HTTP 200; 67 services, one offer, zero explicitly unpublished/archived services listed and zero offers expired at check time. Only aggregate counts were logged. |
| Installer password, PostgreSQL version/schema and privileges | Not verified: database authentication was never reached. The historical 17.11 version is not a fresh result. |
| Base functions / ownership / ACLs | No installation attempted. Current live presence and permission state remain unverified. |
| Service activation/deactivation | Source remains unchanged; no production service toggled. Successful hosted editing was not claimed. |
| Deletion and cleanup | Local flags false; no activation SQL, grant, login, scheduler or hosted setting change. Hosted configuration remains unverified. |

No direct PostgreSQL SQL or installation SQL executed. Only the public Auth
settings GET and public read-only catalogue RPC reached Supabase. No business,
authentication or RLS record was changed. No deletion/cleanup operation, broad
privilege, TLS relaxation, alternate database-host guess, credential bypass,
backup, deployment, commit or push occurred. Previous local tests were not rerun.

The exact proposed inactive base installer remains
[`supabase/proposals/safe-deletion.sql`](../supabase/proposals/safe-deletion.sql),
SHA-256 `ACE89D13EF5608ECAC396A064F686C8AC8200BD766D8183CB6388D4A355038B9`.
Neither activation SQL file is authorized by this task. Existing uncommitted
implementation work and the package-lock backup stash were preserved.

### Required connection detail to resume

In this project's Supabase dashboard **Connect** dialog, select **Session
pooler**, then provide the exact pooler hostname, port and username without a
password, or securely update the ignored DATABASE_URL with that exact string.
Supabase documents session pooling as the supported IPv4-compatible connection
for a client unable to use the direct IPv6 endpoint:
[official connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
Do not guess the project's pooler region/hostname or use transaction mode for
this session-sensitive installer. Alternatively restore IPv6 connectivity to the
supplied direct endpoint. No network or provider configuration was changed here.

After valid connectivity is available, resume the essential live project/schema/
permission preflight, show the complete unchanged base installation SQL and
install only if the existing privileges and provider hooks are compatible.
Then verify exact objects, owners, withheld destructive EXECUTE, executor
NOLOGIN, and unchanged existing RLS/editor definitions. Recovery and separate
activation review remain necessary before enabling deletion; cleanup stays off.

The password and server-side credentials supplied in chat should be rotated
through the provider and the ignored local configuration updated afterward.
No credential value is recorded in this report or any tracked file.

## Previous attempt — connection unavailable

The latest request authorizes installing the corrected inactive base functions
in project **`xjfnhctfwmxkbkfeminf`**, after verifying actual PostgreSQL/schema
compatibility and installer privileges. It does not authorize manual deletion,
cleanup execution, business-record changes or RLS changes. Earlier installation
approval wording is not a reason to ask for approval again; missing connection
access is the current blocker.

Work was performed in `D:\gelin house\gelin_house_example`. The corrected SQL,
Auth-fix report, finalization report and previous production status were read.
All existing uncommitted changes and the package-lock backup stash were preserved.

Essential access checks in this session found:

- No `.env.local` or other configured environment file; only `.env.example`.
- No DATABASE_URL, Supabase URL/public key/server key, PGSERVICE or PGSERVICEFILE
  in process, persistent user or machine environment variables. Only presence
  booleans were inspected; credential values were not logged.
- No PostgreSQL service configuration at the conventional user/AppData paths.
- No connected document session or available connected Supabase SQL tool.
- A Supabase integration is available but is not installed/connected; connection
  was suggested. A suggestion does not establish access or project identity.

Consequently **no production connection or SQL execution occurred**. The project
reference is confirmed as the intended target from the request and artifacts,
not freshly verified against a live connection. The PostgreSQL 17.11 version,
catalogue counts and permissions in the historical section below remain earlier
evidence, not fresh results from this attempt.

| Requested verification | Current result |
| --- | --- |
| Live project, PostgreSQL version, schema and installation privileges | Blocked by unavailable authorized connection. |
| Base function installation | Not performed in this session. Current production presence/absence is unverified. |
| Installed ownership, ACLs and unauthorized-access protections | Not freshly verified in production. Previous local checks remain documented in the Auth-fix report. |
| Service activation/deactivation | Source still uses guarded admin_save; no source changes or production toggles. Hosted operation not freshly verified. |
| Public catalogue / expired-offer visibility | Source still filters inactive/expired offers per request; live catalogue not freshly queried because configuration/access is unavailable. |
| Permanent deletion / scheduled cleanup | No activation SQL, EXECUTE grant, login credential, scheduler or feature-flag change performed. Current hosted settings not accessible. |

No customer, appointment, prestation, offer, authentication, RLS policy or other
production record was changed. No local application/SQL implementation change,
test rerun, backup, deployment, commit or push was performed in this attempt.
Only this status report was updated; the prior 7 installer/auth and 24 security
check results were not rerun or represented as production evidence.

### Required next action and exact installation scope

Restore the existing authorized postgres installer connection securely, either
through the Supabase integration or the project's ignored `.env.local`; do not
paste connection passwords or keys into chat. If using the local connection,
also restore the public Supabase URL and publishable key for catalogue checks.
No new broader database privilege or application service credential is requested.

Then perform the essential live identity/schema/permission preflight, show the
complete [corrected base SQL](../supabase/proposals/safe-deletion.sql), and install
that file only if those checks pass. Neither activation SQL file is part of this
installation. Verify new objects and unchanged existing editor/RLS definitions;
keep destructive EXECUTE grants withheld and the cleanup executor NOLOGIN.
Do not toggle existing services or invoke deletion/cleanup to verify the result.

The [Auth permission fix report](SUPABASE_AUTH_PERMISSION_FIX.md) contains the
exact proposed changes and local compatibility evidence. Recovery verification,
separate manual-activation review and hosted application verification remain
prerequisites before any later deletion enablement. Automatic cleanup remains
outside this task.

## Historical production evidence — 15 November 2026

> 16 November update: [Auth permission fix](SUPABASE_AUTH_PERMISSION_FIX.md) corrects the installer locally with a restricted postgres-owned Auth helper and temporary owner SET grants. The historical missing-privilege findings below are superseded for the proposed SQL. No production installation or destructive activation occurred; fresh live compatibility, recovery and hosting checks remain outstanding.

Scope follows the latest request: no new backup, no production test deletions, no automatic destructive cleanup, and no permanent-deletion activation while recovery is unverified. Earlier installation-approval wording does not override this request's authorization for safe configuration. Existing uncommitted work was preserved.

## Current feature status

| Feature | Verified status |
| --- | --- |
| Intended database | Live connection confirmed to configured Supabase project `xjfnhctfwmxkbkfeminf`, PostgreSQL 17.11. |
| Service activation/deactivation | Existing `admin_save` editor is executable by authenticated sessions, with its existing database administrator checks. The implemented controls reuse publication/archival fields and passed focused tests. No production service was toggled to demonstrate this. Deployment of the new buttons is not verified. |
| Public service visibility | Live public catalogue returned 67 services; none was unpublished or archived. |
| Expired-offer visibility/discounts | Existing server/request-time expiration filtering and pricing rules remain in effect without database deletion. Live public catalogue returned one offer, with zero expired offers listed. |
| Empty-category deletion | Not enabled; recovery is unverified and the function installer lacks a required privilege. No destructive EXECUTE grant was added. |
| Eligible-offer deletion | Not enabled for the same reasons. No offer was deleted. |
| Eligible past-appointment deletion | Not enabled for the same reasons. Requests, financial/history records and idempotency protections remain intact. |
| Permanent service deletion | Remains blocked. |
| Customer-account deletion | Remains disabled/postponed. No Auth users, profiles or customer records were changed. |
| Automatic destructive offer cleanup | Remains disabled. No scheduler, credential, LOGIN or cleanup EXECUTE grant was created or activated. |

## Essential production checks performed

Only a short `BEGIN READ ONLY` transaction, public catalogue read and public Auth settings HTTP GET were used. The database transaction ended with ROLLBACK; no customer/appointment rows were read or modified. Public catalogue contents were summarized as counts without logging record details.

- Application and database connection identities match the required project reference.
- The installer can create schemas and delegate CREATE on public.
- **The installer cannot delegate USAGE on the provider-owned `auth` schema.** The existing reviewed base SQL requires that grant for the new non-login manual-function owner to resolve `auth.uid()`. Installing it unchanged could leave authorization unusable. No grant or partial installation was attempted, and no broader Auth role membership or policy changes were substituted.
- The previously recorded `createrole_self_grant=''` installer condition remains present. It still needs the documented narrow installer fix/test before installation.
- Proposed new role count was zero in the essential check. No proposed role or function was installed by this task.
- The existing administrator editor's authenticated EXECUTE permission is present; its active-administrator verification was preserved.
- The public Auth settings endpoint returned **HTTP 200**. This proves reachability, not a successful administrator/customer sign-in. No login or authentication-record update was attempted.

Permanent-deletion execution remains blocked by the unverified recovery condition independently of installation permissions. Per request, no new backup was made or requested as a prerequisite to the unrelated safe checks.

## Offer expiry without deletion

`src/app/(public)/layout.tsx` is `force-dynamic`. `src/lib/catalog.ts` reads the public catalogue without persistent fetch caching and removes inactive or expired promotions for each request (`ends_at > as_of`). `src/lib/domain.ts` applies a discount only between its start and end timestamps, in addition to existing eligibility rules. The repository's existing production SQL also applies validity checks to booking/pricing.

No scheduler or DELETE is required for those rules. A newly rendered/requested public page excludes an expired promotion; an already-rendered browser page was not tested for live timer-driven removal. No public UI or pricing behavior was redesigned or changed in this task.

## Deployment and runtime limits

The available `APP_URL` is `http://127.0.0.1:3000`; no production hosting origin or deployment credential was available in the inspected configuration. `netlify.toml` alone does not establish a deployed site identity or give deployment access. Consequently no production website release, hosted environment update or end-to-end hosted navigation/redirect/sign-in verification was claimed.

Existing configured/default `PERMANENT_DELETION_ENABLED` and `OFFER_CLEANUP_ENABLED` were false/unset. Hosted settings were not inspected or changed. The reviewed implementation's guarded backend/source was preserved. Neither the combined activation SQL nor the cleanup function was executed.

Remaining prerequisites are specific:

1. A supported narrowly authorized installation path for the non-login owner's `auth.uid()` access and temporary installer SET-role capability. Do not grant the application a broad Auth or BYPASSRLS login role.
2. An existing, verifiably recoverable recovery point before enabling permanent deletion; no new backup creation is part of this request.
3. The real hosting URL and authorized deployment/configuration access before releasing/verifying the new controls. Do not include unrelated uncommitted changes in a deployment.

The earlier provider event-trigger mismatch remains relevant only if destructive cleanup is proposed again. Cleanup activation is explicitly outside the current scope.

## Focused tests and changes

Executed only the relevant existing suites:

```text
src/lib/service-status-route.test.ts
src/lib/service-deactivation-request.test.ts
src/lib/domain.test.ts
src/lib/expired-offer-cleanup-route.test.ts
27 tests passed across 4 files.
```

Prior broad audits, database fixtures, browser suites and builds were not repeated. No application code changed, so no new build was required. `git diff --check` passed for the documentation update.

Changed only this status document and links/status notices in `DELETION_PREPRODUCTION_REVIEW.md` and `SAFE_DELETION_FINALIZATION.md`. The ignored `.tools/essential-safe-state.mjs` is the targeted read-only check helper. No credentials or business record details were written into the report.

**No production business data, Auth records, tables, policies, roles, functions, grants or scheduling were changed. No backup, commit, push or deployment occurred.**
