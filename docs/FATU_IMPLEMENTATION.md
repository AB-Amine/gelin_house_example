# Fatu Makeup Artist implementation

This document supersedes the former Gelin public-interface and demo instructions. The existing repository, SQL history and security mechanisms were retained. No deployment or live database migration was performed. Original provenance must be retained; the repository did not supply a license file at audit time.

## Phase 0 — audit

See [the repository audit](FATU_PHASE_0_AUDIT.md). Baseline verification: 18 unit/API tests and 28 PostgreSQL integration checks passed. The preceding development preview had unfinished browser failures; those were not represented as a production-ready result.

## Phase 1 — identity, assets and language foundation

Created `src/app/fatu.css`, `src/components/fatu-shell.tsx`, `locale-provider.tsx`, `fatu-photo.tsx`, `src/lib/i18n/*`, `public/images/manifest.json`, and `scripts/prepare-assets.mjs`. Updated root/public/admin layouts and navigation. The design uses ivory, champagne, espresso and muted gold, serif editorial headings, local photography, clear booking calls to action and separate public/admin/client layouts. French is the default; English and Arabic are available through a persistent cookie, server rendering and client updates. Arabic sets document direction and uses logical spacing. Dates and money use `Intl` rather than concatenated currency symbols.

Temporary photographs were individually inspected and downloaded from their licensed source, with source/author/license/localized alt text in the manifest. They are explicitly editorial placeholders, not Fatu's identity or work. Three WebP widths are generated locally with Sharp. Instagram imagery was not downloaded. Bold Beauty Lounge informed hierarchy only; Coco's direct site and Instagram could not be inspected successfully. No competitor assets or copy were reused.

## Phase 2 — public pages

Created/reworked `public-home.tsx`, `fatu-pages.tsx`, `fatu-contact.tsx`, `fatu-offers.tsx`, `fatu-policy.tsx`, `fatu-service-detail.tsx`, `catalog.tsx`, and the public route files. `/portfolio` provides categories, native modal image viewing, Escape/arrow controls and focus restoration for approved published photographs. `/galerie` remains an alias. Services support search, categories, details and a persistent validated selection. FAQ records use `website_content` keys beginning with `faq.`. Contact messages are saved to the private admin inbox; a disabled unconfigured form never reports successful delivery.

The public catalog calls `fatu_catalog()`. No DB connection returns an empty, honest onboarding state. It never substitutes browser demo bookings or imaginary services, prices, cities, reviews or contact details. Biography and qualifications remain awaiting Fatu's approval. Only verified, consented and published reviews are shown. Portfolio publication also requires consent and excludes temporary images.

## Phase 3 — city-aware booking

Created `fatu-booking.tsx`, `fatu-schemas.ts`, and migrations `010` onward; extended availability, quote and booking APIs. The flow covers services, compatible city, event address/details, date/time, contact/consent and a reviewed quote. City hours and service eligibility supplement global and artist/resource availability. Quotes include travel fees, currency and a full fingerprint. Prices, fees and city names are snapped into the appointment. Coded promotions do not apply automatically and have transactional usage limits.

The existing scheduling advisory lock `711042`, allocation exclusion constraint, immutable service price snapshots, rate limiting, origin checks and idempotency are retained. Contextual idempotency includes the city, address, code, contact, identity and quote; a retry cannot change ownership or location. Pending requests retain capacity until an administrator resolves them. A public request is never presented as confirmed. Legacy admin/guest rescheduling also validates city availability, and failed reschedules retain their old allocations.

## Phase 4 — administrator workspace

Added `fatu-admin-dashboard.tsx`, `fatu-admin-inbox.tsx`, `fatu-entity-manager.tsx`, `fatu-appointments.tsx` and backend routes/RPCs. Dashboard reporting separates booking value from net actual payment records, grouped by currency. Confirmed status never implies paid revenue. Manual payments/refunds are administrator records, not a payment gateway; over-refunds are rejected.

The booking table supports name/reference search and combined city, service, status, date and client-history filters. Client account profiles aggregate appointment counts and history without merging identities by phone/email; administrator client notes have a separate protected write and are excluded from the client profile projection.

Administrator navigation includes bookings, calendar, clients, services/categories, portfolio, consented reviews, offers/eligibility, content/FAQ/translations, cities/service-city rules/city hours, resources/qualifications/global hours/closures, change requests, messages, notification events, settings, access and audit history. Existing safe upload processing, appointment notes, erasure tooling and equal admin access remain. No owner/manager/staff distinction is exposed; all active admin accounts have equal access. Client users cannot provision admins.

The development-only `/admin/preview` uses `fatu-preview.tsx`. Its local content edits are labeled browser-only and do not alter the public site. Real reservations, payment records, authentication and notifications are not simulated. Production returns 404 for this route. Earlier Gelin preview modules remain as historical/reusable source but are no longer the active public/admin preview route.

## Phase 5 — private client portal

Added `/client` overview, bookings, profile, login, register, recovery and password routes, `client-dashboard.tsx`, `client-auth.tsx`, `src/lib/client-auth.ts` and client APIs. Supabase SSR validates users with `auth.getUser()`. Profile edits and verified email changes are separate. Session refresh covers client routes. Callbacks use an explicit redirect allowlist.

Clients see only their own safe booking projection, never arbitrary appointment table rows, internal notes, token hashes or other customers' data. Guests may book without an account and later link using their valid private management capability. Ownership is not inferred from an email address or phone number. Another account cannot take over an already-owned appointment. Client cancellation and reschedule requests preserve the current booking until admin approval; approval rechecks availability transactionally.

## Phase 6 — verification

Final local verification: 21 unit/API checks, 42 real PostgreSQL checks, the production build/TypeScript, full-project lint, 21 production browser checks and 9 development browser checks pass. Six provider-dependent checks are explicitly skipped. The database harness creates a disposable embedded PostgreSQL cluster, applies the migration history and exercises SQL functions/RLS under anonymous, authenticated-client and active/inactive-admin identities. It does not emulate a successful external Supabase Auth or Storage HTTP integration.

New checks cover Unicode/dictionary completeness, protected content translation, city/address validation, travel/currency snapshots, contextual retries, ownership isolation, guest linking, pending changes, concurrent promotion limits, actual receipts and refunds. Production browser and preview verification are recorded separately in [the validation record](FATU_VALIDATION.md).

## Phase 7 — operation and activation

Use [Fatu setup](FATU_SETUP.md) for local installation, migrations, first administrator, content onboarding, Auth/Storage and a zero-DH deployment strategy. The code can be inspected locally without credentials. Real saving requires a configured Supabase project and applied migrations. Public customer registration/password recovery/invitations need verified email delivery through a configured SMTP provider. Notification events are queued integration records; no booking emails, SMS or WhatsApp messages have been sent by this implementation.

Do not call this production-ready until the live Auth/Storage/email checks, approved business content, real ownership journeys and target-host checks have passed. No production credentials or customer data belong in version control or screenshots.
