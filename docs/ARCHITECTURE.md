# Implemented architecture

## Runtime boundaries

One Next.js App Router application serves the public website and `/admin`.
PostgreSQL is the sole authoritative booking store. Supabase provides the hosted
database, staff authentication and image storage. Customers have no accounts.
The code targets a Node.js deployment such as Vercel; no deployment was made.

`src/app/(public)` contains public routes. `src/app/admin/(protected)` uses a
server-validated staff layout, and every protected page/operation repeats its
own authorization. API mutations verify the request origin and validate inputs.
`src/components` contains interactive forms, basket, catalog and management UI.
`src/lib` contains shared domain types, validation, time/money utilities, server
Supabase clients, authentication, HTTP safety and administrator entity schemas.
`supabase/migrations` contains the database schema, restricted functions and RLS.
`scripts` contains migration/provisioning and disposable database verification.

## Public data and booking

The public catalog is returned by one restricted `public_catalog()` projection.
Unpublished/archived catalog records and private operational data are not exposed.
Only approved salon settings appear publicly. No service/menu/pricing sample is
seeded. The gallery uses authorized, admin-uploaded photos or explicit placeholders.

A `useSyncExternalStore` basket persists unique service identifiers in browser
storage and synchronizes between tabs. It is never authoritative for money or
capacity. Checkout validates the selection against the current catalog and asks
the server for current slots and a quote. The booking transaction recomputes all
values and requires the reviewed quote fingerprint to match.

One restricted transaction function creates the customer, appointment, immutable
item snapshots, resource allocations, history and idempotency result. A salon-wide
transaction lock coordinates all booking and scheduling writers at this business
scale. A GiST exclusion constraint independently prevents overlapping active
allocations. Staff and physical equipment share this capacity mechanism.

Rescheduling is transactional, preserves historical financial/duration snapshots,
records the old schedule, and keeps the old slot if the change fails. Config edits
are validated against future active appointments. Safe schedule extensions are
allowed; conflicting edits roll back and identify affected booking references.
Weekly split shifts and date-specific opening overrides support breaks and
exceptional hours. Closures apply to the whole salon or one resource.

## Authentication, authorization and guest access

Supabase SSR cookies and `auth.getUser()` validate staff sessions. The proxy
refreshes sessions on admin/auth routes, but server operations remain the actual
permission boundary. Roles are owner, manager and staff. The owner alone manages
settings, staff-account access and customer anonymization. Managers manage normal
operations/content. Staff can read assigned appointments and associated customer
records and mark in-progress, completed or no-show statuses only on those
appointments. A staff resource can be linked to one admin identity. RLS enforces
this scope on appointments, items, allocations, customer records and history.

The calendar provides day, week, month and list views with navigation, search,
provider filtering and closure indicators. Appointment details show snapshot
pricing, discounts, provider assignments, timestamps and private salon notes.
Owners/managers edit notes through an audited restricted function; guest responses
never include them. The dashboard shows upcoming arrivals and today's booked value.

Authenticated clients have read grants under RLS and execute grants on restricted
admin functions; they cannot directly mutate application tables. Anonymous clients
can execute the published catalog projection only. Public booking engine functions
are revoked from anonymous/authenticated roles and called by narrowly scoped
server routes using the server secret. The secret is never imported into a client
component. Function search paths are fixed; table/function grants are explicit.

Guest links contain a 256-bit cryptographic token in the fragment. The page removes
it from the address bar and exchanges it for a scoped HttpOnly cookie. PostgreSQL
stores only its SHA-256 hash. A stored hash cannot substitute for the raw cookie
secret. Every management operation checks the token and configured policy again.
Links expire 90 days after the appointment end; anonymization revokes them early.
References alone reveal no appointment. Private pages/API responses are no-store
and noindex with a no-referrer policy.

## Abuse, assets, configuration and caching

Public APIs and login/recovery use PostgreSQL-backed rate buckets. A trusted
forwarded-IP configuration is explicit; otherwise limits share a safe global
bucket per operation. Requests have streamed size limits, uploads have actual
image decoding/dimension/size validation, and images are re-encoded with Sharp.
Public Storage objects are shareable and must never contain confidential material.
Client uploads have no unrestricted bucket permission.

Public pages are dynamically rendered; React request-scoped caching deduplicates
catalog reads within a render. There is no persistent content cache to invalidate.
Private data and availability are uncached. Admin lists are paginated or capped
with explicit limits, and reporting uses database aggregates and date ranges.

Credentials use `.env.local` or deployment secret settings. Business configuration
lives in PostgreSQL and starts unapproved with booking disabled. Notifications,
payment processing and monitoring providers are not integrated. Supabase email
handles staff invitations/recovery when its provider is configured and verified.

## Presentation and localization

The neutral ivory/taupe/rose visual system uses local system fonts, semantic HTML,
visible focus, mobile layouts and reduced-motion support. No remote or generated
salon imagery is used. The owner can upload branding, edit text and select a
controlled accent palette. Public metadata derives from approved configuration.

French is implemented. Translation storage is available in `translations` and
layouts explicitly declare language/direction. Full UI dictionaries, Arabic/RTL
presentation and English remain future work; they are not exposed as working
language switches.

## Technical references

- https://nextjs.org/docs/app/getting-started/project-structure
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://www.postgresql.org/docs/current/rangetypes.html
- https://www.postgresql.org/docs/current/functions-binarystring.html

The lockfile captures installed versions. TypeScript is pinned to 6.0.3 for the
Next.js lint parser's supported range. ESLint 9 is retained for plugin peer
compatibility. The minimatch override selects the patched development dependency.
See TESTING.md for actual verification and external integration limits.
