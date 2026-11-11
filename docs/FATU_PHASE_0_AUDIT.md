# FATU MAKEUP ARTIST — Phase 0 technical audit

Date: 11 November 2026. Scope: transform the existing repository in place into the public website, administration and client portal specified in the supplied Fatu brief. No deployment is authorized.

## Repository and license

The correct repository is already present at `D:/gelin house/gelin_house_example`, with the requested GitHub origin. No LICENSE/LICENCE file was found in the checkout or the public repository file listing. Preserve provenance and existing notices; do not represent the repository as MIT-licensed or redistribute third-party assets without a license. The user has instructed modifications to this checkout; the audit does not grant a new redistribution license.

There are substantial uncommitted changes from the previous local UI work. They must be preserved or adapted deliberately, not overwritten with a new starter. The most recent interactive preview work is unfinished: its six browser scenarios failed on navigation/cold compilation timeouts, and has not passed a final build. Earlier successful checks do not certify the current working tree.

## Existing architecture

Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4/global CSS, Supabase PostgreSQL/Auth/Storage, Zod, React Hook Form, Temporal, Sharp, Vitest and Playwright. Node 24 is required and available as ignored project-local tooling. Keep this architecture. No technical reason supports a Vite rewrite.

Public pages live under `src/app/(public)`, protected administration under `src/app/admin/(protected)`, HTTP routes under `src/app/api`, shared contracts and access helpers under `src/lib`, and SQL migrations under `supabase/migrations`. The application uses request-scoped catalog caching and dynamic public rendering. No hosted Supabase credentials are configured in this workspace.

## Booking and database strengths to preserve

Nine migrations define catalog/content, resources/qualifications, split hours/date overrides/closures, customer records, appointments/items/allocations/history, discounts, audit logs, rate limits and access management. Migration 008 provides equal administrator permissions, preserving inactive accounts; 009 corrects guest capability expiry after rescheduling.

The real booking path uses authoritative PostgreSQL planning, shared transaction locking, independent GiST overlap exclusion, idempotency, quote fingerprints, immutable price/duration snapshots, status/history transactions and rollback-safe rescheduling. Pending requests remain pending until an administrator acts and reserve capacity. Money uses integer MAD centimes. Timestamps are timezone-aware. These mechanisms should be extended, not replaced by browser availability calculations.

## Authentication and security

Administrator access requires Supabase `auth.getUser()` plus an active administrator profile. API mutations validate origin and inputs; public booking functions are service-role-only. Anonymous table access is revoked, RLS restricts private records, uploads are decoded/re-encoded with size/pixel limits, and privileged keys are server-only. Guest management uses hashed 256-bit tokens, HttpOnly scoped cookies and explicit displayed-booking ID checks.

There is no client registration/login, client profile model, account ownership binding or client portal. Adding clients must not grant administrator access or expose administrator notes/token hashes. Prefer narrow client RPC projections and explicit ownership checks rather than broad client SELECT policies on operational tables.

A previous local demo stores fictional content and simulated reservations in browser storage. It is not a database and must not be presented as successful appointment persistence. Under the new brief, real booking submission must remain unavailable without Supabase; development previews may show labeled sample data but must never impersonate backend success.

## Required gaps

- Fatu identity, original editorial makeup-focused design, approved business content and licensed photography manifest.
- French/English/Arabic dictionaries throughout navigation, forms, statuses, errors and dashboards; real RTL and locale-aware date/number formatting.
- Cities, service/city compatibility, city hours, event address/details and transactional travel-fee/currency snapshots.
- Client accounts, verified ownership, guest-to-account claiming, profile updates and cancellation/rescheduling requests.
- Portfolio categories, titles/descriptions, featured ordering, multilingual content and video links.
- Database-backed FAQ, reviews with moderation/consent, contact inbox, promotion codes/usage limits, notification outbox and payment records.
- Admin booking/client/location/portfolio/review/promotion routes and useful analytics that distinguish paid receipts from appointment value.
- Broader database/security/localization/tablet/browser tests and current operational documentation.

## Reference and content findings

The official Instagram URL could not be fetched by the browsing tool; no restriction was bypassed and no Instagram photo was downloaded. Coco Beauty Bar was also unavailable through the initial direct fetch. Bold Beauty Lounge was accessible and illustrates strong introductory hierarchy, visible booking navigation, service discovery, social proof and FAQ placement. Its immediate-confirmation language is incompatible with Fatu's pending-approval requirement and must not be reused. No competitor copy, logo, image or exact layout will be copied.

Use individually selected, licensed temporary stock photographs as editorial placeholders, explicitly identified in the asset manifest and image management. They must not imply that Fatu created the depicted work or that a stock model is Fatu. Do not fabricate reviews, credentials, contact details, service prices, cities, fees or policies.

## Controlled implementation phases

1. Brand/i18n foundations and three experience shells, with honest no-database onboarding.
2. Public pages, individually licensed photography, portfolio filtering/detail, contact/FAQ and language coverage.
3. Extend the existing transactional engine with cities, address, travel/currency snapshots and promotion context; preserve legacy booking behavior.
4. Extend administrator CMS, booking filters, moderation, locations, payment records, inbox/outbox and reporting.
5. Add client Auth/profile/ownership/portal and guest claiming with backend authorization.
6. Run baseline and new unit/database/security/browser/localization checks; review desktop/tablet/mobile and Arabic direction; fix failures.
7. Update installation, environment, migration, provisioning, Storage, testing and deployment documentation; report external activation requirements honestly.

Use new migrations for schema changes. Keep existing route aliases and historical status/price data. Preserve one equal admin level, with client access as a separate private customer experience. Keep preview data isolated from production and never fabricate database success.

## Baseline verification at audit time

Previously recorded stable base: 18 unit/API checks, 28 real PostgreSQL checks, production build, lint and production browser checks passed before the most recent preview changes. Current preview suite: six failures observed, involving navigation and first-time route compilation timeouts; these are outstanding, not passing. A fresh unit/TypeScript baseline and lint run are being collected. Live Supabase Auth/Storage/SMTP tests remain unverified and require a separate migrated development project.

## External activation requirements

A development Supabase project, secrets configured privately, administrator identity, SMTP/email verification URLs, real business catalog/cities/hours/fees/policies, approved biography and authorized Fatu portfolio images remain necessary. No payment gateway, message delivery or deployment may be claimed operational without its provider and verification. The interface and explicitly marked development previews must remain inspectable without production credentials.
