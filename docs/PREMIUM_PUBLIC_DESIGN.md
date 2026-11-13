# GELIN HOUSE — public website redesign

The public website uses a cream, champagne and espresso palette, responsive photo cards, readable forms and a compact navigation with a visible **Offres** link. All new design rules are scoped to `.fatu-public`; the admin screens and diary operations were preserved.

## Content and administration

| Public content | Existing admin source |
| --- | --- |
| Salon name, contacts, address | Mon salon → Informations |
| Hero title, subtitle, photo and introduction | Mon salon → Site web |
| Categories, descriptions, photos and service prices | Prestations |
| Homepage service highlights | Services marked as featured |
| Portfolio and homepage gallery preview | Published gallery photos with consent, excluding temporary photos |
| Customer feedback | Published, verified reviews with consent |
| Opening hours | Mon salon → Horaires |
| Offer name, reduction, validity, conditions and eligibility | Offres |

The homepage highlights the four official category records by their existing slugs. Additional owner-created categories and services remain in the searchable catalogue. Category photos saved in Supabase take precedence over illustrative stock photos. The 67 official services were preserved, along with the owner's additions.

If no service is marked as featured, no fabricated featured service is inserted. With no approved gallery images, the portfolio displays a short empty state. With no approved reviews, the homepage displays useful salon values instead. With no current offer, the offers section links to the service menu without inventing a discount.

## Offers and synchronization

`fatu_catalog` remains the source of public data. Migration 026 enables public announcements of future offers. Inactive, expired, code-only and exhausted offers remain hidden. Upcoming enabled offers show **À venir**, the advertised reduction, eligible services, and separate start/end dates with salon-local times. Their discounts do not apply before the real start instant. Current offers appear first, followed by upcoming offers ordered by start time. The homepage shows up to three cards; `/offres` shows all eligible announcements.

The public loader filters activation and expiry against one server timestamp. That timestamp travels with the catalogue so price rendering does not compare different server and browser clocks during hydration. Offer dates and times are converted to salon-local values on the server and serialized for consistent browser formatting. A future announcement never changes the existing pricing or booking validation rules.

Public catalogue requests use `cache: 'no-store'` and public routes are dynamic. Saved changes appear on a fresh page load or navigation; an already-open page is not a live subscription. No new database table, authentication mechanism or dependency was added. Migration 026 only changes the existing public catalogue function's announcement visibility.

Home and `/offres` show the real reduction, dates, conditions and eligible services. Service cards use the existing best eligible promotion calculation. Unknown prices remain **Prix sur demande**; no reduced amount is calculated for an unknown price. Existing basket limits, storage and request submission behavior are unchanged.

## Photography

See [photo credits](../public/images/premium/CREDITS.md) and the adjacent JSON manifest. Local 320, 720 and 1400 pixel WebP variants avoid third-party image requests. Hero imagery loads eagerly; other photography loads lazily. Stock photos are visibly labelled as inspiration, and the interior explicitly says it is not the salon's premises. Stock imagery is never substituted for genuine published work in the portfolio.

## Verification

Browser checks run against an isolated read-only catalogue fixture at 375, 768 and 1440 pixels. Test offers, photos and contact details in that fixture are explicitly labelled TEST and never imported into Supabase. Coverage includes category filtering/search, basket persistence, two-service requests, failed-submission recovery, active/expired/inactive/future offers, discounted eligible cards, contact submission, gallery enlargement and keyboard focus restoration, photo decoding and horizontal overflow.

`scripts/verify-public-offers.mjs` is an explicit opt-in connected check. It uses the authorized admin session to save, activate and expire a uniquely labelled temporary offer, then removes only that offer and its eligibility. It does not create appointments, change real prices, or alter customer records. Credentials are supplied through environment variables and are never written into source.

Reduced-motion preferences disable the new animations. Scroll reveals progressively enhance already-visible content, so JavaScript or observer failures cannot hide sections. Buttons and inputs have visible keyboard focus styles. Browser coverage uses Chromium, including a mobile touch viewport; physical devices, Safari and Firefox were not tested.

Verified results: 24 browser scenarios passed across the three viewports, including a browser clock deliberately set to 2101 while the server retained its actual date. The footer year and promotion prices use the server snapshot without hydration errors. The 31 unit/API checks passed. The connected offer activation/expiry check passed and its temporary record was removed. The real catalogue currently has no fixed-price public service, so the reduced-price calculation was checked with isolated TEST services rather than changing a business price. There were no active real promotions, approved portfolio photos or approved reviews during verification; those honest public empty states were inspected separately on the connected site.

Final TypeScript, ESLint and production build checks passed. The ordinary `.env.local` build was restored after the fixture build. No commit, push or deployment was performed.

Upcoming-offer follow-up: migration 026 was applied to the connected Supabase project. The owner's existing future offer was verified visibly on both `/` and `/offres` without editing its dates, reduction or service links. Six focused browser scenarios passed at 375/768/1440 pixels, including future-offer announcements and unchanged full prices before activation. All 32 unit/API checks passed, including the exact start and expiry boundaries. The real card was visually inspected on desktop and mobile; no horizontal overflow was observed.
