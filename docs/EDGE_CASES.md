# Deliberate edge-case behavior

| Case                                   | Implemented behavior or explicit limit                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Competing customers                 | Salon transaction lock and resource exclusion constraint allow one conflicting allocation.                                                                                          |
| 2. Multiple services over closing time | Complete sequential plan must fit salon and provider intervals.                                                                                                                     |
| 3. Price changes during checkout       | Server quote fingerprint changes; customer must review again.                                                                                                                       |
| 4. Expired offer at submission         | Current persisted validity is recalculated in the transaction.                                                                                                                      |
| 5. Service archived in basket          | Review identifies unavailable entries; transaction rejects them.                                                                                                                    |
| 6. Blocking a booked date              | Admin closure mutation is refused; existing appointments must be resolved explicitly.                                                                                               |
| 7. Cancellation                        | Status and capacity release commit together; history remains.                                                                                                                       |
| 8. Duplicate submission                | Unique key plus payload/token hash returns the original result; mismatched reuse is refused.                                                                                        |
| 9. Absent staff                        | Resource closure removes slots; a conflicting new closure is refused.                                                                                                               |
| 10. No qualified provider              | No slot is available for an infeasible complete sequence.                                                                                                                           |
| 11. Exceptional closing                | Salon-wide closures apply to every resource. Date-specific opening intervals override weekly hours for the salon or a resource.                                                     |
| 12. Lost submission response           | Session-stored intent can retry the exact request and recover its reference/private link.                                                                                           |
| 13. Expired admin session              | Operation authorization fails; client-side form values remain present. Reauthenticate and retry.                                                                                    |
| 14. Notification failure               | Booking notifications are not integrated; no delivery claim is made. Auth delivery needs Supabase provider verification.                                                            |
| 15. Invalid phone                      | Maintained numbering metadata validates and normalizes Moroccan/international numbers.                                                                                              |
| 16. Consultation price                 | Nullable amount and explicit uncertainty; no invented final total.                                                                                                                  |
| 17. Clock changes                      | UTC instants, Casablanca timezone rules, actual-day iteration, and offset-bearing slot labels; ambiguous manual local inputs are rejected.                                          |
| 18. One provider                       | The same provider is allocated sequentially to qualified services.                                                                                                                  |
| 19. Archived historical service        | Restrictive foreign keys and immutable snapshots preserve the old appointment.                                                                                                      |
| 20. Changing service sequence          | Customers can remove/re-add services to choose an order before submission. In-place sequence edits to existing appointments are not offered; rescheduling retains the booked order. |
| 21. Another customer's booking         | A reference is insufficient; a 256-bit secret or scoped authenticated cookie is required.                                                                                           |
| 22. Unauthorized admin mutation        | Server session/role checks plus restricted database functions and grants deny access.                                                                                               |
| 23. Negative promotion total           | Discount bounds, positive values and exact centime calculations cap reductions at the item amount.                                                                                  |
| 24. Empty services                     | Clear empty state; no pretend bookable services.                                                                                                                                    |
| 25. Empty gallery                      | Explicit photography placeholder; no scraped or invented salon images.                                                                                                              |
| 26. Interrupted image upload           | No gallery entry is automatically published. Retry upload; review orphaned objects in Storage.                                                                                      |
| 27. Cancelling completed appointment   | Terminal state transition is refused.                                                                                                                                               |
| 28. Shared equipment                   | Exclusive equipment allocations share the same overlap constraint as staff. Configure equipment hours explicitly.                                                                   |
| 29. Slot removed during submission     | Scheduling edits and booking share the same transaction lock. The later operation revalidates current state.                                                                        |
| 30. Working-hour changes after booking | Validate future active allocations after the proposed change; safe edits commit, conflicts roll back and identify affected references.                                              |

Other deliberate version-one limits: one currency/timezone, no overnight shifts,
no parallel service execution, no quantity repeats, percentage/fixed discounts
only, no discount stacking, no payment processing, no automatic pending expiry,
and no automated booking messages. Owner-configured policies may be stricter.
