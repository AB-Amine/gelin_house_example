# Fatu validation record

## Verified locally

- Baseline before Fatu changes: 18 unit/API tests, TypeScript and 28 PostgreSQL checks passed.
- Current unit/API suite: **21 passed**. Includes multilingual dictionary/Unicode checks, safe translated text projections, required city/address/consent and original capability/origin safeguards.
- Current PostgreSQL suite: **42 passed** using a fresh disposable embedded PostgreSQL cluster with the additive migration history. Includes original conflict/idempotency/admin/privacy checks and new city fees, client privacy, contextual retries, guest linking, reviewed changes, concurrent code redemption and separate paid/refunded receipts.
- Final production build and strict TypeScript: **passed**.
- Final full-project ESLint: **passed**.
- Production browser suite: **21 passed** across desktop, tablet and mobile; **6 live-provider checks skipped** for missing isolated Supabase configuration.
- Development browser suite: **9 passed**, covering local editing, calendar navigation, Arabic layout and a network-fixture test of the Strict Mode private-capability lifecycle. That fixture is a component regression test, not proof of a real Supabase booking.
- Screenshot review caught a decorative-label overlap, low footer/CTA contrast and missing image decoding waits in capture; these were corrected. Dashboard cards/table styles and image disclosure readability were also improved.

## External verification still required

Final local verification completed on 11 November 2026. No live Supabase credentials were present. Supabase Auth HTTP flows, account verification/recovery/email change and delivery, real Storage uploads, and the connected browser journey have therefore not been executed. The isolated-PostgreSQL harness deliberately does not claim to replace these provider checks.

Notification events are queued only. No email/SMS/WhatsApp delivery provider is installed or verified. No payment gateway is installed; manual payment records are an operational ledger. Business facts, translations, real imagery/consent and policies await Fatu's approval. Nothing has been deployed.

Connected browser test: `tests/e2e/connected-journey.spec.ts`, explicitly gated by disposable-project configuration. It covers a city-aware guest booking, private capability claim, cross-client denial, admin confirmation, pending cancellation/approval, capacity release, authorized portfolio image filtering/lightbox and logout. It must pass against the configured test project before production approval.
