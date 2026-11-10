# Implementation report — 10 November 2026

## Result

The application has been implemented in `E:\exemplaire_gelin_house`, including
the public website, booking engine, private administration, database migrations,
test tooling and operational documentation. The final local checks pass.

**This is not a verified production deployment.** No real Supabase project,
business catalog, owner identity or hosting account was provided. Consequently,
the application starts in a safe unconfigured state and does not accept real
appointments. No real credentials or invented salon information were added.

## Delivered functionality

- French responsive homepage, catalog/search/category navigation, service details,
  offers, gallery, salon presentation, contact and privacy/policy pages.
- Editable categories, service descriptions/photos, fixed/starting/consultation
  prices, durations, buffers, publication, featured status and archiving.
- Persistent multi-service selection with deduplication, removal, estimates and
  database revalidation; available slots, reviewed quotes, contact validation,
  consent, pending receipts and private management links.
- PostgreSQL sequential scheduling with staff qualifications, exclusive shared
  equipment, weekly split hours, date-specific overrides, closures/leave, booking
  windows and Casablanca timezone rules.
- Database transaction locking, independent overlap exclusion constraints,
  request idempotency, immutable financial/duration snapshots, status history,
  cancellation capacity release and transactional rescheduling rollback.
- Staff Supabase login/session/reset/logout code, owner provisioning and account
  invitations, role changes and last-owner protection. Staff appointment/customer
  access and operational mutations are restricted to assigned resources in RLS
  and server operations.
- Administration overview and upcoming arrivals; day/week/month/list calendar,
  provider filter, name/phone/reference search, closure indicators, appointment
  details, status actions, internal notes, manual booking and customer records.
- Percentage/fixed promotions with expiry, eligibility and no stacking; editable
  homepage/content/contact/branding, gallery upload/order/publication and settings.
- Customer privacy anonymization, private-link revocation, protected audit logs,
  real database reporting and explicit distinction between booked value and revenue.
- Seven SQL migrations, environment template, lockfile, type/lint/test/build
  commands, migration runner, owner invitation script and Windows-compatible guides.

## Final executed checks

| Check                               | Result                                                          |
| ----------------------------------- | --------------------------------------------------------------- |
| Strict TypeScript                   | Passed                                                          |
| ESLint                              | Passed; no warnings                                             |
| Next.js production build            | Passed                                                          |
| Unit tests                          | 13 passed in 2 files                                            |
| Real PostgreSQL integration checks  | 26 passed                                                       |
| Desktop/mobile Playwright checks    | 14 passed                                                       |
| Connected Supabase browser tests    | 4 skipped: project and owner credentials absent                 |
| npm dependency audit                | 0 known vulnerabilities reported for the locked dependency tree |
| Desktop/mobile homepage screenshots | Generated and visually reviewed                                 |

The SQL tests apply all migrations to an isolated PostgreSQL 18 instance and
exercise actual transactions, grants, RLS, exclusion constraints and competing
connections. Minimal Supabase `auth`/`storage` compatibility fixtures are used for
schema dependencies. These are not proof that live Supabase Auth, PostgREST,
SMTP or Storage work with the chosen project's settings.

Concurrency evidence includes two simultaneous requests for the same resource:
exactly one commits. Other checks verify idempotent retries, reschedule rollback,
immutable prices, promotion expiry, closure conflicts, safe schedule additions,
affected references, manual capacity, archive behavior, role scope, internal-note
privacy and anonymization. Browser checks verify actual rendered navigation,
storage behavior and server rejection of unauthorized/origin-invalid operations.

Early tooling and test issues were corrected before these results: incompatible
compiler/lint versions, a vulnerable development dependency, ambiguous browser
selectors, stale test-server reuse and mismatched local origins. The final checks
above have no known outstanding failures.

## Unconfigured and unverified launch requirements

1. Create a salon Supabase project and fill `.env.local`/hosting secrets privately.
   Apply migrations and configure Auth URLs, disabled public signup, SMTP and
   invitation/recovery templates.
2. Run the owner provisioning command and verify invitation acceptance, password
   setup, login, refresh, expiry, recovery and logout against live Supabase.
3. Configure approved salon identity, contact information, real services/prices,
   staff/qualifications/resources, hours, policies, privacy text and authorized
   photography through administration. Directory-derived details remain unconfirmed.
4. Verify Storage uploads, public reads and intended publication/removal behavior
   against the real project. Public bucket objects must contain no private files.
5. Run connected end-to-end tests on a disposable configured Supabase project,
   including public booking, database persistence, admin confirmation, editing,
   offers, calendar modes, guest cancellation and logout protection.
6. Deploy to the selected Next.js host, configure the HTTPS domain/origin and
   trusted proxy behavior, then verify the live booking and authorization flows.
7. Complete owner acceptance, populated mobile/keyboard/screen-reader reviews,
   backups/restore testing, retention procedures and an appropriate privacy/legal
   review before collecting real customer data. No regulatory compliance or WCAG
   certification is claimed.

The complete connected journey and authentication smoke tests are included, but
were deliberately skipped rather than run against invented credentials or a fake
backend. Populated administration and the new calendar modes have not received a
live Supabase browser/visual acceptance review.

## Deliberate limits and unfinished optional integrations

No automatic booking email/SMS/WhatsApp delivery, reminder jobs, payment handling,
MFA interface, Arabic/English translation, advanced bundles, discount stacking,
quantity repeats, parallel service execution or in-place service-sequence editing
of existing bookings is implemented. Pending requests do not expire automatically.
These limits are explicit; no interface claims that those functions work.

Weekly/date-specific schedules are same-day intervals. Physical equipment uses
explicit exclusive units with configured hours. Archived/ineligible services must
be restored before a corresponding existing booking can be rescheduled through
the normal engine. Resource kinds with allocation history cannot be changed.

Phone verification is a manual salon procedure, not an OTP service. Supabase email
is used for staff invitations/recovery only. Removing a gallery entry hides it
from the website but does not delete the underlying image object; storage cleanup
is currently an operator task. Database-generated Supabase TypeScript types have
not been produced; shared strict domain contracts are maintained in source.

## Start, administer and deploy

```powershell
cd E:\exemplaire_gelin_house
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://127.0.0.1:3000`; private administration is `/admin/login`. Do not
overwrite an existing configured `.env.local` when following the copy example.
An unconfigured app is browseable but has no bookable business data or admin login.

After adding the actual project configuration:

```powershell
npm.cmd run db:migrate
npm.cmd run owner:create
```

The owner script prompts for name/email and invites the account without a seeded
password. Complete the invitation/password setup, then configure the salon and
enable booking. See [DEPLOYMENT.md](DEPLOYMENT.md) for exact external setup,
provisioning, production deployment, backups and monitoring, and
[ADMIN_GUIDE.md](ADMIN_GUIDE.md) for daily operation.
