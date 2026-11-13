# Administration et comptes clientes

Current implementation, 13 November 2026. Supersedes the earlier four-tab salon and unrestricted diary-opening descriptions.

- Six main destinations: Tableau de bord, Rendez-vous, Clientes inscrites, Prestations, Offres, Mon salon.
- Rendez-vous has Demandes, Calendrier and Historique. Manual creation remains available; guest contact details and privacy actions remain in appointment details. Pending customer change requests are reached from the relevant appointment.
- Mon salon has five functional tabs. Informations edits identity/contact details/logo. Horaires combines the existing weekly, exceptional-hours and closure editors. Photos retains uploads/publication/replacement. Site web combines homepage settings, FAQs, approved reviews, website text and discreet business policies. Mon compte reuses the administrator password and access forms. Protected troubleshooting tools remain under its collapsed assistance section.
- The customer directory uses Auth-backed customer profiles only, excludes administrator identities, and searches across all registered customers before pagination. Guest records and their appointments are retained.
- Mon espace is a French account area with Mes rendez-vous, Mon profil and Mes avantages. Existing authentication/profile forms remain. Booking and change-request queries retain ownership restrictions; diary entries do not display fabricated durations.

## Opening hours

Migration `202611130027_salon_accounts.sql` adds a database guard for new diary starts, confirmations and rescheduling. Global exceptional hours replace the weekly schedule for their date; global closures/holidays take precedence. A start must be at or after opening and strictly before closing, in the salon timezone. Exact-start conflict prevention remains; treatment durations and interval overlap are still assessed manually.

Changes to weekly hours, exceptions or closures that would invalidate an existing future diary appointment are refused with appointment references. The whole save rolls back. No appointment is cancelled or moved automatically. Existing interval-booking protections remain in the guarded save implementation.

## Customer ownership and offers

The public request endpoint derives `client_user_id` exclusively from the verified Auth session and customer profile. Confirmation preserves that link. Guest contact matches never claim accounts or historical appointments.

Promotions have one additive `audience` field: `public` (the default for every existing offer) or `members`. Both public catalogue functions and legacy guest pricing exclude member offers. The authenticated advantages page reads a restricted customer-only function. Diary confirmation checks the request's trusted profile link, current validity, service eligibility and usage limits before applying a member discount. It does not trust a browser membership flag.

## Validation

- 32 unit tests passed.
- 68 disposable PostgreSQL checks passed, covering the original system plus hours/holiday protection, rollback, registered-only directory, guest preservation, member pricing/visibility, account isolation, cancellation and public settings synchronization.
- Existing form checks passed on desktop/tablet/mobile; the new five-tab checks verify hours saving/reload, gallery editor reachability, website FAQ saving/reload and account controls.
- The additive migration was applied through the normal checksummed migration runner. No live customer/test records were inserted, altered or cancelled for verification. Auth email delivery and live Storage uploads were not exercised by these isolated checks.
