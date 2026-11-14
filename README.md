# GELIN HOUSE

Next.js 16 / React 19 / TypeScript public website, protected salon administration and private customer accounts, backed by Supabase PostgreSQL, Auth and Storage. Requires Node.js 24 or newer.

The approved design is preserved. The principal booking flow is a **start-time-only salon diary**: requests await salon confirmation; exact active starts are protected by existing transactions. Legacy duration-based records remain intact. Both calendar views read configured hours, exceptions and closures. The admin has six main sections and five Mon salon tabs.

## Current engineering reference

- [Final audit, actual results, limitations and changed files](docs/FINAL_PRECONTAINER_AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Safe testing](docs/TESTING.md)
- [Deployment and next phase: containerization](docs/DEPLOYMENT.md)

Install with `npm.cmd ci`, configure variables privately from `.env.example`, and run `npm.cmd run dev` (local port 3000). Use `npm.cmd run build` and `npm.cmd run start` for production mode. The current start command binds loopback; container networking changes are deferred.

Configuration names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_URL`, `TRUST_PROXY`. `DATABASE_URL` is for separately approved database operations, not app runtime. Test-only opt-ins: `E2E_DATABASE_ISOLATED`, `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`. Never put server secrets in client variables, source control or image layers. The two `NEXT_PUBLIC_` values are compiled into the build; runtime replacement alone is insufficient.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:db
npm.cmd run test:safe
npx.cmd playwright test --config playwright.catalogue.config.ts
npx.cmd playwright test --config playwright.preview.config.ts
npm.cmd run build
```

`test:safe` builds and runs an intentionally unconfigured local production instance and disables connected writes even when private local configuration exists. Catalogue tests use a local HTTP fixture; admin preview edits stay browser-local. The SQL suite creates only a disposable local cluster. Do not run connected suites, provisioning, imports or migrations against the salon project as an audit step. Rebuild normally after fixture builds.

## Next phase: containerization

Ready for packaging **planning**, not a production-readiness declaration. The deployment checklist covers a future Dockerfile, ignore rules, non-root runtime, ports, writable image cache, secret injection, external Supabase, ingress and health checks. No container file, image or infrastructure change was created. Hosted authenticated writes, SMTP/recovery, Storage uploads, restore testing and native browser zoom remain explicit verification limits.

## Historical implementation notes (retained)

The records below describe earlier Fatu/predecessor phases. Where they conflict, the current audit above takes precedence. Past test counts and deployment claims are not evidence of a new execution.

An editorial makeup artist website, administrator workspace and private client portal built on the existing Next.js / React / TypeScript / Supabase project.

- [Setup, content onboarding and zero-DH launch](docs/FATU_SETUP.md)
- [Implementation phases and architecture](docs/FATU_IMPLEMENTATION.md)
- [Validation and external checks](docs/FATU_VALIDATION.md)
- [Official catalogue import and activation](docs/OFFICIAL_CATALOGUE.md)
- [Simplified five-section admin interface](docs/ADMIN_SIMPLIFICATION.md)
- [Complete admin panel system reference before simplification](docs/ADMIN_PANEL_SYSTEM.md)
- [Initial repository audit](docs/FATU_PHASE_0_AUDIT.md)

## Run locally

Use Node.js 24 or newer. In PowerShell, use `npm.cmd` when script execution policy blocks `npm.ps1`.

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Open **http://127.0.0.1:3000**. Public pages work without credentials with honest onboarding states. Real bookings, contact saving and authentication need Supabase. The development-only **/admin/preview** lets you inspect the design and edit browser-only preview content; it never publishes to the public website or creates real reservations. Production returns 404 for this route.

Real administrator login: **/admin/login**. Private customer account: **/client**. All active administrators have the same permissions. Artist/resource scheduling is separate from authentication; clients have their own ownership-checked access.

## Activate the database

Create separate development and production Supabase projects. Fill the placeholders in `.env.local` privately, then run:

```powershell
npm.cmd run db:migrate
npm.cmd run owner:create -- --user-id EMAIL_CONFIRMED_AUTH_USER_UUID
```

Apply **all migrations in order**, including the additive Fatu migrations after 009. The provisioning command retains its original name for compatibility; it creates an equal-access administrator. The setup guide explains Auth callback/SMTP configuration, image uploads and approved business content.

## Check the implementation

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:db
npm.cmd run build
npm.cmd run test:e2e
```

Unit/API and disposable-PostgreSQL tests can run without a hosted database. Connected Auth/Storage/browser journeys require an explicitly isolated Supabase test project. They are not represented as executed when credentials are absent.

## Publication status

**Not deployed. Not declared production-ready.** Business facts, policies, approved translations and real portfolio consent must be supplied by Fatu. Temporary licensed editorial photos are identified in [the asset manifest](public/images/manifest.json) and on the pages; they are not presented as Fatu or her work. No fictional reviews, service prices or contact information are published.

Booking requests remain pending until an administrator confirms. City eligibility, city/global/artist hours, exact prices and travel fees are checked by PostgreSQL transactions. Client requests preserve their existing appointment until reviewed. Payment records represent actual manually recorded receipts/refunds, separately from booking value. Notification events are queued integration records; no booking email/SMS/WhatsApp provider has been activated.

The zero-DH strategy is Netlify Free plus Supabase Free and the included hosting address, subject to provider quotas and inactivity pauses. Public customer email activation also requires verified SMTP setup. Website hosting has not been deployed. On 12 November 2026, the supplied Supabase project was connected, all 20 migrations were applied, and the four official categories and 67 services were imported and verified on the local website. The first administrator account was created and its real dashboard login verified. Prices, durations and scheduling setup remain to be configured. See [the catalogue activation record](docs/OFFICIAL_CATALOGUE.md).

## Provenance

The original repository and historical migration chain were retained. Earlier `GELIN HOUSE` reports in `docs/` describe the predecessor implementation; the Fatu documents above describe the active routes. No license file was supplied in the repository at audit time, so no new license or ownership claim is asserted.

Appointment request intake is open at `/reservation`: customers choose services and a preferred date. Requests appear on the dashboard and under **Rendez-vous → Demandes du site** (`/admin/messages`). These enquiries use the existing private inbox; scheduled time slots still require the salon scheduling configuration. See [the current admin user guide](ADMIN_PANEL_USER_GUIDE.md) for a step-by-step tour, or [catalogue and request documentation](docs/OFFICIAL_CATALOGUE.md) for implementation notes.

The simplified request-to-calendar workflow is implemented with migration 021: requests have Confirm/Modify/Refuse actions; safe confirmation creates the calendar appointment using existing booking transactions. See [workflow and test results](docs/SIMPLE_APPOINTMENT_WORKFLOW.md).

Current workflow: a manual start-time-only diary, one-page appointment creation, four Mon salon tabs, and connected public-content synchronization. Exact active starts are unique; full treatment overlap is not guaranteed. See [final implementation and verification](docs/FINAL_SIMPLIFICATION.md).
