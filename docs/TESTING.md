# Testing

## Commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run test:db
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd audit
```

The database suite starts a temporary real PostgreSQL 18 cluster on port 55439,
applies every migration and stops the owned server afterward. It uses temporary
random credentials. `embedded-postgres` is a development dependency; if a fresh
install blocks its platform install script, follow the package's instructions
to approve its platform script. The test helper requests automatic symlink
rehydration. It never targets `DATABASE_URL` or production data.

The SQL tests create minimal `auth` and `storage` compatibility fixtures. They
exercise actual PostgreSQL functions, transactions, RLS/grants and exclusion
constraints. They do **not** emulate or verify Supabase Auth/Storage HTTP services.
The extension is preinstalled outside `public` to exercise Supabase-style layouts.

## Verified local coverage

- Thirteen unit tests: exact pricing, rounding, discount bounds, eligibility/expiry,
  consultation uncertainty, telephone normalization, consent/input validation,
  service deduplication, terminal statuses, Casablanca clock changes and calendar
  month/week/day boundaries.
- Twenty-six database checks: clean migrations, closed configuration gate,
  anonymous privacy/execute permissions, multi-service snapshots and occupancy,
  idempotency, overlap/closing-time rejection, management capabilities, role
  authorization, simultaneous submissions, reschedule rollback, cancellation
  release, the exclusion constraint independent of the planner, manual capacity,
  protected availability changes, archived services, public/admin persistence,
  promotions/quote changes, staff leave, reschedule revisions, last-owner
  protection, real reporting, privacy anonymization/token revocation and
  date-specific opening overrides, assigned-only staff access, scoped search and
  internal-note confidentiality/anonymization.
- Fourteen desktop/mobile browser checks against an unconfigured app: responsive
  public pages, navigation, missing content, basket persistence/deduplication/
  removal/revalidation, closed checkout, protected admin routes, fake localStorage
  authentication rejection, private-page noindex and API access/origin rejection.
- Screenshots are generated under `test-results/` for desktop/mobile homepage review.

See IMPLEMENTATION_REPORT.md for the final execution status and limits.

## Browser test isolation

For the development-only admin design preview, run:

```powershell
npx.cmd playwright test --config=playwright.preview.config.ts
```

This separate check reuses the local development server on port 3000, or starts
one if absent. It verifies sample-only navigation, desktop/mobile rendering, no
API mutations, and continued protection of the real dashboard. Production checks
also verify that `/admin/preview` returns HTTP 404. No Supabase credentials are
needed for this preview; all displayed sample business data is explicitly fictional.

Build first. Playwright starts a **fresh** production server on port 3100 with
`APP_URL=http://127.0.0.1:3100`; it refuses to reuse an old server. Do not rebuild
while that server is running. Safe-state tests override Supabase credentials in
the child server to keep the expected unconfigured state even with `.env.local`.
The configuration loads `.env.local` for explicitly enabled connected tests.

## Connected Supabase journeys — not verified locally

Use a disposable, migrated Supabase project. Set its URL/public key/server secret
and an already provisioned test owner's credentials in private local environment
variables, plus:

```powershell
$env:E2E_DATABASE_ISOLATED = 'true'
# Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD privately, never in source control.
npm.cmd run build
npm.cmd run test:e2e
```

Enabling this flag authorizes the test fixtures to modify that disposable test
project. The full journey creates clearly named `TEST-...` services, qualifications,
hours and settings. It books multiple services, checks the actual database,
authenticates the owner, confirms the request, creates/edits a service, publishes
an offer, verifies the public discounted price, cancels using the guest link,
checks released capacity, and verifies logout protection. A separate authentication
smoke test also runs. These tests are skipped without the required configuration.
They retain test data for diagnosis; reset the disposable project afterward.
Never point them at the salon's production database. Safe-state tests are skipped
when connected tests are explicitly selected.

Live SMTP invitation/reset completion and Storage upload/removal still require
provider-backed verification. No automated booking-notification provider exists.
Automated browser checks are not a WCAG conformance certification: keyboard,
screen-reader, contrast, focus, actual device and full populated-flow reviews are
still part of launch acceptance. No passing test is claimed for an unexecuted journey.
