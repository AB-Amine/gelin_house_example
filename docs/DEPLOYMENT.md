> **Current Fatu implementation:** see [Fatu setup](FATU_SETUP.md), [implementation phases](FATU_IMPLEMENTATION.md) and [validation](FATU_VALIDATION.md). The predecessor details below are retained for history and may describe older routes or test counts.

# Deployment and configuration

The code is implemented locally. Nothing has been deployed to a salon domain or
connected to a real Supabase project during this session.

For the recommended **0 DH Netlify Free + Supabase Free** setup, including a
first administrator without SMTP, follow [ZERO_DH_LAUNCH.md](ZERO_DH_LAUNCH.md).
Every active application administrator has equal full access after migration 008.

## Local Windows development

Use a supported Node.js version (tested: 24.18.0), then in PowerShell:

```powershell
cd 'D:\gelin house\gelin_house_example'
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Open `http://127.0.0.1:3000`. Without credentials, public pages show honest empty
states and bookings stay closed. PowerShell execution policy may block `npm.ps1`;
use `npm.cmd`, without changing the execution policy. Development uses the same
PostgreSQL implementation as production; there is no in-memory booking database.

## Create and migrate Supabase

Create a **new dedicated Supabase project** for the salon and a separate disposable
project for live integration testing. Obtain values from that project's dashboard:

| Variable                               | Purpose                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public Supabase project URL                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; RLS and grants still restrict access              |
| `SUPABASE_SECRET_KEY`                  | Private server secret (legacy service-role key also works)                |
| `DATABASE_URL`                         | Private migration connection with DDL permissions                         |
| `APP_URL`                              | Exact browser origin, including port locally, HTTPS in production         |
| `TRUST_PROXY`                          | `1` only when a trusted ingress replaces `x-forwarded-for`; otherwise `0` |

Save secrets only in `.env.local` or the hosting provider's secret settings.
Never prefix server secrets with `NEXT_PUBLIC_`. Do not disable TLS verification
for a hosted database. Use the provider's connection details and trusted CA.

Run:

```powershell
npm.cmd run db:migrate
```

The migration runner uses a transaction, advisory lock, and checksums. Re-running
unchanged migrations is safe. A changed applied migration is rejected. New
changes require a new migration file. Do not mix this runner and another
migration ledger without reconciling their histories.

Migrations require Supabase's `auth.users`, `auth.uid()` and `storage.buckets`.
They install `btree_gist`, create tables/functions/RLS/grants, and create the
`salon-images` bucket. The only initial business row is unapproved settings with
booking disabled. There are no seeded passwords or fictional service prices.

## Authentication and the first owner

In Supabase Auth, disable public user signup. Configure the site URL and allow
these exact redirects for your local and production origins:

```text
http://127.0.0.1:3000/auth/callback
https://YOUR-SALON-DOMAIN/auth/callback
```

Configure and test a production SMTP sender. Set invite and recovery email
templates to send token hashes to the server callback (using the correct type):

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite"
  >Accept invitation</a
>
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery"
  >Reset password</a
>
```

The callback supports both these one-use token hashes and PKCE `code` exchanges.
Template delivery and browser completion have not been validated against a live
Supabase project. Finish that verification before relying on invitations.

Run the privileged provisioning command from a private terminal:

```powershell
npm.cmd run owner:create
```

Enter the owner's email and display name when prompted. No password is handled
by the script. It refuses to provision when an owner profile already exists.
The invited owner completes the link and sets a password of at least 12
characters at `/admin/password`, then signs in at `/admin/login`. If profile
creation fails, inspect the auth account in Supabase; the script does not delete
an existing account. Further invitations and account activation/deactivation are
available to every administrator at `/admin/team`. All active accounts have the
same full access. Do not invite unverified users or deploy test accounts.

Configure Supabase session duration/inactivity limits for staff usage, enable its
authentication abuse limits, and verify the reset flow and session expiration.
An MFA enrollment/challenge interface is not implemented in this version.

## Hosting

Deploy the repository as a Next.js application to Vercel or an equivalent Node.js
host. Install with `npm ci`, build with `npm run build`, and use Node.js 24.
Configure all required environment variables separately in each environment.
`DATABASE_URL` is needed by the migration command, not by normal app requests;
keep migration credentials in a separate operational context if possible.

Set `APP_URL` to the exact HTTPS domain before building/deploying. Set
`TRUST_PROXY=1` only after checking that the host replaces the forwarded client
IP header; otherwise application limits intentionally share one bucket per
operation. Add the domain, DNS, HTTPS and redirects through the hosting provider.
Do not cache admin, guest-management, authentication or API responses at the CDN.
Public content is rendered dynamically. Avoid custom caches that retain private
responses or stale availability.

No native Sites deployment was created: this project follows the requested
workspace-based Next.js/Supabase architecture and the specified hosting target.

## Before accepting real appointments

Complete [BUSINESS_ONBOARDING.md](BUSINESS_ONBOARDING.md), then follow
[ADMIN_GUIDE.md](ADMIN_GUIDE.md). Keep booking closed until approved services,
staff qualifications, opening schedules, contact and policies are configured.

Run all checks in [TESTING.md](TESTING.md) against the deployed environment and
the disposable Supabase test project. Verify logged-out API access, equal admin
permissions, inactive-account rejection, concurrent submissions, private links, password recovery,
uploads, and live public/admin synchronization. Inspect the mobile journey.
Remove all test data. Live authentication/storage/delivery verification is a
launch blocker; successful local SQL tests do not verify those external services.

## Backups and operations

Select Supabase backups/PITR appropriate to the owner's retention and budget.
Verify the chosen plan's actual limits; free hosting is not unlimited. Schedule
and test a restore into a separate project. Database backups and image-object
backups are separate concerns: preserve both and protect access to each.

Monitor server error rates, database connection failures, storage usage and
pending appointments. Application errors shown to users are sanitized; never log
request bodies, phone numbers, passwords, management tokens or auth cookies.
Add an error-monitoring provider with sensitive-data scrubbing before production
operations require it; none is configured by default.

Pending requests never expire automatically. No expiry cron is needed. Review
them daily. Periodically remove obsolete `rate_limits` rows through an operator
job (for example, windows older than seven days) and review unused image objects.
Do not remove idempotency or booking history without an approved retention policy.
Coordinate privacy requests with backups, exports, and the owner's retention rules.
