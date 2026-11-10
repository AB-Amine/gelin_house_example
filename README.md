# GELIN HOUSE

A French salon website and private operations dashboard built with Next.js,
React, strict TypeScript and Supabase PostgreSQL/Auth/Storage.

## Current result

The public pages, persistent multi-service selection, transactional booking engine,
secure guest management, staff authentication, role-based administration,
service/category/offer/content/gallery management, scheduling, customer records,
privacy anonymization and operational reporting are implemented in this workspace.
Seven SQL migrations define persistent storage, RLS/grants and transactional APIs.

**External setup is still required before real bookings can be accepted.** No
salon Supabase project, owner account, real business catalog or production domain
has been configured. The app runs without credentials with explicit empty states
and booking disabled. No invented business details, prices, staff or photographs
are published. See [the implementation report](docs/IMPLEMENTATION_REPORT.md) for
verification results, unexecuted tests and deliberate version-one limits.

## Start locally on Windows

Tested with Node.js 24.18.0. Node.js 24 or newer is required.

```powershell
cd E:\exemplaire_gelin_house
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open **http://127.0.0.1:3000**. Administration: **/admin/login**.
To inspect the administration design without Supabase, open
**http://127.0.0.1:3000/admin/preview** while running `npm.cmd run dev`.
This development-only, read-only preview uses clearly labeled fictional data;
it does not sign in, modify records, or enable real admin access. Production
builds return 404 for this route.
Keep `APP_URL` equal to the exact browser origin. Use `npm.cmd` in PowerShell
when execution policy blocks `npm.ps1`; no policy change is necessary.

To connect the database, fill `.env.local` privately, then run:

```powershell
npm.cmd run db:migrate
npm.cmd run owner:create
```

The first owner is invited through Supabase email; no password is seeded. Configure
SMTP, email templates and callback URLs first, as described in
[DEPLOYMENT.md](docs/DEPLOYMENT.md). The owner then supplies approved salon data
through the dashboard and explicitly enables booking.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run test:db
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The SQL suite uses a disposable real PostgreSQL instance and never your production
connection. Browser tests use a fresh production server on port 3100. Connected
Supabase journeys are skipped until an isolated project and test account are
configured. See [TESTING.md](docs/TESTING.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Booking rules](docs/BOOKING_RULES.md)
- [Owner guide (French)](docs/ADMIN_GUIDE.md)
- [Deployment and provisioning](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
- [Business onboarding](docs/BUSINESS_ONBOARDING.md)
- [Edge-case behavior](docs/EDGE_CASES.md)
- [Implementation report](docs/IMPLEMENTATION_REPORT.md)
- [Progress](docs/PROGRESS.md)

No payment processing or automatic booking messages are implemented. WhatsApp
opens a draft conversation. Pending requests reserve capacity until salon action.
All values use MAD centimes; scheduling uses Africa/Casablanca timezone rules.
The initial interface is French. Arabic/RTL translation is not implemented yet.
