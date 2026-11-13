# Official GELIN HOUSE catalogue

> Current appointment operation is a manual **start-time-only diary**, described in [FINAL_SIMPLIFICATION.md](FINAL_SIMPLIFICATION.md). Catalogue data and publication rules remain; earlier interval-confirmation requirements below are historical.

Implemented on 12 November 2026 as a focused update to the existing catalogue. The five-section administration, public branding, authentication, booking engine, and deployment configuration remain in place.

## Included catalogue

The salon-supplied source is [gelin-house.json](../supabase/catalogue/gelin-house.json). It contains **four principal categories and 67 service/option records**:

| Category   | Entries | Grouping                                                                                                                                                 |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esthétique | 38      | Épilation; soins du visage; beauté des sourcils/cils; manucure; pédicure; onglerie with Vernis classique, Vernis permanent, Gel, BIAB and Dépose groups. |
| Coiffure   | 21      | Brushing; chignons; soins lissants; soins capillaires; coupes. Includes Lissage Kerfactor and its Premium, Noir and Gold options in one related group.   |
| Makeup     | 6       | Makeup invité, VIP and mariée; Pack 1 and Pack 2 remain distinct records.                                                                                |
| Location   | 2       | Caftan and accessory rentals, with enquiry actions.                                                                                                      |

No prices, treatment durations, bridal pack contents, or product differences were invented. Brushing simple, Brushing bouclé, Touching, Bouclé and Wavy remain distinct entries. Kerfactor options use ordinary existing service records with shared grouping metadata; a new variant engine was not introduced.

## Database changes

Apply additive migration `202611120020_catalogue_grouping.sql`. It adds three small fields on the existing `services` table:

- `subcategory`: the first grouping beneath a principal category.
- `service_group`: an optional second grouping, such as Gel or Lissage Kerfactor.
- `service_type`: appointment or rental.

It permits a genuinely unknown service duration to be null. A new check prevents a service from being marked bookable without a known duration, or when it is a rental. Existing booked item durations and existing scheduling/allocation constraints are unchanged. No tables or historical records are deleted.

The public `fatu_catalog()` projection already reads service records from the database, so it carries these additive fields without replacing the existing query or exposing private customer information.

## Applying the official import

**Supabase import completed on 12 November 2026.** All 20 migrations were applied to the configured project, then the official import created four published categories and 67 published services. The public catalogue API and a browser check of the local website both confirmed all 67 services and the four category filters. No appointments were present or removed. Prices and durations remain null. Scheduled time-slot booking remains disabled until configured; appointment request intake is now open.

Connection settings are stored in the ignored `.env.local`. The session-pooler connection uses verified TLS with the official Supabase CA stored in the ignored `.tools` directory. No credentials are included in this document. The first administrator account was subsequently provisioned and verified through the real `/admin/login` page. Its password is not stored in project files.

For another installation, use the procedure below.

Configure the intended Supabase project's private connection values using `.env.example`, then run from the project directory:

```powershell
npm.cmd run db:migrate
npm.cmd run catalogue:import
```

The first command applies the complete additive migration chain, including the preceding admin form migration 019 and catalogue migration 020. The second executes [import-catalogue.mjs](../scripts/import-catalogue.mjs) against the configured `DATABASE_URL`.

The importer:

1. Acquires the existing scheduling transaction lock and imports everything in one transaction.
2. Matches existing categories/services by normalized name or canonical slug. Matching ignores case, accents and punctuation; known Makeup/Maquillage category synonyms are supported.
3. Keeps existing service/category IDs, existing slugs, confirmed prices/durations/descriptions, feature flags, ordering, booking settings, and associated records.
4. Creates new categories as published, and new services as published, nonbookable, not featured, with null price/duration and consultation pricing.
5. Fills the official grouping metadata without resetting the catalogue.
6. Reports existing hidden categories/services in `unpublishedMatches` and preserves their publication decisions. If these should appear publicly, publish them explicitly in Prestations/Catégories.
7. Aborts and rolls back on ambiguous duplicate matches, possible shortened legacy names, conflicting categories/groups, archived matches, or an existing rental configured for appointment booking. Resolve the reported record through the existing admin before retrying; no automatic merge or destructive cleanup is attempted.

Repeated imports create no additional categories or services. Later owner edits to price/duration and publication remain intact. This import does not provision staff qualifications, city links, equipment or working hours and does not enable online booking globally.

## Public and admin behavior

At `/services`, the existing selector displays the principal categories. Services are grouped under their subcategory and optional secondary heading, without extra nested pages. Search also matches the grouping text. Cards retain the existing design and display:

- Original service name and category/grouping.
- Known price, or **Prix sur demande**.
- Duration only when supplied.
- Basket selection for published, non-archived, enabled appointment services with a known duration and a supported city.
- Enquiry links for other services, including rentals. Rental details do not offer an appointment action.

The existing availability/quote transaction still validates staff qualifications, city eligibility, hours, equipment, notice, horizon and capacity. A basket action does not guarantee that a time slot exists. No artificial availability is computed from unknown durations.

The existing multi-service basket remains shared across categories, search, detail pages and reloads. New services are not arbitrarily marked as featured. Existing featured published services continue to feed the unchanged homepage through the shared service card.

In **Prestations**, the owner can edit prices, nullable durations, descriptions, publication and archiving. The existing advanced disclosure now also contains readable subcategory/group/type fields. There are no new admin sections. To enable booking, supply a duration, configure its existing scheduling prerequisites and enable its reservation toggle. An unknown price can remain consultation pricing under the existing uncertain-quote rules; it is never fabricated as zero.

## Appointment requests

Customers add one or several beauty services to the shared basket and complete one reservation form: preferred date/time, name and phone. Email and notes are optional. Rentals retain their contact links. Unknown prices remain “Prix sur demande”.

Requests are stored by `/api/appointment-requests` in the existing private `contact_messages` table, with selected service IDs and date/time preferences. The dashboard displays the six latest requests and a pending count. The inbox is available under **Rendez-vous → Demandes du site** and **Mon salon → Messages reçus**.

Pending requests have **Confirmer**, **Modifier**, **Refuser**. Migration 021 adds a restricted transactional operation that reuses the customer/services, validates the existing booking rules, creates and confirms the appointment, reserves allocations and links the request together. Missing durations or setup leave the request pending. Confirmation retries return the linked appointment rather than duplicating it.

A confirmed appointment appears in the calendar and booking list. Cancellation preserves its record/history and releases active allocations; rescheduling replaces them atomically. The active calendar excludes cancelled/rejected appointments. General contact messages retain handled/reopen controls separately.

Migration 021 was applied to the configured Supabase project after isolated database verification. No live test appointment or fictional salon duration was created. See [current workflow and verification details](SIMPLE_APPOINTMENT_WORKFLOW.md).

## Catalogue-import verification (before the later request-workflow update)

- TypeScript and ESLint pass.
- 28 unit/API tests pass, including nullable-duration admin validation and catalogue selection/grouping rules.
- 52 disposable PostgreSQL checks pass. New checks cover all 67 records, group structure, repeat-import identities, ambiguous/shortened legacy names, existing prices/relationships, public projection, admin editing, rental/unknown-duration booking rejection, publication preservation and unchanged appointment/item/allocation snapshots.
- Four focused desktop/mobile browser checks pass, covering grouped rendering, missing prices/durations, rental links and multi-service basket persistence. They use a **test-only catalogue HTTP fixture**, including two explicitly named TEST basket services with artificial test values. These are never imported into a business database or used as an application fallback.
- Production compilation is verified separately with normal environment values after the fixture checks.

The optional browser fixture command is:

```powershell
npx.cmd playwright test --config=playwright.catalogue.config.ts
npm.cmd run build
```

The fixture server builds a temporary production output with local test connection values and serves it on port 3130; the ordinary build afterwards restores the normal output. It leaves an existing development server untouched. These checks demonstrate rendering/basket behavior, not live Supabase Auth, Storage or remote persistence.

The connected catalogue is now visible at `http://127.0.0.1:3000/services`. Real administration at `/admin/services` and `/admin/categories` requires a provisioned administrator account. Public visibility follows the database publication flags. Nothing was committed, pushed or deployed to website hosting automatically.
