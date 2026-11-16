# Expanded administrator CRUD — database installed, application release pending

On 16 November 2026 the owner explicitly approved both reviewed SQL files below,
including expanded permanent deletion permissions, without requiring a new backup.
Both exact files are now installed and verified on project
`xjfnhctfwmxkbkfeminf`, PostgreSQL 17.11. The original base was not reinstalled.
There are 24 functions total, three private tables and 28 new application triggers
(plus four PostgreSQL internal FK triggers on referenced public tables).
Only the new private request/service table received 15 backfill associations;
no existing business/Auth records were changed or deleted, and RLS policies and
direct application table grants were preserved.

**Restricted expanded RPC grants are active:** authenticated callers can invoke
the three administrator-guarded preview/delete/job functions; only service_role
can finalize an account job after Auth absence. Legacy DELETE grants and cleanup
execution/login remain disabled. The owner subsequently authorized local
application activation: manual/expanded flags are now true in ignored
`.env.local`, cleanup is false, and Next.js was restarted. The owner confirmed
the expanded preview in the signed-in local panel. Focused route/UI/isolated SQL
rechecks passed without production deletions. Hosting identity/access remains
unavailable, so no hosted deployment, commit or push occurred.
See [current production status](SAFE_PRODUCTION_STATUS.md)
for verified boundaries and the precise hosting information still needed.

## Reviewed deletion behavior

| Selected record | Explicit plan executed after confirmation |
| --- | --- |
| Prestation | Deletes the service, its qualifications/equipment/location/offer links and translations; lists and deletes appointments containing it and related booking records/requests. Other service definitions remain. |
| Category | Lists/deletes its services and the dependency graph above, category translations and category. Empty categories need no extra dependent-record confirmation. |
| Offer | Deletes the offer, service links and translations regardless of past usage. Existing appointment price/discount/name snapshots remain. |
| Appointment | Deletes the selected appointment at any date/status, its items, allocations, history, payment records, notification records, change requests and linked contact requests. Customer/service definitions remain. |
| Registered customer | Deletes the application profile, account-linked appointments/requests and their listed children, and booking contact snapshots that are not shared with other appointments. Then the server deletes the Auth account. Never identifies records by phone/email similarity. |

This version deliberately chooses deletion of the explicitly listed dependent
appointments when deleting a service/category, because the existing mandatory
service references cannot simply be detached. The modal warns that a multi-service
appointment is removed **in full**, including its other booked items. The extra
checkbox must confirm all listed related records. There is no silent cascade or
automatic deletion candidate selection. Administrators may cancel instead.

All administrator identities are excluded from the customer deletion endpoint,
including the caller and last active administrator. Settings, opening hours,
calendar behavior, other admin editors and authentication flows remain intact.
Existing audit logs, Storage files, unrelated records and shared contact snapshots
are preserved and described in the preview. Cleanup remains disabled.

## Exact approved and installed SQL and effects

1. [expanded-admin-crud.sql](../supabase/proposals/expanded-admin-crud.sql)
   SHA-256 `50CA904C3ABD5A494A4F001C47E780E941C6AA8591BE6743E9AB636A864A3035`.
   Executed following explicit approval; retained outside automatic migrations.
2. [activate-expanded-admin-crud.sql](../supabase/proposals/activate-expanded-admin-crud.sql)
   SHA-256 `0EE98902586CC9ACF7C33E5C13FCD57F7AF5AD10876C68636DA070C45396ADDC`.
   Separate narrow authority activation; no cleanup permission.

The installation transaction:

- Requires the existing base and postgres installer. Acquires the existing
  advisory lock, uses finite lock/statement timeouts, and aborts if existing
  request arrays contain missing services or booking-function signatures differ.
- Adds three private tables: normalized request/service links, reserved deleted
  request UUIDs and durable account-deletion jobs. Backfills **only the new link
  table** from existing request arrays. Existing business rows are not deleted
  or updated during installation. Existing RLS policies are not changed.
- Adds nullable `deleted_at` to idempotency_records and makes its existing
  appointment reference nullable. During a confirmed deletion, the function
  explicitly clears that reference and marks the existing replay key as deleted;
  it does not erase the key/hash. A consistency CHECK permits a missing appointment
  reference only with a deletion timestamp; immutable tombstones reject later mutation.
- Patches only the replay checks in create_booking, create_fatu_booking and
  create_diary_appointment, so an old key raises BOOKING_DELETED rather than
  recreating a booking or returning a misleading null success.
- Adds 19 statement-level writer synchronization triggers, five account guards,
  request-link synchronization/unlink triggers, a translation-reference guard
  and a replay-key guard. FK-backed normalized request links close the documented
  concurrent service/request race, even for an older request statement snapshot.
- Updates the legacy private lock_entity helper to use the shared advisory mutex
  without the old table-lock ordering, preventing conflicts with waiting REST
  writers. The active-admin check and existing role boundary remain in force.
- Adds six private helpers and four public functions: gelin_crud_preview,
  gelin_crud_delete, gelin_account_deletion_jobs and gelin_complete_account_deletion.
  The original public functions are retained; the private lock helper is updated.
- Extends only the existing NOLOGIN gelin_delete_owner's explicitly listed
  SELECT/DELETE privileges and two idempotency UPDATE columns; it receives no
  Auth schema access or application login. No authenticated table DELETE grant,
  broad provider-role membership, global cascade, RLS rewrite or scheduler is added.

The activation transaction grants authenticated EXECUTE only on the new preview,
delete and pending-job-list entry points. Each checks the authenticated UUID and
active administrator inside PostgreSQL. Only service_role receives completion
EXECUTE; that finalizer independently verifies that the Auth user is absent.
Temporary installer SET/CREATE rights are revoked. The private schema stays
outside the Data API. All new functions have an empty fixed search_path and
qualified application/Auth table references. Dynamic identifiers come only from
an internal fixed table allowlist; caller values are SQL parameters.

## Account deletion recovery contract

1. The administrator confirms the exact fingerprint, SUPPRIMER phrase and all
   related records. SQL recomputes the plan under synchronization.
2. One transaction deletes the confirmed application graph and creates a durable
   `application_deleted` job. This transaction either commits entirely or rolls
   back entirely. A job fences new application references/profile recreation and
   prevents promotion of that identity to an administrator while deletion is pending.
3. The backend calls the existing server-only Supabase Auth Admin API with hard
   deletion (`deleteUser(id, false)`). No server credential reaches the browser.
4. The server-only SQL finalizer checks actual Auth absence before marking the job
   completed. Only then does the UI report full account deletion success.
5. A transport/provider/finalization failure returns **pending, not deleted**.
   The pending job remains visible under Clientes inscrites with a retry action.
   Retrying handles an already-removed Auth user and completes SQL verification.

These steps are not one cross-system atomic transaction. Application deletion
cannot be undone merely by retrying Auth; recovery here means completing the
durable operation. Provider-side blockers, such as externally owned Storage
objects, leave the operation pending rather than silently deleting other data
or falsely reporting success. The protected pending state must be resolved by
an authorized operator; disabling flags is not a reversal of committed deletion.

## Application/UI changes and cleanup

The existing dialog and CSS are retained. It displays the requested French title
and irreversible-action text, record type/name, every affected record, preservation
notes, SUPPRIMER confirmation and an additional dependency checkbox where required.
Buttons are Annuler and Supprimer définitivement. Success requires matching
PostgreSQL `deleted=true` and the requested ID; refresh happens immediately after
acknowledgement. Account completion additionally requires Auth finalization.

Future/active appointments now have a deletion-plan action rather than an
unconditional date/status ban; their separate cancellation workflow remains.
Active services and registered customer profiles also expose the guarded dialog.
Removed the abandoned appointment precheck and its obsolete test, reconciled the
route/feature flags, retained legacy RPC compatibility until deployment, removed
unused test code/imports, and replaced contradictory UI assertions. Related
database errors are shown in French without exposing SQL or credentials.

`PERMANENT_DELETION_ENABLED` controls destructive application requests.
`EXPANDED_DELETION_ENABLED` selects the new dependency-aware functions; it defaults
off until the reviewed application is deployed to the verified host. Read-only
previews remain available when manual deletion is off. Both manual/expanded flags
have now been enabled locally by subsequent owner authorization; hosted settings
are still unverified.

## Verification

- Full unit suite: **82 passed** across 13 files, including the account-completion
  contract regression and Auth API failure/retry handling.
- `npm run test:crud-db`: 16 disposable full-schema PostgreSQL checks passed,
  including all eight appointment statuses, used offers, dependent categories/
  services, customer profile/Auth staging, self/admin protection, unauthorized
  requests, FK rollback, stale fingerprints, immutable retry keys, concurrent
  requests and a queued real booking racing with service deletion.
- `npm run test:crud-ui`: 28 desktop/mobile checks passed on real client components
  with local mocked APIs. Covers all named entity controls, extra confirmation,
  delayed success, failure without refresh, immediate refresh and account retry.
- Actual development customer-management preview: one focused Playwright check
  passed with browser-local records and intercepted APIs.
- TypeScript, ESLint and the final production build passed. No source or stylesheet
  changes remain pending from the interrupted turns.

The SQL tests use local PostgreSQL 18 and the complete repository schema; they do
not claim hosted PostgreSQL 17/provider-Auth end-to-end deletion. Auth API failure
and retry are mocked in unit tests, with real SQL absence/finalization verified
locally. No existing production record, authentication record or RLS policy was
modified. No backup, cloud export, automatic cleanup, commit or push occurred.

## Installation completed; remaining deployment sequence

The owner separately confirmed both exact SQL artifacts and effects. Steps 1–3
below are complete, including pre/post-commit verification and three live
unauthorized preview denials. No destructive function was invoked for testing.
Steps 4–6 remain pending verified hosting identity/access; no further database
installation or backup approval is required.

1. Perform only a targeted live compatibility/privilege preflight. Stop on any
   unexpected schema, provider hook, dangling reference or signature difference.
2. Install the extension in one transaction, verifying expected objects and
   unchanged existing business/RLS state before commit. Do not rerun the base.
3. Apply only the expanded activation file and verify role/EXECUTE boundaries.
4. Deploy the reviewed code to the identified existing host, with its exact
   HTTPS APP_URL and matching Supabase configuration. Hosting URL, provider
   project and deployment access are still needed; no commit/push is authorized.
5. Enable the two manual/expanded server flags only as part of the approved
   release, restart the application, and leave OFFER_CLEANUP_ENABLED=false,
   cleanup EXECUTE revoked and its executor NOLOGIN.
6. Check authenticated previews, permission rejection, pending-job visibility
   and record refresh without selecting existing production records to delete.

For shutdown, revoke authenticated EXECUTE on gelin_crud_delete as the function
owner and disable manual flags. Revoke any separately granted legacy DELETE
permissions too. Keep replay tombstones and guards; do not DROP the extension or
restore NOT NULL after real deletions. Pending Auth operations require a reviewed
completion path, not a blind reinstallation or deletion of their job records.
