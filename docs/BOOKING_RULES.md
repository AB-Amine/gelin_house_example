# Implemented booking rules

1. Booking starts disabled. Approved salon configuration, phone, privacy/policy
   text, real services, qualified providers and operating intervals are required.
2. A selection has 1-10 unique services in the chosen order. Repeated clicks do
   not add duplicates. Quantities and parallel service execution are not offered.
3. The server reloads services, eligibility, durations, buffers and promotions.
   Archived, unpublished, nonbookable or hidden-category services are rejected.
4. Prices use exact MAD centimes, percentage discounts round half-up, and fixed
   reductions are capped at the original amount. No stacking; the largest eligible
   active reduction applies only to fixed prices. Consultation/starting prices
   retain uncertainty and do not acquire fabricated final amounts.
5. Checkout reviews a server quote. Its fingerprint covers the complete plan.
   Changed prices, offers, allocation or duration require a new review before
   submission. Availability is advisory until the transaction commits.
6. Services run sequentially in basket order. Each occupied interval includes
   preparation, service and cleanup, a qualified provider and every required
   exclusive equipment unit. Staff and equipment need configured working hours.
7. Weekly split shifts, date-specific opening overrides, closures, staff leave,
   minimum notice, advance horizon and slot increments all affect the plan.
   Every occupied interval must fit opening hours, including buffers. Overnight
   shifts and finishing after closing are refused.
8. Scheduling uses Africa/Casablanca timezone rules and stored UTC instants.
   Availability iterates the actual local day, including 23/25-hour days. Slot
   labels include an offset. Ambiguous/nonexistent manual local times are rejected.
9. A shared PostgreSQL transaction lock serializes all scheduling writers; resource
   range exclusion constraints independently prevent overlap. Manual and public
   bookings follow the same mechanism. No administrative double-booking override
   is provided. Harmless schedule changes are allowed; conflicting edits identify
   affected appointments and roll back instead of silently changing bookings.
10. Pending requests reserve capacity indefinitely until salon action. Confirmed
    and in-progress appointments also reserve capacity. Terminal transitions and
    capacity release commit together. No unreliable implicit expiry is used.
11. One submission intent has one UUID idempotency key and one 256-bit management
    token. Exact retries recover the same appointment; payload reuse is rejected.
    Browser session storage retains an interrupted intent for recovery and is
    cleared on success or a definitive conflict. It is not the booking database.
12. Name and a valid normalized phone are mandatory. Email and notes are optional.
    Consent is required. No registration or automatic phone-based identity merge.

## State machine

| Current                                                                 | Allowed next states                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| pending                                                                 | confirmed, rejected, cancelled_by_customer, cancelled_by_salon  |
| confirmed                                                               | in_progress, cancelled_by_customer, cancelled_by_salon, no_show |
| in_progress                                                             | completed, cancelled_by_salon                                   |
| completed, rejected, cancelled_by_customer, cancelled_by_salon, no_show | none                                                            |

Every operation checks actor permissions and policy in addition to this graph.
No-show requires its configured attendance window. Cancelling an in-progress
appointment requires a reason. History records the actor, action and timestamp.

Rescheduling supports pending/confirmed appointments, retains original price and
duration snapshots, rechecks current qualification/resources, and records the old
schedule. Failure keeps the old allocation. Customer rescheduling resets the
request to pending; salon rescheduling preserves its current status.

## Private access and communications

A private management link appears in the booking receipt. Its token stays in the
fragment until exchanged for a scoped HttpOnly cookie, then is removed from the
address bar. The server hashes the cookie's raw secret and checks expiry/policy
on every request. References alone grant no access. Public cancellation and
rescheduling are disabled until the owner explicitly enables them and their
cutoffs. Completed/terminal bookings cannot be changed publicly.

No email, SMS or WhatsApp booking provider is integrated. No delivery is claimed.
The phone/WhatsApp contact options appear only with approved configured details.
Phone-based verification is a manual salon process, not an implemented OTP flow.
Supabase SMTP is separately required for staff invitations/password recovery.

See EDGE_CASES.md and TESTING.md for deliberate limits and actual verification.
