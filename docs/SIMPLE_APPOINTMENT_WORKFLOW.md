# Simple website and appointment workflow

> Superseded by the owner's final **start-time-only diary** request. See [FINAL_SIMPLIFICATION.md](FINAL_SIMPLIFICATION.md) for the current model and connected verification. Earlier duration/interval requirements below are historical.

Implemented 12 November 2026 in the existing application. No commit, push or hosting deployment was performed.

## Current salon setup update

The owner subsequently requested an employee-free salon diary. Migration 023 adds an optional single-calendar mode, enabled for this salon, with one real shared salon capacity allocation. Employee qualifications/hours are no longer prerequisites in that mode. The employee tab and calendar employee selector have been removed; the old records remain preserved. Global opening hours, dated exceptions, closures, duration checks, transaction locking and allocation exclusion protections still apply. Existing staffed appointments also block overlapping new salon bookings.

The supplied phone/address were saved, along with editable informational privacy/booking/deposit text. The internal “Au salon” location carries no travel charge and services are associated automatically. The salon's booking activation is enabled. Service prices/durations were not invented; only services with reliable durations can be confirmed. A focused disposable check verified employee-free confirmation, overlap blocking, hours/exceptions and cancellation release. A live read-only check returned available slots for the owner's existing 30-minute service. No live test appointment was created. Earlier employee/city instructions below describe the previous configuration.

## Customer

All published, non-archived beauty services can be added to the existing shared basket, including services whose durations are not yet known. Rentals retain their contact actions. Prices and known durations remain visible; an unknown price is shown as “Prix sur demande”.

The public reservation page is one form: services, preferred date/time, name and phone. Email and notes are optional. No account, city, staff or equipment selection is required. The receipt explicitly says that the request is awaiting confirmation.

When scheduling prerequisites are reliable and there is a single configured common city, the form can fetch available times through the existing `fatu_slots` operation. Otherwise it accepts a preferred time as a request. Neither choosing a suggested time nor submitting a request reserves capacity. Confirmation always revalidates availability.

## Owner

Five main navigation items remain: Tableau de bord, Rendez-vous, Prestations, Offres, Mon salon. The dashboard has three main statistics and displays recent website requests directly. Less common modification/payment screens remain reachable through advanced links.

Each pending appointment request has **Confirmer**, **Modifier**, **Refuser**. Confirmation reuses the selected service IDs and stored customer details. Modification changes the preferred date/time; it does not silently confirm. Refusal records a decision without making an appointment. General contact messages retain their handled/reopen actions.

Confirmation blocks with a readable explanation when durations or required salon/scheduling configuration are missing. It never fabricates duration, price, location, qualified staff, or availability. Because the existing model includes cities, confirmation requires a uniquely configured common city and a real salon address. These existing rules are not bypassed or replaced by interface defaults.

## Database and transactions

Migration `202611120021_appointment_requests.sql` adds structured metadata to the existing `contact_messages` table: selected services, preferred date/time, request decision, and a linked appointment. It creates no business tables. Existing text-only appointment requests are backfilled only with exact, unambiguous service-name matches; malformed date/time values are not cast. The old handled flag is preserved; it is no longer mistaken for appointment confirmation.

The restricted `resolve_appointment_request` function validates an active owner/manager, takes the existing scheduling advisory lock, locks the request, and calls `fatu_plan`, `create_fatu_booking`, and `change_booking`. Creation, confirmation, allocation and request linking commit together. Failure rolls everything back. Repeated confirmation of a linked request returns its existing appointment.

The calendar reads the real `appointments` records. Cancelled/rejected records are omitted from its active view and remain in booking history. Its entries open booking details, where the owner can change date/time or cancel and confirm cancellation.

Cancellation and rescheduling reuse `change_booking`. Cancellation disables active allocations while preserving the appointment/history. Rescheduling checks availability and replaces allocations within its existing transaction; a failed change retains the previous reservation. Customer availability is recalculated from the allocations; no manual slot clearing or separate availability cache is introduced.

All new public writes use origin checks, rate limiting, validation and private server credentials. Admin actions require the authenticated session and restricted SQL operation. Anonymous/authenticated clients cannot invoke the privileged confirmation function directly.

## Verification

- TypeScript, ESLint and production compilation are checked after implementation.
- 31 unit/API tests cover existing behavior and the minimal request schema, including optional email, normalized phone, duplicate services, invalid dates/times, consent and honeypot validation.
- 60 disposable PostgreSQL checks cover the existing booking system and the new request lifecycle. New checks verify missing-duration protection; request modification/refusal; confirmation with two services and reused contacts; visibility through the calendar query; occupied-slot removal; overlapping confirmation rollback; atomic rescheduling; cancellation/history/allocation release; another customer taking the freed slot; retry identity; concurrent confirmation; and permissions.
- 12 desktop/mobile catalogue/form browser checks cover rendering, honest missing prices/durations, rental actions, persistent basket, two-service submission without email/registration, returned time options, and retained inputs after a failed submission. These use an explicitly isolated catalogue HTTP fixture and intercepted submission/availability responses where needed.
- Nine desktop/tablet/mobile admin preview checks cover navigation, normal service price entry/saving, employee/service associations, promotions and settings. Preview data stays in browser storage.
- A connected smoke check used a uniquely labelled temporary request on the real Supabase project: choose two services on the public website, submit with name/phone and no email, see it on the authenticated dashboard, verify confirmation stays pending without real durations, modify the time with contact/services preserved, then refuse it. The temporary request was removed afterwards; existing customer requests were not modified by the smoke test.

The successful confirmation/cancellation/rebooking lifecycle was verified against disposable PostgreSQL with explicit test-only scheduling data. It was not run with invented durations or confirmed test appointments in the live salon project. A complete browser-to-live-Supabase confirmed booking remains dependent on reliable salon configuration. Live service creation/publication was not exercised with fictional business prices; service forms were checked in preview and persistence/public projection were checked in the isolated database suite. No email/SMS provider or automatic payment collection was added.
