# Final admin, start-time diary and public synchronization

Implemented 12 November 2026 from the owner's final simplification request. Supersedes earlier duration-based confirmation instructions.

## Customer and owner workflow

- Customers select up to ten published beauty services, a preferred date/start time, name and phone. No account, city, duration or end time is required. Email/notes remain optional. Submission explicitly awaits salon confirmation.
- Request cards retain only three principal actions: **Confirmer**, **Modifier**, **Refuser**. Confirmation reuses customer/services/date/start time. Modification changes only date/start time; agreement is handled manually.
- **Nouveau rendez-vous** now opens one short form using the same contact/service/date inputs and **Enregistrer le rendez-vous**. Saving creates a confirmed diary entry and offers a calendar link.
- Calendar entries display the start, customer, services, phone and status. The appointment's details provide date/start modification and cancellation. Rare operational status changes are grouped in **Autres actions**.
- Cancellation retains the Supabase appointment/history and removes the entry from the active calendar. Its exact start can be reused. A failed exact-start collision during rescheduling preserves the previous start.

## Scheduling model and compatibility

This is explicitly a **manual start-time-only diary**, not interval availability. Owners assess treatment overlap themselves. Different starts, even a minute apart, are allowed; no 15-minute grid or fabricated 30/60-minute treatment duration is used by this flow. Opening hours are displayed for information; accepting a requested start is the owner's decision.

Migration 024 adds `appointments.scheduling_mode`, defaulting existing records to `interval`. Those original records keep their start/end times, item durations and allocations. A diary record uses `ends_at = starts_at` only as an explicit compatibility marker. It does not claim the treatment ends immediately. Diary item durations/resource assignments are null, and no interval allocation is fabricated. The UI hides the compatibility end marker.

The old time-order check is replaced by a mode-specific check: interval records still require a positive period; diary records require matching marker timestamps. Existing allocation exclusion constraints are retained. A restricted compatibility operation creates diary records in the existing appointment/customer/item/history tables; no new business table was added.

The shared scheduling lock, a diary-specific partial unique index and a trigger prevent equal active starts across diary and existing interval records, including concurrent submissions. Existing interval transactions are retained behind the existing change-booking entry point. Old records were not rewritten or deleted.

Promotions/prices remain in the existing catalogue. Diary service snapshots preserve known prices and eligible automatic discounts; unknown prices remain uncertain. They are not shown as free treatments merely because the known subtotal is zero.

The server converts owner-entered local date/time using the configured salon timezone. Calendar, booking-list and dashboard start labels are serialized from that same server interpretation. This fixes a connected check that exposed different future Morocco timezone data in the development browser and Node server.

## Mon salon

Exactly four everyday tabs: **Informations**, **Horaires**, **Photos**, **Site web**.

- Informations edits the existing salon identity/contact fields.
- Horaires adds simple weekday checkboxes alongside shared daily opening/closing periods, plus exception/closure links. Migration 025 saves the selected days and periods atomically while retaining protections for old interval bookings.
- Photos retains upload, replacement, publication/hiding and record removal. **Utiliser en photo d’accueil** associates a selected photo with the existing homepage field.
- Site web edits homepage title/subtitle, description/photo/colour and supported public contact fields. Readable links reach existing FAQ, reviews, translations and other text screens.
- Rare settings and account security are reached through a protected **Réglages avancés et sécurité** link. Old city/travel/employee controls are absent from everyday workflows.

## Admin → public root causes and fixes

The database catalogue already read publication flags and returned salon settings/Storage paths. Its request-scoped React cache was not a persistent website cache. The observed gaps were primarily incorrect/incomplete public mappings:

- Public header/footer wordmarks ignored `salon_settings.name` and rendered fixed branding. They now use the saved name/logo.
- Homepage about text ignored `salon_settings.about`; it now uses that field.
- Some Instagram links ignored the saved setting; they now use it.
- Opening hours were returned in the catalogue but not displayed in the active contact component; a readable weekly display now uses those records.
- Settings forms submitted all fields, including hidden values, creating a stale-overwrite risk between views. They now submit only fields belonging to the visible editor. The protected settings API accepts validated partial saves; preview merges them without resetting hidden settings.
- Public Supabase reads explicitly use `cache: no-store`. Public pages were already dynamic. Subsequent page loads read current data without a deployment.
- Existing immutable upload paths and Storage URL mapping were verified through real uploads and public image requests. Gallery visibility still requires publication, consent and a non-temporary photo; those protections were preserved.

## Verification

### Isolated checks

- **61 PostgreSQL integration checks passed**, including legacy booking preservation and the new start-only diary: unknown-duration confirmation, calendar query visibility, exact-start rejection, different-start acceptance without an interval guarantee, safe rescheduling, cancellation/start reuse, manual idempotency, concurrent confirmations and authorization.
- **31 unit/API tests passed**.
- **12 desktop/mobile customer catalogue/request checks passed** with an isolated catalogue HTTP fixture. Preferred times remain plain preferences; no interval-availability chooser is advertised.
- **9 desktop/tablet/mobile admin preview checks passed**, including partial-setting preservation.
- TypeScript, ESLint and production build are run separately after final changes.

### Connected development Supabase checks

`scripts/verify-connected-simplification.mjs` is opt-in and requires administrator credentials from the environment; no credentials are stored in the script. Completed phases verified:

1. Customer submits two services with preferred date/start, name and phone.
2. Owner confirms without entering duration/end time.
3. The entry appears in the live admin calendar.
4. Owner changes start time through the booking details; the stored time matches Morocco local time after the server-conversion fix.
5. Owner cancels; status/history remain in Supabase and the active calendar entry disappears.
6. The one-page manual form creates an appointment using that freed exact start.
7. Name, phone, WhatsApp and address edited through the real admin form appear on public pages.
8. Homepage title, subtitle and about text edited through the real admin appear publicly.
9. A real Storage upload saved as homepage photo appears at its public URL; published gallery upload also appears publicly.
10. A service name/price edited through the real admin appears in the public catalogue.
11. Category/service publication flags change public visibility (database flag writes plus public-page verification).
12. Saved opening hours appear in the public contact display.
13. The manual form fits a 390-pixel mobile viewport.

Temporary public edits were restored and test gallery records/uploads removed. Labelled test appointments remain cancelled in history, preserving traceability. Hash comparisons confirmed that appointments existing before each connected run were unchanged. No real customer appointment was cancelled or moved.

Exact-start racing confirmations were exercised against isolated PostgreSQL, not by creating concurrent appointments in the connected salon project. Invitation/SMTP delivery, payment providers, bank refunds and new hosting deployment were not tested or introduced. No full-treatment overlap guarantee is claimed for diary entries.

No commit or push was performed.
