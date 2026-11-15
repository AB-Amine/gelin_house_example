# Safe production configuration — 15 November 2026

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
