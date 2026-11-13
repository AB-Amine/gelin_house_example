-- Unknown duration is a genuine missing value, never a fabricated appointment length.
alter table public.services alter column duration_minutes drop not null;
alter table public.services add column subcategory text not null default '',
 add column service_group text not null default '',
 add column service_type text not null default 'appointment' check(service_type in ('appointment','rental'));
-- Retain all existing allocation/qualification/city/quote constraints and functions.
-- Existing bookable services have a duration and retain their settings.
alter table public.services add constraint service_booking_information
 check(not bookable or (duration_minutes is not null and service_type='appointment'));
notify pgrst,'reload schema';
