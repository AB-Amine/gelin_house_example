# GELIN HOUSE — À propos, portfolio and visual offers

The À propos page now contains a welcome hero, the real saved salon introduction, four published-category links, a concise philosophy section, an editorial salon gallery, approved testimonials when available, and a reservation action. It uses the existing cream, champagne and brown palette. No history, qualifications, awards or statistics were invented.

`src/components/fatu-about.tsx` contains the page. The philosophy texts supplied in the brief were inserted into the existing `website_content` table under `about.philosophy.listen`, `about.philosophy.beauty` and `about.philosophy.wellbeing`, without replacing existing keys. Edit these through the existing Site web content editor. The introduction remains controlled by `salon_settings.about`.

## Portfolio and sources

The portfolio has a responsive masonry layout, album filters, accessible image enlargement, arrow navigation, Escape to close, restored focus, original-post links and a reservation action. It displays only the existing published, consent-confirmed, non-temporary Supabase gallery records.

At the owner's explicit request, ten selected publicly visible photos from [GELIN HOUSE](https://www.instagram.com/gelin_house/) and [the salon's makeup account](https://www.instagram.com/fatu_makeupartist/) were imported through the existing authenticated upload and gallery APIs. The accounts match the salon's identity and telephone. The photos cover the salon, hair, nails and makeup. [INSTAGRAM_PHOTO_SOURCES.json](INSTAGRAM_PHOTO_SOURCES.json) records source posts and file hashes. These are owner-provided photographs, not stock photos licensed by Instagram; original rights remain with their owners.

Only normal public profile and post pages were accessed, without Instagram login or bypassing restrictions. Public previews were 360–480 pixels wide; no larger original sets were exposed by the inspected public pages. The existing upload API converted them to WebP without enlargement. High-resolution originals would improve fullscreen sharpness. Supabase Storage serves the copies, avoiding expiring Instagram CDN URLs, external embeds and visitor login requirements. Existing images and records were preserved. The photos remain editable, removable and unpublishable through the existing admin.

`scripts/import-instagram-gallery.mjs` requires explicit authorization and administrator credentials through environment variables. It skips previously imported source URLs. Temporary downloads remain under the ignored `.tools` directory. Credentials are not stored in source, and no customer, appointment, account or scheduling data was changed.

## Offers

Offer cards first use a saved eligible-service image, then a matching published salon photo. Otherwise they use a relevant, visibly labelled illustrative Pexels photo from the existing optimized library. See [stock-photo credits and licences](../public/images/premium/CREDITS.md).

When more than three offers are published, every offer remains in a swipeable carousel with previous/next controls and keyboard scrolling. It never rotates automatically. Both the homepage and offers page use this behavior. Three or fewer retain the grid. Validity dates, upcoming labels, conditions, eligibility and pricing protections are preserved.

## Testimonials

Only approved, verified, consent-confirmed reviews from the public catalogue appear as real testimonials. None existed during this update. The development server demonstrates three clearly labelled fictional examples with a prominent notice and an example label on every card. They are never inserted into Supabase and are excluded from production. Genuine approved reviews replace them automatically.

## Verification

The isolated browser fixture uses labelled TEST photos, offers and content, never imported into the business database. Checks cover category links, editable content overrides, gallery priority, image decoding, exclusion of fictional production reviews, portfolio filters and focus restoration, and four-offer carousel navigation at 375, 768 and 1440 pixels. Existing catalogue, basket, request and contact checks are retained.

The actual imported images were decoded in a network-enabled browser. Restricted-shell previews cannot fetch remote Supabase images; that is an execution sandbox restriction. Source sharpness remains limited to the available Instagram previews. No commit, push or deployment was performed.

Main implementation files: `src/components/fatu-about.tsx`, `fatu-pages.tsx`, `fatu-offers.tsx`, `salon-testimonials.tsx`, `src/app/salon-editorial.css`, the root stylesheet import, and the French/English/Arabic dictionary. The import helper, source manifest and browser fixtures document and verify the changes. No booking, authentication, authorization or database-schema file was modified for this update.

Browser verification: all 30 distinct catalogue/public scenarios passed across the three widths after correcting carousel-test expectations for multiple mobile swipes and the browser's three-pixel scroll-snap padding. The six focused editorial scenarios were rerun successfully. Nine additional connected page checks decoded every actual Supabase image, confirmed no horizontal overflow and found no client errors across À propos, portfolio and offers at all three widths. The four-offer carousel was tested only with isolated fixtures because the real salon currently has one public offer.

Final TypeScript, ESLint, 32 unit/API tests and production build passed. The ordinary Supabase build was restored after the fixture build. Safari, Firefox and physical devices were not tested.

Homepage follow-up: offer cards now use a compact presentation with a smaller image, reduction, name, validity dates and a link to the complete offers page. A single desktop card measured 244 pixels high; the full offers page retains its detailed presentation. Clearly labelled development-only testimonial examples are also shown on the homepage when no approved reviews exist. Mobile and desktop checks, TypeScript, lint and the production build passed for this follow-up.
