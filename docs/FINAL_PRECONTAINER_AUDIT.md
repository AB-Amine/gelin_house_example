# GELIN HOUSE — Final UI polish and pre-containerization audit

Date: 14 November 2026. Scope: preserve the approved design, refine public motion, audit integrations safely, document packaging prerequisites. No containerization, deployment, Supabase migration, schema/RLS change or production write was performed. No commit or push was made.

## Executive status

The local app is suitable for **containerization planning**, not an unconditional production-launch approval. Public motion and ordinary JavaScript-enabled journeys are verified locally. One explicit no-JavaScript readability audit remains failing. Hosted authenticated writes, Auth delivery, Storage upload and real backup restore are not newly verified. Native 120% browser zoom remains a manual check; the automated check uses an equivalent CSS viewport/DPR.

## Baseline and reproducibility

Before edits: TypeScript passed; ordinary production build passed; 36 unit/API tests passed; ESLint had zero errors and one unused test-parameter warning. The old unconfigured browser run reported **15 failed, 6 passed, 6 skipped**. Failures came from obsolete Fatu text/selectors and a test-isolation issue: runtime clearing of public variables did not remove values already compiled into the build. Later full preview runs also exposed stale dashboard/date/calendar selectors. These were pre-existing expectations, not attributed to the motion changes.

Use Node.js 24+, the lockfile and `npm.cmd ci`. Tests and tooling are already in development dependencies; no dependency was added. Do not run `format` over the repository as an audit step.

| Command / check                            | Actual result                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run typecheck`                    | Passed at baseline and final check                                                                                                                                                            |
| `npm.cmd run lint`                         | Final: passed, zero errors and zero warnings (baseline had one warning)                                                                                                                       |
| `npm.cmd test`                             | 36 passed                                                                                                                                                                                     |
| `npm.cmd run test:db`                      | 68 passed in disposable local PostgreSQL                                                                                                                                                      |
| `npm.cmd run test:safe -- --timeout=20000` | 21 passed; 6 connected scenarios deliberately skipped                                                                                                                                         |
| Full admin preview suite                   | 30 passed after updating stale selectors                                                                                                                                                      |
| Full catalogue / audit suite               | **39 passed, 1 failed, 8 skipped**. The failed no-JavaScript probe is documented, not counted as success. Skips avoid repeating the explicit multi-width audits under tablet/mobile projects. |
| Ordinary `npm.cmd run build`               | Passed; ordinary build restored after fixture builds                                                                                                                                          |
| `npm.cmd audit --omit=dev --json`          | 0 reported production dependency vulnerabilities at execution time                                                                                                                            |
| Real public catalogue RPC                  | Read succeeded; snapshot below                                                                                                                                                                |
| Anonymous HEAD on three private tables     | HTTP 401 for each; no records downloaded                                                                                                                                                      |
| Real published image paths                 | 10 checked, 10 available                                                                                                                                                                      |

The SQL suite creates its own PostgreSQL cluster in a temporary directory on local port 55439 and loads the existing SQL test fixtures there. It does not use `DATABASE_URL`, modify the hosted salon database, or run the migration CLI against Supabase. Auth/Storage schemas inside this cluster are compatibility fixtures, not the hosted HTTP services.

`test:safe` overrides public configuration at **build time and runtime**, keeps its URL local and deliberately fails the existing public-key configuration validator, supplies no operational server secret and forces `E2E_DATABASE_ISOLATED` off. Existing connected `test:e2e` remains opt-in for a separately authorized disposable project. Catalogue browser tests use the HTTP fixture on local port 55445 and a production server on 3130. Preview tests use browser-only localStorage on the development server. After fixture builds, run the ordinary production build again.

## Architecture and features

- Next.js 16 App Router, React 19, TypeScript, CSS Modules and scoped public/admin styles. Images use Next Image or existing Storage mapping; no animation library was introduced.
- `src/app/(public)` has homepage, services/detail, offers, portfolio/gallery redirect, about, contact, FAQ, privacy and request/management pages. Root providers own localization and the browser basket.
- `src/app/admin/(protected)` verifies active administrators server-side. Main sections are dashboard, appointments, registered clients, services, offers and Mon salon. Mon salon has information, hours, photos, website and account tabs. Calendar visual/detailed modes coexist. Preview is development-only and production returns 404.
- `/client` has Supabase-backed login/register/recovery, profile, owned booking/request history and member benefits. Browser flags or localStorage do not establish identity.
- `src/app/api` has existing origin-checked handlers for requests, legacy availability/quotes/bookings/management, contact, admin mutations, uploads and customer operations. Shared validation is in `src/lib`; no API contract changed.
- `publicDb` uses the publishable identity and `no-store`; `sessionDb` uses cookies; `privileged` is server-only. Request-scoped catalogue caching is not a persistent published-content cache.
- Supabase PostgreSQL owns services/categories, promotions and associations, salon settings, hours/exceptions/closures, gallery, customer records, appointments/items/history, account profiles, audits and existing operational records. Auth owns sessions; Storage holds original public images. Local basket state is never authoritative for price, availability or permissions.

## Current booking workflow

Customers select up to ten published non-rental services, enter preferred date/start, name, valid phone and consent; email/notes remain optional. Public intake creates a **pending request**, not a guaranteed reserved treatment interval. Preferred times remain plain preferences. Admin confirmation reuses the request through existing diary transactions, validates the configured schedule and protects exact active starts. Cancellation retains records/history and frees the start according to existing rules. No invented durations, end times or resource assignments were added. Legacy interval bookings retain their original protections.

The manual form displays date-specific schedule guidance; the existing server remains authoritative. Both calendar presentations read the same hours, exceptions and closures; an out-of-hours existing appointment is warned about, never silently moved. Weekly public contact hours are not advertised as a complete date-exception planner.

## Integration audit

| Connection                                   | Evidence and limit                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin services/categories → public catalogue | SQL integration covers saved records, publication/archive gates, associations and public projection. Browser fixture covers grouping, search, prices on request, category filters and persistent baskets. No new live admin write was attempted.                                                    |
| Admin promotions → offers/home/prices        | SQL covers persistence, eligibility, expiry, member privacy, price snapshots and no stacking. Browser fixture distinguishes upcoming/active/expired/disabled cards and verifies that upcoming discounts do not apply early. Upcoming public cards can be labelled as upcoming under existing rules. |
| Mon salon → public identity/contact/text     | Existing field-scoped save path and uncached catalogue mapping inspected; SQL verifies text/hours projection; preview tests preserve unrelated settings. Hosted save was not repeated.                                                                                                              |
| Hours → calendar/manual/confirmation         | Shared display helper, server-local timestamps, exceptions and closure subtraction inspected; preview tests cover changes, closed periods and warnings; SQL covers exclusive closing boundary and preservation of bookings/hours on rejected changes.                                               |
| Photos → public gallery/home                 | Existing publication, consent, temporary-content gates and Storage mapping inspected; fixture verifies gallery/lightbox and image decoding. All ten real public image paths checked by local-file existence or Storage HEAD. Upload/Auth HTTP behavior remains unverified here.                     |
| Public request → authorized administration   | Mocked browser submission plus SQL request/confirmation/calendar/search tests. Hosted submission and real administrator confirmation were not performed.                                                                                                                                            |
| Registered directory vs guests               | SQL verifies account-only directory and ownership, preserving guest appointments. Preview tests cover profile selection and guest exclusion from the directory without excluding guests from authorized appointment views.                                                                          |

Read-only hosted public snapshot: **4 categories, 67 services, all category associations valid, all returned services published/unarchived, all 67 prices unknown, 4 currently active public offers, 10 gallery photos, 7 weekly-hours records**. Salon identity/contact are configured and timezone is `Africa/Casablanca`. This is a dated observation, not a seed, modification or guarantee about later content. No private customer details or credentials are copied into this report.

## Motion and accessibility

`public-motion.css` is scoped to `.fatu-public` (and the root only when that public frame exists). Existing final colors, fonts, dimensions, spacing, imagery and admin styles remain unchanged.

- Navigation/buttons/cards retain their existing visual states with 200–240 ms property transitions; image interactions use 320 ms.
- Hero and selected public sections/cards enter gently in 240–360 ms with at most 6 px movement and a small opacity change. Stagger is capped at 105 ms. Content has no default observer-dependent hidden state.
- Category result insertion, selected-service feedback, existing basket expansion, dialogs and form feedback receive short opacity feedback. No route delay, history interception, form remount or scroll-jacking was added.
- Mobile menus animate opening only. Closing immediately removes hidden links from keyboard access; Escape restores focus to the trigger. This favors accessibility over delaying a closed menu for an exit effect.
- Section anchor offsets use the measured public header height. The measurement now covers all public routes. `prefers-reduced-motion` disables added motion and smooth scrolling.
- Missing/unusable IntersectionObserver is guarded. Readability with JavaScript enabled and observer unavailable is tested separately from the no-JavaScript SSR limitation.

Keyboard/focus, mobile menu, language persistence and Arabic RTL, reduced motion, visible content without an observer, gallery controls, inputs/errors and ordinary responsive navigation are covered. This is not a WCAG certification or a screen-reader/device-lab audit. Native pickers and real assistive technologies need a manual acceptance pass.

## Responsive and reliability verification

The matrix covers **320, 360, 375, 390, 430, 768, 1024, 1366, 1440 and 1920 px**, at 1000 px height, across homepage, services, offers, portfolio, about, contact, request form, FAQ and privacy. It asserts no horizontal overflow, heading visibility, successful rendered-image decoding and no unexpected browser errors. Existing tests additionally exercise shorter desktop heights and mobile basket actions. Screenshots are generated under `test-results/catalogue/final-audit-*/` and the existing public design/mobile test directories.

At representative 1366/1440 physical widths, the 120% test uses the equivalent reduced CSS viewport with DPR 1.2. It is **not a native browser zoom operation**. Native 100/120% browser chrome zoom and cross-browser/device checks remain manual limits.

Booking checks cover multi-service selection/removal, category/search navigation, reload persistence, required fields, invalid phones, retry after network failure, pending success states, and rapid-click submission while a mocked request remains in flight. SQL tests cover duplicate/idempotent confirmation, simultaneous confirmations, taken starts, closed/exceptional times, ownership and safe cancellation. A browser mock cannot establish real HTTP-to-hosted-database persistence.

## Security review

Inspected: active administrator lookup through `auth.getUser`, customer session/profile checks, protected layouts/pages, server authorization in admin/client routes, same-origin enforcement, body limits, schema validation, rate limits, sanitized errors and existing security headers. Safe browser checks reject anonymous privileged mutations and cross-origin booking requests, reject fake browser-admin flags, preserve noindex/private management behavior and deny production preview access. SQL tests exercise grants/RLS, ownership and privileged transaction boundaries.

Hosted anonymous HEAD requests on `customers`, `appointments` and `admin_profiles` each returned **401**, with no rows downloaded. This narrow observation does not prove every hosted RLS policy, signed-in role or bucket setting. No serious vulnerability was confirmed in the checks performed. There is no claim of a full penetration test.

Known limits: CSP intentionally retains inline script/style allowances for the existing app; no policy redesign was attempted. Recovery/session expiry, invitations/SMTP, Storage upload and live auth/logout need a dedicated disposable Supabase project with test accounts. No credentials were supplied to bypass these limits.

## Findings and dispositions

| Severity            | Finding                                                                                                                                      | Disposition                                                                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium              | Public runtime values were compiled into builds used by purportedly unconfigured tests, compromising test isolation.                         | Fixed in test tooling: explicit build/runtime-local configuration plus forced connected-test opt-out. Production API behavior unchanged.                                                                                  |
| Medium              | Escape closed the public menu without restoring trigger focus.                                                                               | Fixed with explicit trigger focus; keyboard test added. No admin design change.                                                                                                                                           |
| Low                 | Observer existence check could accept an undefined constructor.                                                                              | Fixed with a function check; observer-unavailable test retained.                                                                                                                                                          |
| Low                 | Fatu-era headings, gallery labels, calendar mode/date selectors and assumptions about an unconfigured reused dev server made old tests fail. | Updated expectations to current approved UI and visible DOM, preserving security and data-safety assertions.                                                                                                              |
| Low                 | Immediate category counts could race hydration/render updates; one unused test parameter triggered lint warning.                             | Await selected control states, count visible cards, remove unused parameter. No filter business logic changed.                                                                                                            |
| Medium, unresolved  | With JavaScript completely disabled, an H1 exists in a streamed hidden `DIV#S:0` but is not readable.                                        | Failing audit probe retained, with diagnostic JSON. This is outside animation opacity and needs a reviewed public SSR/streaming solution. No framework-internal unhide hack or rendering architecture change was applied. |
| Verification limits | Hosted writes/Auth/Storage/delivery/restore; native browser zoom; production traffic performance.                                            | Explicitly outstanding; not counted as passed.                                                                                                                                                                            |

If no-JavaScript readability is a release requirement, resolve the streaming finding before release. Propose a focused review of public server-rendering/Suspense boundaries and framework-supported non-streamed delivery, followed by the same no-JavaScript probe. Any significant rendering/security/business change needs owner approval first.

## Modified files in this audit

| File                                          | Why                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/app/public-motion.css`                   | New public-only motion, reduced-motion and anchor behavior.                                                 |
| `src/app/layout.tsx`                          | Load the scoped motion stylesheet.                                                                          |
| `src/components/fatu-shell.tsx`               | Measured header offset on public routes, guarded selective reveals/stagger, Escape focus restoration.       |
| `scripts/test-safe-browser.mjs`               | Safe production-mode browser build/run with connected writes disabled.                                      |
| `package.json`                                | Add `test:safe`; no package dependency changes.                                                             |
| `playwright.config.ts`                        | Align the safe runtime with its isolated build configuration.                                               |
| `tests/e2e/public.spec.ts`                    | Current GELIN HOUSE labels, language control and visible-element checks; retain access/security assertions. |
| `tests/catalogue/catalogue.spec.ts`           | Remove lint warning and await category state before counting visible results.                               |
| `tests/catalogue/appointment-request.spec.ts` | Add isolated required-field/phone/rapid-click coverage.                                                     |
| `tests/catalogue/final-audit.spec.ts`         | Responsive/image/console, focus/motion/observer and explicit no-JavaScript probes.                          |
| `tests/preview/admin-preview.spec.ts`         | Current detailed-calendar route, visible DOM and browser-only/public separation assertions.                 |
| `tests/preview/date-hydration.spec.ts`        | Assert actual server-rendered date rather than the redesigned subtitle.                                     |
| `README.md`                                   | Current project reference and safe commands; preserve older implementation notes.                           |
| `docs/ARCHITECTURE.md`                        | Current boundaries above retained historical architecture.                                                  |
| `docs/TESTING.md`                             | Isolation, real-service limits and build restoration instructions.                                          |
| `docs/DEPLOYMENT.md`                          | Plan-only container runtime, network, secret, cache and health prerequisites.                               |
| `docs/FINAL_PRECONTAINER_AUDIT.md`            | This evidence, findings and readiness report.                                                               |

No admin stylesheet, booking handler, SQL file, authentication architecture, API contract, dependency version, Dockerfile, Compose file or deployment infrastructure was changed by this audit.

## Final checks and next-phase gate

The last ordinary production build passed after all fixture servers stopped. TypeScript and ESLint pass; 36 unit/API tests and 68 isolated SQL checks pass. Browser totals are 21 safe public passes, 30 preview passes, and 39 catalogue/audit passes, with the one explicit no-JavaScript failure. Six hosted connected cases were deliberately disabled; eight duplicate viewport-suite cases were skipped. Do not describe this as an entirely green end-to-end suite.

The production client build contains **36 JavaScript chunks across all routes**, totaling **1,659,007 raw bytes / 500,038 individually gzipped bytes**. This is not the initial payload of one page. A scan of configured server-secret values found **zero client-chunk matches**. The server-only boundary and scan complement one another; this is not an exhaustive secret-discovery product.

One local 1440 px production homepage sample recorded DOMContentLoaded **1,923 ms**, first contentful paint **2,440 ms**, and observed CLS **0**, with **zero page errors and zero attempted browser mutations**. It used the real public catalogue in read-only mode. This is a single local observation, not a production percentile, Lighthouse score, load test or mobile network benchmark. No speculative performance refactor followed.

Representative isolated-fixture screenshots (regenerate with the catalogue suite):

- `test-results/catalogue/final-audit-approved-publi-bcc55-s-the-audit-viewport-matrix-desktop/home-390.png`
- `test-results/catalogue/final-audit-approved-publi-bcc55-s-the-audit-viewport-matrix-desktop/home-1440.png`
- The same directory contains `home-1920.png`, `services-375.png`, `contact-320.png`, and the two explicitly labelled `zoom-120-equivalent-*.png` files.

Ignored `.tools` diagnostics and `test-results` captures are local evidence, not shipped application content. No production records or content were populated by these probes. Keep the verification limits alongside any later packaging handoff. The next phase is **containerization implementation after separate approval**, not execution of historical migration/provisioning instructions against production.
