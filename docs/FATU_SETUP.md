# Fatu local setup and zero-DH launch

## Local preview

Use Node.js 24 or newer. On this workspace a project-local runtime is available at `.tools/node_modules/node/bin/node.exe`; it is ignored and is not a deployable dependency.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:3000`. Keep `APP_URL` identical to the origin used in the browser (`localhost` and `127.0.0.1` are different origins). Without Supabase, public pages work with onboarding states, account/contact submission is disabled, and no booking success is fabricated. The explicitly labeled development dashboard is `/admin/preview`. Its editor changes remain in the browser and do not publish to the public site.

## Connect a development database

1. Create a separate Supabase Free project for development. Do not put real customer data in a test project.
2. Copy the project URL and publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Put the elevated server key in `SUPABASE_SECRET_KEY`. Never prefix the server key with `NEXT_PUBLIC_`.
3. Set `DATABASE_URL` to the project's PostgreSQL migration connection. This is a server/operator value, not browser configuration. Use the provider's appropriate direct/session connection settings for the machine's network.
4. Run `npm run db:migrate`. The migration runner records filenames/checksums and applies new migrations transactionally. Existing `001`–`009` files were not replaced by a new schema. Do not run a blanket reset on an existing project.
5. Create the first email-confirmed Auth user in the Supabase dashboard, then run `npm run owner:create -- --user-id AUTH_USER_UUID`. This retains the original provisioning command name for compatibility; the resulting account has the same permissions as every later active admin.
6. Restart the local server after changing environment values and sign in at `/admin/login`. Later access is managed at `/admin/team`; the last active administrator cannot be deactivated.

## Onboard approved business content

Use the dashboard to enter Fatu-approved biography, qualifications, services, prices/durations, contact information, cities, travel fees, hours and policies. No invented example is published as real content.

- Clients: search account profiles or guest booking contacts, view appointment counts/history and save private notes. Account ownership is established by verified sign-in/private capability, never by matching contact details. The booking table supports city/service/status/date/name/reference filters.
- Services/categories: save descriptions, included items, preparation, price model, duration, buffers, images and publication settings.
- Availability: create the artist as a staff resource, give that resource service qualifications, and configure both global and artist working hours. Add equipment only if the business needs it. Opening exceptions and closures remain available.
- Cities: activate approved cities, set travel fees in minor units (100 = 1 MAD), associate each service with its cities, and configure city hours. City availability supplements global/resource availability; it does not replace it.
- Portfolio: upload an authorized photo through the admin upload form, copy its generated `gallery/UUID.webp` path into its record, enter title/description/accessible text/category and an optional authorized HTTPS video link, set featured order, confirm consent and publish. Uploading does not publish automatically. Temporary stock must not be labeled as Fatu's work. `public/images/manifest.json` records the temporary assets' provenance.
- Reviews: only publish real, verified reviews with permission. No example review is seeded into the public website.
- Content: records with `faq.` keys supply FAQ questions/answers. `about.` records extend the about page. Public-home copy can be overridden with its semantic dictionary key and approved text. The homepage photo/title/subtitle and biography also have settings fields.
- Translations: identity/policy settings use entity `salon_settings` and fixed ID `00000000-0000-4000-8000-000000000001`; translate `about`, `hero_title`, `hero_subtitle`, `privacy_text`, `policy_text`, `deposit_policy` and `address` there. Portfolio and reviews support translated text too. For other content, create a record for the entity's UUID and `fr`, `en` or `ar`, containing a JSON object of translated text fields, for example `{"name":"…","description":"…"}`. Publish only artist-approved translations. Translation content cannot override prices, IDs, publication flags or ownership. Site interface strings are in `src/lib/i18n/dictionaries.ts`.
- Promotions: an empty code is an automatic offer; coded offers are applied only during an explicit reviewed quote. Associate eligible services and set dates/limits. The most favorable applicable reduction is used; offers do not stack.
- Settings: review privacy, booking/cancellation/rescheduling/deposit terms, contact details, timezone (default Casablanca) and currency (default MAD), approve the information, then enable booking. Requests remain pending until an admin confirms.

Changing city hours/eligibility or timezone cannot silently invalidate active future appointments. Resolve affected appointments first. Existing bookings retain their recorded prices and travel fees after price edits.

## Auth, Storage and communications

Set Supabase Auth Site URL and redirect allowlist for the exact local and eventual production origins. The supported application callback is `/auth/callback`; client destinations are allowlisted. Configure the verification/invitation/recovery templates to deliver Supabase PKCE/OTP links to this callback, with the appropriate client/admin destination. Keep email confirmation enabled and secure email change confirmation enabled for public clients. Test both old and new email confirmation messages before launch.

Supabase's default SMTP is restricted to authorized project-team addresses and is not intended for production customer mail. Configure a verified SMTP sender/provider before enabling general customer account activation, invitations or password recovery. Provider setup, verification and free quotas are external requirements; the site never claims delivery merely because a UI button was clicked. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

The `salon-images` public bucket contains authorized website media only. Never upload customer documents, private images or secrets there. Uploads pass admin authorization, real image decoding, size/dimension limits and WebP re-encoding. Direct anonymous/client uploads remain denied.

The notification outbox stores real booking/change/status events. It is a provider integration boundary, not a delivery service. A separately configured server worker must deliver approved templates and mark records sent only after provider acknowledgement, with retry/idempotency controls. Until that integration is installed and verified, review the dashboard and contact clients manually using verified details. Do not treat queued events as sent. There is no paid payment gateway: payment records describe real receipts/refunds entered by the admin.

## Zero-DH hosting strategy

For this codebase, **Supabase Free is the best fit**: its PostgreSQL transactions, RLS, Auth and Storage match the existing architecture. Splitting across a free SQL database plus unrelated Auth/Storage services would require additional integration and security work.

Use **Netlify Free** for the Next.js app and its included `*.netlify.app` address, with **Supabase Free** for data/Auth/images. Keep accounts on Free, avoid paid addons and leave auto recharge disabled. No domain purchase is required. Initial booking operation can use manual client follow-up and the guest flow; public customer email activation still needs an approved SMTP setup.

As checked on 11 November 2026, [Supabase Free](https://supabase.com/pricing) includes a 500 MB database and 1 GB file storage, with two active Free projects; low-activity projects can pause after a week. [Netlify Free](https://www.netlify.com/pricing/) has a 300-credit monthly hard limit and pauses sites when limits are reached. Free is therefore a quota-limited launch option, not a guarantee of uninterrupted hosting. Monitor usage and keep private manual backups of database records and image originals. Do not generate artificial traffic to avoid inactivity policies.

When explicitly ready to publish:

1. Create a separate production Supabase project, migrate it and provision the first admin. Enter approved content and test with non-customer fixture records.
2. Connect this repository to Netlify, select Free, use Node 24, `npm run build` and the Next.js runtime (`netlify.toml` is included).
3. Set the public Supabase URL/key and server-only secret in the host's environment configuration. Set `APP_URL` to the exact HTTPS site origin and `TRUST_PROXY=netlify` only behind Netlify's trusted ingress. Do not expose `DATABASE_URL` to browser code or deploy logs.
4. Configure Auth Site URL/redirects and verified SMTP for that origin; confirm uploads, invitation/recovery/verification, RLS, receipt totals, booking contention, client ownership and Arabic layouts on the actual host.
5. Verify hosting limits, backups, approved policies/content and notification handling. Publish only after this review. No deployment was performed as part of this implementation.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm run test:e2e
```

Development preview browser checks use `npx playwright test --config=playwright.preview.config.ts`. Real Supabase browser journeys require `E2E_DATABASE_ISOLATED=true`, separate test admin credentials and all test-project connection values. Never set that flag for the business's real database. The fixtures are explicitly named `TEST-*` and may be retained for diagnosis; reset only the disposable test project afterward.
