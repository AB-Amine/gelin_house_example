-- Preserve approved content; replace only unapproved legacy defaults during this brand migration.
update public.salon_settings set name='Fatu Makeup Artist',hero_title='',hero_subtitle='',instagram='https://www.instagram.com/fatu_makeupartist/'
 where not approved and name='GELIN HOUSE';
create function public.guard_timezone_schedule() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin
 perform pg_advisory_xact_lock(711042);
 if exists(select 1 from appointments a join allocations al on al.appointment_id=a.id where a.ends_at>now() and al.active and not resource_free(al.resource_id,al.starts_at,al.ends_at,a.id)) then raise exception 'EXISTING_APPOINTMENTS'; end if;
 return null;
end $$;
create trigger guard_timezone_schedule after update of timezone on public.salon_settings for each statement execute function public.guard_timezone_schedule();
create trigger guard_city_timezone_schedule after update of timezone on public.salon_settings for each statement execute function public.guard_city_schedule();
do $$ declare definition text; begin
 select pg_get_functiondef('public.admin_save(text,jsonb,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'if p_table=''salon_settings'' then','if p_table=''salon_settings'' then
   if (p_data->>''booking_enabled'')::boolean and not exists(select 1 from cities c join city_hours h on h.city_id=c.id join service_cities sc on sc.city_id=c.id join services s on s.id=sc.service_id where c.active and s.published and s.bookable and not s.archived) then raise exception ''NOT_CONFIGURED''; end if;');
 execute definition;
end $$;
