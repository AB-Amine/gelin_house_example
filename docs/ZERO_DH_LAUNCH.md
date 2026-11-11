> **Current Fatu implementation:** see [Fatu setup](FATU_SETUP.md), [implementation phases](FATU_IMPLEMENTATION.md) and [validation](FATU_VALIDATION.md). The predecessor details below are retained for history and may describe older routes or test counts.

﻿# Finish and launch GELIN HOUSE for 0 DH

Updated 11 November 2026. This is a launch plan, not a record of a completed deployment.

## Recommended architecture

Keep the existing Next.js application. Use **Netlify Free** for the app and **Supabase Free** for PostgreSQL, Auth and image storage. Use Netlify's included `your-salon.netlify.app` address and HTTPS. Do not buy a domain for the initial launch. A custom domain is optional and usually costs money.

Supabase is the best fit for this repository because the booking engine relies on PostgreSQL transactions, advisory locks, GiST exclusion constraints, Supabase Auth identities and Storage. Moving to a different database would require replacing those integrations. SQLite/D1 is not a drop-in replacement. A plain hosted PostgreSQL database would still need authentication, storage and API integration work.

| Component                        | Starting choice                                                    | Cost control / limitation                                                                   |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Website and server routes        | Netlify Free                                                       | Free usage has a hard credit limit; the site can pause when it is exhausted.                |
| Database and administrator login | Supabase Free                                                      | 500 MB database; projects can pause after a week of inactivity.                             |
| Salon photographs                | Supabase Storage                                                   | Free storage is limited; upload resized photos and periodically remove unused objects.      |
| Website address                  | Included Netlify subdomain                                         | No purchased domain required.                                                               |
| Booking confirmation             | Administrator confirms in dashboard; manual phone/WhatsApp contact | No paid messaging or payment service required. The app does not send booking notifications. |
| First admin account              | Supabase dashboard user + local profile provisioning               | Avoid relying on SMTP for the first login.                                                  |
| Backups                          | Manual database export and separate image copies                   | Free Supabase does not include automatic database backups. Store exports privately.         |

Free hosting is suitable for a small initial launch within quotas. It does not guarantee uninterrupted service or unlimited traffic. Review the provider dashboards regularly. Keep both accounts on their Free plans; do not enable paid upgrades or auto recharge. No artificial keep-alive traffic is part of this plan.

Vercel Hobby is not the suggested salon host: its terms restrict that plan to personal, non-commercial use. A salon selling services is commercial.

Provider references (check them again immediately before launch):

- https://www.netlify.com/blog/introducing-netlify-free-plan/ — commercial projects permitted.
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ — current Free credit limits and hard cap.
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ — Next.js runtime support.
- https://supabase.com/pricing — database, storage, egress, inactivity and backup limits.
- https://vercel.com/docs/limits/fair-use-guidelines — Hobby commercial-use restriction.

## Step 1: Complete and verify locally

Install Node.js 24, open PowerShell in this repository and run:

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:db
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Use `npm.cmd run dev` for local browsing. `/admin/preview` shows the administration design with explicitly fictional data in development only. `/admin/login` is the real login. Production deliberately hides the preview.

The single-administrator migration promotes every existing application account to the same full administrator access. Review the account list before applying it to any database that already contains users. Login remains mandatory. Inactive accounts remain inactive. Scheduling staff and equipment are resources, not permission levels. A fixed legacy `owner` value remains internally for compatibility with existing SQL functions; there is no role selector and no lower-permission admin account.

## Step 2: Create the free Supabase project

1. Create a Supabase account and a Free organization/project. Choose a nearby available region and a strong database password. Save the password privately.
2. In project settings, copy the project URL, publishable key and server secret into `.env.local`. Never put the server secret in a `NEXT_PUBLIC_` variable.
3. From the project's Connect dialog, copy a suitable PostgreSQL migration connection into `DATABASE_URL`. If your network does not support the direct IPv6 connection, use the provided session pooler connection. Use the provider's exact connection format and encode special password characters correctly.
4. Run `npm.cmd run db:migrate`. Apply all migrations through the runner, including the single-admin and reschedule-expiry migrations. The runner checks applied-file checksums; do not edit previously applied migration files.
5. Disable public signup in Supabase Auth. Customers book as guests; only administrators need Auth accounts.

## Step 3: Create the first administrator without a paid mail service

In Supabase **Authentication → Users**, manually add the administrator's email and a strong password, with email confirmed. Copy that user's UUID. Then run locally:

```powershell
npm.cmd run owner:create -- --user-id YOUR_AUTH_USER_UUID
```

Enter the display name when prompted. The command verifies that the Auth user exists and is email-confirmed, then creates its application profile. It does not print, store or seed a password. Sign in at `/admin/login` using the credentials you entered in Supabase.

The historical `owner:create` command name is retained for compatibility; it now bootstraps the first equal administrator. Later accounts can be invited from the dashboard. Invitations and password-recovery emails require a working SMTP configuration. Supabase's default mail service restricts recipients to project team members and is not a production mail delivery service. Without SMTP, recovery must be handled by the project operator; do not advertise email recovery as verified.

Before relying on multiple administrator invitations, test failed invitations and retries. Auth invitation and profile creation are separate operations: a partial failure still requires the project operator to inspect and repair the Auth/profile state. The initial single-admin launch avoids that dependency by using the existing-user provisioning path above.

Reference: https://supabase.com/docs/guides/auth/auth-smtp

## Step 4: Publish the application on Netlify Free

1. Put this repository in a private Git repository under your account. Commit source, migrations, lockfile and `netlify.toml`; keep `.env.local` and all credentials ignored.
2. In Netlify, choose **Add new project → Import an existing project**, connect the repository and select the Free plan. If the Git repository contains the outer folder, set its base directory to `gelin_house_example`; if its root is already the application, leave the base directory empty.
3. Netlify should detect Next.js. This repository supplies `npm run build`, `.next` output and Node 24 in `netlify.toml`. Keep server rendering and route handlers enabled; do not export it as a static site.
4. Choose the free site name and note the final HTTPS origin, for example `https://gelin-house-example.netlify.app` (example only; availability is not guaranteed).
5. Set the environment variables below in Netlify's settings. Make the public Supabase values available during build as well as runtime. Keep the server secret private and restrict it to server/build configuration.
6. Deploy, inspect the build log and redeploy after changing any build-time public value.

| Variable                               | Value                                                         |
| -------------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your project's HTTPS URL                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your project's public/publishable key                         |
| `SUPABASE_SECRET_KEY`                  | Your private server secret                                    |
| `APP_URL`                              | The exact final Netlify HTTPS origin, without a trailing path |
| `TRUST_PROXY`                          | `netlify` on Netlify; uses its connection-IP header           |
| `AWS_LAMBDA_JS_RUNTIME`                | `nodejs24`, set through Netlify settings                      |

`DATABASE_URL` is only needed for local migration commands; the website does not need the database password. Do not add it to the browser or commit it.

In Supabase Auth URL settings, set the Site URL to the same production origin. Allow `https://YOUR-SITE.netlify.app/auth/callback`. Add the exact local callback separately when needed for development. The supplied callback handles invitation/recovery tokens and authorization codes; configure invitation and recovery templates as described in DEPLOYMENT.md. Test them before relying on email access management.

Netlify's server functions limit binary upload payloads after encoding. This app caps source photographs at 4 MiB to leave space for multipart and encoding overhead. It re-encodes them to smaller WebP files before Storage upload. Validate an actual upload on the deployed site. Reference: https://docs.netlify.com/build/functions/configuration/

Verify rate limits from different real clients after deployment. `TRUST_PROXY=netlify` trusts only Netlify's connection-IP header; use it only behind Netlify. If the runtime does not forward that header, requests fall into the shared `unknown` bucket until the ingress integration is corrected.

## Step 5: Fill the website through the dashboard

Use the same administrator account for every task; no role configuration is needed.

1. **Réglages du site**: salon name, logo, brand accent, home heading, introduction, phone, address, contact links, privacy text and booking policy.
2. **Catégories / Prestations**: approved real service descriptions, durations, buffers, pricing and photographs. Keep unfinished items unpublished.
3. **Prestataires / Équipements / Compétences**: actual scheduling capacity and which staff can perform each service. No staff login is required.
4. **Horaires / Horaires exceptionnels / Fermetures**: weekly hours, breaks, equipment availability, holidays and leave.
5. **Galerie / Textes du site / Offres**: owner-authorized photos, page copy and offers with eligible services.
6. **Réglages du site**: approve the configuration and enable booking only after testing available slots.

The visual direction is a calm French beauty house: warm ivory surfaces, muted rose accents, serif editorial headings, restrained decoration and clear booking actions. Administrator pages prioritize pending requests, calendar, customers and site content. Mobile navigation collapses into a labeled menu. Empty states remain honest until real salon material is provided. Generated or stock photos are not presented as the actual salon.

## Step 6: Acceptance before opening bookings

Use a disposable Supabase project for automated connected tests (`docs/TESTING.md`). Do not enable destructive test fixtures on the real salon database.

On the final deployment, manually verify:

- Public services and photographs on a phone and desktop; keyboard focus and menu operation.
- Real admin login, refresh, logout and denial of access after account deactivation.
- Multi-service quote, booking persistence, admin confirmation and calendar display.
- Two simultaneous requests for the same resource: only one must succeed.
- Private booking link, cancellation and rescheduling; review the correct appointment in two browser tabs.
- New appointment dates retain private access for 90 days after the revised end time.
- Upload and publication of a real permitted photograph below the size limit.
- Every active admin can manage settings/content/access; the final active administrator cannot be disabled.
- Request origin checks use the exact live domain; anonymous visitors cannot perform admin mutations.

Create a database export and copy required Storage objects before launch and before significant changes. A database dump does not include image file contents. Agree on who reviews pending requests daily, because pending requests keep capacity reserved and do not expire automatically.

## Scope after the first launch

The first launch can be 0 DH without payments, automatic messages or a purchased domain. Add only features the salon needs next: translated Arabic/RTL copy, notification delivery, pending-request expiration, stronger monitoring and scheduled backups. Each provider or integration needs its own cost and privacy review. Do not promise free automatic SMS or WhatsApp delivery.

## What still requires the salon/account owner

No Supabase project, hosting account or credentials are connected by this document. The account owner must create/connect the projects, supply approved business content, configure secrets privately and complete live acceptance. Local implementation and passing tests do not prove a live deployment.
