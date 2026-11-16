# Manual deletion activation preparation — 16 November 2026

> Superseded for the new scope by [expanded CRUD review](EXPANDED_ADMIN_CRUD.md).
> The owner has waived backup verification and now requests services, customer
> accounts and appointments of all statuses. The new proposal requires its own
> production confirmation, as requested in the latest brief. The recovery gate
> and restricted eligibility below describe the earlier task, not current policy.

Project: **`xjfnhctfwmxkbkfeminf`**. Outcome: preparation complete; activation
withheld because a recoverable recovery point has not been verified. Website
deployment is also unconfirmed. No functions were reinstalled, no business rows
were changed, and no grants or feature flags were enabled.

## Exact proposed authority

The existing [manual activation transaction](../supabase/proposals/activate-manual-deletion.sql)
is the only activation artifact for this scope. SHA-256:
`2f9bbd700748daecec1f9f5dfee4e7c9570146d3109a0f5f27a62b6afade7c97`.
Its only function EXECUTE grant is:

```sql
GRANT EXECUTE ON FUNCTION public.gelin_delete_category(uuid,text,text),
 public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text)
 TO authenticated;
```

The full transaction checks current_user=postgres, temporarily grants only
gelin_delete_owner SET membership to that installer with INHERIT FALSE, switches
to the function owner, issues the grant above, resets the role and revokes that
temporary membership before COMMIT. It does not recreate functions, grant table
access, change RLS, enable a login, or grant cleanup execution.

`authenticated` is shared by signed-in customers and administrators. EXECUTE is
therefore only the entry permission: each function independently requires a
session-derived UUID matching an active public.admin_profiles row. Customers,
inactive administrators and missing identities remain unauthorized. No actor
argument, browser flag, API secret or privileged application login supplies
administrator authority. The existing private Auth helper and four preview
permissions need no additional grants.

## Eligibility and preserved safeguards

| Entity | Required eligibility | Owned rows removable only after activation |
| --- | --- | --- |
| Category | No service references it, including archived services. | Category and its category translations. |
| Offer | usage_count is known and exactly zero; no appointment item anywhere has non-null promotion_name, because renamed historical use cannot otherwise be excluded safely. | Offer, its promotion-service links and offer translations. |
| Appointment | ends_at is strictly before transaction time; status is completed, cancelled_by_customer, cancelled_by_salon, rejected or no_show; no idempotency, payment, change-request, contact-request or notification dependency. The live ends_at column is NOT NULL. | Appointment and its own items, allocations and history. Customer/profile/Auth/service records remain. |

Manual offer deletion is not restricted to expired offers. Expiry is a separate
automatic-cleanup condition; cleanup remains disabled. No eligibility rule was
changed during this task and no existing record was assessed as a deletion
candidate or removed.

The active-admin lock/check, fixed target wrappers, existing advisory/table
locks, fresh inspection, exact SUPPRIMER phrase, SHA-256 fingerprint comparison,
FK protections and transactional rollback remain unchanged. Service deletion
still has no public RPC or owner DELETE privilege; account deletion remains
blocked in the HTTP handler and has no corresponding new public RPC/privilege.

## Essential checks actually performed

A single `BEGIN READ ONLY` / ROLLBACK connection verified current permissions and
compared all 14 installed function bodies against the reviewed base. No broad
audit, reinstall, development suite, destructive RPC or new fixture was run.

- All 14 installed definitions match the reviewed source and retain empty fixed
  search_path. The four previews are executable by authenticated only among the
  checked app/executor roles; the three DELETE RPCs and cleanup remain revoked
  from anon, authenticated, service_role and gelin_cleanup_executor.
- Owners and executor remain NOLOGIN. There is no public service/customer-delete
  RPC, no relevant owner DELETE privilege on services/customers/client_profiles/
  admin_profiles, and no remaining installer SET permission. Existing service
  editor execution remains available.
- Local PERMANENT_DELETION_ENABLED and OFFER_CLEANUP_ENABLED are both false.
  Current production row eligibility and hosted environment settings were not
  queried or modified.
- UI calls `/api/admin/permanent-deletion`; the handler checks same origin and
  requireStaff, strictly validates inputs and confirmation, then calls the
  installed fixed RPC through sessionDb with the signed-in user's cookies.
  The function map matches the installed category/offer/appointment signatures.
  It does not use DATABASE_URL or the server secret for manual deletion.
- The HTTP feature flag currently blocks **both preview and delete modes**.
  SQL preview permission alone does not make the website preview operational.

## Hosting and recovery evidence

The website source is tracked in the current repository, but deployment cannot
be identified from `netlify.toml` alone. APP_URL is local. No Netlify/Vercel/Sites
project metadata was found in the workspace, and no hosting token or connected
Netlify integration was available. No production website URL, deployed revision,
or hosting project was supplied. This does not prove the site is undeployed;
the updated source's deployment and hosted flags are **unconfirmed**.

No backup archive or recovery/restore-verification report was found in the
workspace, and no backup-management token or connected Supabase management
integration is available. The SQL connection and application secret do not
establish managed-backup availability or a successful isolated restore. Existing
provider backups may exist; none is represented as verified here. No backup or
restore was created. Earlier local tests are not production recovery evidence.

## Exact remaining sequence

1. Obtain verifiable evidence for a recoverable point belonging to this project:
   its timestamp and recovery mechanism, protected access/retention, and a
   successful isolated restoration with the required database/Auth coverage and
   integrity validation. Do not restore over production or test deletion on real
   records. Keep grants and flags off until recovery is verified.
2. Identify the production hosting project, HTTPS origin and deployed source
   revision. Verify the reviewed handler/UI/RPC map is in that release, its
   Supabase configuration targets this project, and its server-only deletion and
   cleanup flags are false. Release the reviewed website only through an
   authorized deployment step if the deployed code is older. No hosting change
   is part of this preparation task.
3. Once recovery is verified, review the exact linked manual-only transaction
   and reconfirm current permissions. Apply only that transaction as postgres.
   Never rerun safe-deletion.sql or the historical combined activation artifact.
   **This EXECUTE grant itself enables direct authenticated-admin RPC deletion,
   even while the website flag is false**, so the recovery gate precedes it.
4. Confirm only the three intended new authenticated EXECUTE grants changed.
   Confirm anon/service_role/cleanup executor remain denied, private helpers stay
   restricted, owners/executor stay NOLOGIN, and temporary SET is removed.
5. Enable PERMANENT_DELETION_ENABLED=true only in the confirmed hosting server
   environment after the recovery/grant checks; restart/redeploy as required.
   Leave OFFER_CLEANUP_ENABLED=false, cleanup EXECUTE revoked and its executor
   NOLOGIN. Verify real active-admin previews and ordinary/inactive/anonymous
   access rejection without pressing final deletion confirmation or changing
   production records. Service/customer deletion must still be refused.

### Prepared shutdown, not executed

Disabling the application flag alone does not revoke database authority. If
manual activation later needs to be withdrawn, an authorized postgres operator
can use the same narrow owner context to revoke it:

```sql
BEGIN;
GRANT gelin_delete_owner TO CURRENT_USER WITH SET TRUE, INHERIT FALSE;
SET LOCAL ROLE gelin_delete_owner;
REVOKE EXECUTE ON FUNCTION public.gelin_delete_category(uuid,text,text),
 public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text)
 FROM authenticated;
RESET ROLE;
REVOKE gelin_delete_owner FROM CURRENT_USER;
COMMIT;
```

Also turn the hosted manual flag off and refresh running instances. Already
running transactions require targeted incident handling; completed deletion
requires the verified recovery process. Nothing in this shutdown is a reason
to terminate general customer sessions or alter cleanup, RLS or business rows.
