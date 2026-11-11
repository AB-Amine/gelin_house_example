-- Close compatibility projections too: older public callers must not reveal codes or unconsented images.
do $$ declare definition text; begin
 select pg_get_functiondef('public.public_catalog()'::regprocedure) into definition;
 definition:=replace(definition,'to_jsonb(p))','to_jsonb(p)-''code''-''max_uses''-''usage_count'')');
 definition:=replace(definition,'where active and starts_at','where active and code is null and starts_at');
 definition:=replace(definition,'where p.active and p.starts_at','where p.active and p.code is null and p.starts_at');
 definition:=replace(definition,'from gallery g where published','from gallery g where published and consent_confirmed and not temporary');
 execute definition;
 -- All rescheduling callers validate the city, including older guest/admin endpoints.
 select pg_get_functiondef('public.change_booking(uuid,text,timestamptz,uuid,text,text)'::regprocedure) into definition;
 definition:=replace(definition,'plan:=booking_plan(ids,p_new_start,a.id);','if a.city_id is not null then perform fatu_plan(ids,p_new_start,a.city_id,'''',a.id); end if; plan:=booking_plan(ids,p_new_start,a.id);');
 execute definition;
end $$;

-- A CMS edit cannot strand a scheduled city booking. Run inside admin_save's transaction/lock.
create function public.guard_city_schedule() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare tz text; begin
 perform pg_advisory_xact_lock(711042);
 select timezone into tz from salon_settings where id=1;
 if exists(select 1 from appointments a where a.city_id is not null and a.ends_at>now() and a.status in ('pending','confirmed','in_progress') and (
  not exists(select 1 from cities c where c.id=a.city_id and c.active) or
  exists(select 1 from appointment_items i where i.appointment_id=a.id and not exists(select 1 from service_cities sc where sc.service_id=i.service_id and sc.city_id=a.city_id)) or
  not exists(select 1 from city_hours h where h.city_id=a.city_id and h.weekday=extract(dow from a.starts_at at time zone tz) and h.opens<=(a.starts_at at time zone tz)::time and h.closes>=(a.ends_at at time zone tz)::time and (a.starts_at at time zone tz)::date=(a.ends_at at time zone tz)::date)
 )) then raise exception 'EXISTING_APPOINTMENTS'; end if;
 return null;
end $$;
create trigger guard_city_schedule after insert or update or delete on public.cities for each statement execute function public.guard_city_schedule();
create trigger guard_city_schedule after insert or update or delete on public.service_cities for each statement execute function public.guard_city_schedule();
create trigger guard_city_schedule after insert or update or delete on public.city_hours for each statement execute function public.guard_city_schedule();

create function public.record_payment(p_appointment uuid,p_amount integer,p_currency text,p_kind text,p_method text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$ declare a appointments; result uuid; received bigint; begin
 perform pg_advisory_xact_lock(711042);
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 select * into a from appointments where id=p_appointment for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if a.currency<>p_currency or length(trim(p_method)) not between 2 and 80 then raise exception 'INVALID_INPUT'; end if;
 if p_kind='refund' then
  select coalesce(sum(case when kind='payment' then amount_minor else -amount_minor end),0) into received from payment_records where appointment_id=p_appointment;
  if p_amount>received then raise exception 'INVALID_INPUT'; end if;
 end if;
 insert into payment_records(appointment_id,amount_minor,currency,kind,method,recorded_by) values(p_appointment,p_amount,p_currency,p_kind,trim(p_method),auth.uid()) returning id into result;
 insert into audit_logs(actor,action,entity,entity_id) values(auth.uid(),'record_payment','payment_records',result::text);
 return result;
end $$;
revoke all on function public.record_payment(uuid,integer,text,text,text) from public,anon;
grant execute on function public.record_payment(uuid,integer,text,text,text) to authenticated;

-- Notifications are delivery work, never claimed as sent by the UI. Only a server worker may mark delivery.
create function public.queue_booking_notification() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin
 if new.status is distinct from old.status then insert into notification_outbox(appointment_id,event) values(new.id,'status_'||new.status); end if; return new;
end $$;
create trigger queue_booking_notification after update of status on public.appointments for each row execute function public.queue_booking_notification();

-- Keep the old management-token projection safe while including the immutable city/currency snapshots.
do $$ declare definition text; begin
 select pg_get_functiondef('public.manage_booking(text)'::regprocedure) into definition;
 definition:=replace(definition,'''total_minor'',a.total_minor','''currency'',a.currency,''city_id'',a.city_id,''city_name'',a.city_name,''travel_fee_minor'',a.travel_fee_minor,''event_address'',a.event_address,''total_minor'',a.total_minor');
 execute definition;
end $$;
