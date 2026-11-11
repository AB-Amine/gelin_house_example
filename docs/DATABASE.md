> **Current Fatu implementation:** see [Fatu setup](FATU_SETUP.md), [implementation phases](FATU_IMPLEMENTATION.md) and [validation](FATU_VALIDATION.md). The predecessor details below are retained for history and may describe older routes or test counts.

﻿# Implemented PostgreSQL schema

Nine ordered migrations create the schema, booking transactions, admin mutations,
reporting, account access, branding/privacy behavior and RLS. Migration 008 converts
every profile to equal full administrator access while preserving inactive status;
009 keeps guest links valid after rescheduling. A fixed legacy `owner` value is
retained internally, with a database constraint rejecting other values. The migration runner
records checksums and applies new files under a transaction and advisory lock.
Clean application of every migration is exercised by `npm.cmd run test:db`.
No migration has been applied to a hosted salon Supabase project in this session.

## Entities

| Area         | Implemented tables                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Admin access | `admin_profiles`, linked to `auth.users`; one fixed access level plus active/inactive status     |
| Salon        | `salon_settings`, `working_hours`, `opening_exceptions`, `closures`                              |
| Catalog      | `categories`, `services`                                                                         |
| Capacity     | `resources` (staff/equipment), `qualifications`, `service_resources`                             |
| Offers       | `promotions`, `promotion_services`                                                               |
| Customers    | `customers`                                                                                      |
| Booking      | `appointments`, `appointment_items`, `allocations`, `appointment_history`, `idempotency_records` |
| Content      | `gallery`, `website_content`, `translations`                                                     |
| Operations   | `audit_logs`, `rate_limits`                                                                      |

There are no notification-delivery or payment tables because those integrations
are not implemented. Permissions are enforced by constrained roles in functions
and RLS rather than a generic configurable role/permission matrix.

## Invariants

UUIDs identify internal rows. A separate random booking reference is for display,
never authentication. Customer phones are deliberately not unique; shared numbers
never trigger automatic merging. Restrictive foreign keys preserve service and
appointment history. Catalog records are archived instead of deleted.

All instants use `timestamptz`. Weekly hours and date overrides use Casablanca
local time; intervals are limited to a single calendar day. Closures are explicit
instant intervals. Business currency is MAD and amounts are nonnegative integer
centimes. Consultation prices are null. Promotions use constrained percentages or
fixed centime reductions and cannot make an item negative.

`appointment_items` preserve name, original/discounted price, price type, duration,
buffers, provider, sequence and occupied start/end. Rescheduling changes only
allocation/provider timestamps, keeps the financial/duration snapshot and records
the prior items in history. Changing catalog data does not rewrite old bookings.

`allocations` use half-open `[start,end)` ranges. An exclusion constraint combines
resource UUID equality and overlapping `tstzrange` values when `active=true`.
Pending/confirmed/in-progress appointments own active allocations. Terminal state
changes deactivate them in the same transaction as the status/history update.
No clock-dependent constraint or implicit pending expiration is used.

## Access and transactions

Every application table has RLS enabled and anonymous/table mutation grants
revoked. Anonymous users can call only `public_catalog()`. Staff read permissions
require an active `admin_profiles` row and are restricted to appointments assigned
to the resource linked to that account, including customer/history access.
Authenticated users cannot update tables
directly; management writes go through `admin_save`, `owner_update_access` and
`anonymize_customer`, which verify role permissions. Server-only engine functions
are callable only with the service-role identity. Their HTTP callers validate
staff sessions or customer capabilities before forwarding controlled arguments.

`create_booking`, `change_booking` and `admin_save` acquire the same transaction
lock. After a schedule/configuration change, existing future allocations and
qualifications must still be feasible; otherwise the transaction rolls back with
up to 50 affected references. Date-specific exceptions override weekly hours for
the corresponding salon/resource and date. Closures take precedence over hours.

Idempotency keys bind the canonical request hash, token hash, actor and quote to
one appointment. Same-payload retries recover the committed receipt and snapshots.
Different payload reuse is rejected. Management tokens are never stored in raw
form in PostgreSQL; only SHA-256 hashes and expiry are retained.

The public Storage bucket is `salon-images`, with constrained MIME types and a
5 MiB limit. Upload permissions are server-only. Published gallery rows control
site presentation; the bucket itself contains public shareable image URLs.

## Testing and operations

The disposable PostgreSQL suite tests actual constraints, functions, grants and
concurrent transactions with separate connections. Supabase Auth/Storage schemas
are minimal compatibility fixtures; live API/provider verification remains a
separate launch requirement. The suite also preinstalls `btree_gist` outside the
public schema. Hashing uses PostgreSQL's built-in SHA-256 functions, avoiding
assumptions about the installation schema of pgcrypto.

Shared domain contracts are maintained in `src/lib/domain.ts`. Supabase CLI type
generation has not been run against a live project; generated database types must
not be claimed as delivered. Changes to deployed schemas require new migrations,
not edits to files already recorded in the migration ledger.
