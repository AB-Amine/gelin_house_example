-- Explicit manual start-time diary. Equal internal timestamps are a marker, not a treatment duration.
alter table public.appointments add column scheduling_mode text not null default 'interval' check(scheduling_mode in ('interval','diary'));
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.appointments'::regclass and contype='c'
   and pg_get_constraintdef(oid) like '%starts_at%ends_at%' loop
   execute format('alter table public.appointments drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.appointments add constraint appointment_time_model check(
 (scheduling_mode='interval' and starts_at<ends_at) or (scheduling_mode='diary' and starts_at=ends_at));
alter table public.appointment_items alter column duration_minutes drop not null, alter column resource_id drop not null;
create unique index diary_unique_active_start on public.appointments(starts_at)
 where scheduling_mode='diary' and status in ('pending','confirmed','in_progress');

create function public.guard_exact_appointment_start() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin
 perform pg_advisory_xact_lock(711042);
 if new.status in ('pending','confirmed','in_progress') and exists(select 1 from appointments a where a.id<>new.id
   and a.status in ('pending','confirmed','in_progress') and a.starts_at=new.starts_at) then raise exception 'START_TIME_TAKEN'; end if;
 return new;
end $$;
create trigger guard_exact_appointment_start before insert or update of starts_at,status on public.appointments
 for each row execute function public.guard_exact_appointment_start();

create function public.create_diary_appointment(p_services uuid[],p_start timestamptz,p_name text,p_phone text,p_email text,p_notes text,p_actor uuid,p_key uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare cfg salon_settings; a appointments; idem idempotency_records; digest text; sid uuid; s services; customer uuid;
 result uuid; sequence_no integer:=0; total integer:=0; uncertain_price boolean:=false; discount integer; promo record; promo_ids uuid[]:='{}'; begin
 perform pg_advisory_xact_lock(711042);
 if not exists(select 1 from admin_profiles where id=p_actor and active and role in ('owner','manager')) then raise exception 'FORBIDDEN'; end if;
 if p_start is null or extract(second from p_start)<>0 or length(trim(p_name)) not between 2 and 120 or length(p_phone) not between 8 and 30 or length(coalesce(p_notes,''))>2000 then raise exception 'INVALID_INPUT'; end if;
 if coalesce(cardinality(p_services),0) not between 1 and 10 or cardinality(p_services)<>(select count(distinct v) from unnest(p_services)v) then raise exception 'INVALID_SERVICES'; end if;
 digest:=encode(sha256(convert_to(jsonb_build_array(p_services,p_start,p_name,p_phone,p_email,p_notes,p_actor)::text,'UTF8')),'hex');
 select * into idem from idempotency_records where key=p_key;
 if found then
   if idem.request_hash<>digest then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
   select * into a from appointments where id=idem.appointment_id;
   return jsonb_build_object('id',a.id,'reference',a.reference,'status',a.status);
 end if;
 if exists(select 1 from unnest(p_services) v where not exists(select 1 from services svc where svc.id=v and svc.published and not svc.archived and svc.service_type='appointment'
   and (svc.category_id is null or exists(select 1 from categories c where c.id=svc.category_id and c.published and not c.archived)))) then raise exception 'SERVICE_UNAVAILABLE'; end if;
 select * into cfg from salon_settings where id=1;
 if not cfg.approved or not cfg.booking_enabled or length(trim(coalesce(cfg.address,'')))<5 then raise exception 'REQUEST_SETUP_REQUIRED'; end if;
 insert into customers(name,phone,email) values(trim(p_name),p_phone,nullif(p_email,'')) returning id into customer;
 insert into appointments(customer_id,starts_at,ends_at,status,source,total_minor,uncertain,notes,token_hash,token_expires_at,scheduling_mode,city_id,city_name,event_address,currency)
 values(customer,p_start,p_start,'confirmed','other',0,true,coalesce(p_notes,''),encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'),p_start+interval '90 days','diary',
 (select id from cities where slug='salon' limit 1),'Khouribga',cfg.address,cfg.currency) returning id into result;
 foreach sid in array p_services loop
   select * into s from services where id=sid; sequence_no:=sequence_no+1; discount:=0;
   select null::uuid id,null::text name into promo;
   if s.price_type='fixed' then
     select p.id,p.name,least(s.price_minor,case when p.kind='fixed' then p.value else round(s.price_minor::numeric*p.value/100)::integer end) reduction into promo
     from promotions p join promotion_services ps on ps.promotion_id=p.id where ps.service_id=sid and p.active and (p.code is null or p.code='')
       and p.starts_at<=now() and p.ends_at>now() and (p.max_uses is null or p.usage_count<p.max_uses) order by reduction desc,p.id limit 1;
     if found then discount:=promo.reduction; promo_ids:=array_append(promo_ids,promo.id); end if;
   end if;
   total:=total+coalesce(s.price_minor-discount,0); uncertain_price:=uncertain_price or s.price_type<>'fixed' or s.price_minor is null;
   insert into appointment_items(appointment_id,service_id,sequence,name,duration_minutes,buffer_before,buffer_after,price_type,original_minor,discount_minor,final_minor,promotion_name,resource_id,starts_at,ends_at)
   values(result,sid,sequence_no,s.name,null,0,0,s.price_type,s.price_minor,discount,s.price_minor-discount,promo.name,null,p_start,p_start);
 end loop;
 update appointments set total_minor=total,uncertain=uncertain_price where id=result;
 update promotions set usage_count=usage_count+1 where id=any(promo_ids);
 insert into appointment_history(appointment_id,actor,action,details) values(result,p_actor::text,'confirmed',jsonb_build_object('scheduling_mode','diary','duration_known',false));
 insert into idempotency_records(key,request_hash,appointment_id) values(p_key,digest,result);
 return (select jsonb_build_object('id',id,'reference',reference,'status',status) from appointments where id=result);
end $$;
revoke all on function public.create_diary_appointment(uuid[],timestamptz,text,text,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_diary_appointment(uuid[],timestamptz,text,text,text,text,uuid,uuid) to service_role;

create or replace function public.resolve_appointment_request(p_id uuid,p_action text,p_actor uuid,p_date date default null,p_time time default null,p_services uuid[] default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r contact_messages; cfg salon_settings; result jsonb; begin
 perform pg_advisory_xact_lock(711042);
 if not exists(select 1 from admin_profiles where id=p_actor and active and role in ('owner','manager')) then raise exception 'FORBIDDEN'; end if;
 select * into r from contact_messages where id=p_id and subject='Demande de rendez-vous' for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_action='confirm' and r.appointment_id is not null then return (select jsonb_build_object('id',id,'reference',reference,'status',status) from appointments where id=r.appointment_id); end if;
 if r.request_status<>'pending' then raise exception 'INVALID_TRANSITION'; end if;
 if p_action='reject' then update contact_messages set request_status='rejected',handled=true where id=p_id;return jsonb_build_object('status','rejected'); end if;
 if p_action not in ('modify','confirm') then raise exception 'INVALID_INPUT'; end if;
 r.preferred_date:=coalesce(p_date,r.preferred_date);r.preferred_time:=coalesce(p_time,r.preferred_time);r.service_ids:=coalesce(p_services,r.service_ids);
 if r.preferred_date is null then raise exception 'REQUEST_DATE_REQUIRED'; end if;
 if p_action='modify' then update contact_messages set preferred_date=r.preferred_date,preferred_time=r.preferred_time,service_ids=r.service_ids where id=p_id;return jsonb_build_object('status','pending'); end if;
 if r.preferred_time is null then raise exception 'REQUEST_TIME_REQUIRED'; end if;
 select * into cfg from salon_settings where id=1;
 result:=create_diary_appointment(r.service_ids,(r.preferred_date+r.preferred_time) at time zone cfg.timezone,r.name,r.phone,r.email,left(r.message,2000),p_actor,r.id);
 update contact_messages set request_status='confirmed',handled=true,appointment_id=(result->>'id')::uuid,preferred_date=r.preferred_date,preferred_time=r.preferred_time,service_ids=r.service_ids where id=p_id;
 return result;
end $$;

alter function public.change_booking(uuid,text,timestamptz,uuid,text,text) rename to change_interval_booking;
create function public.change_booking(p_id uuid,p_action text,p_new_start timestamptz default null,p_actor uuid default null,p_token_hash text default null,p_reason text default '')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a appointments; begin
 perform pg_advisory_xact_lock(711042);select * into a from appointments where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if a.scheduling_mode='interval' then perform change_interval_booking(p_id,p_action,p_new_start,p_actor,p_token_hash,p_reason);return;end if;
 if p_actor is null or not exists(select 1 from admin_profiles where id=p_actor and active and role in ('owner','manager')) then raise exception 'FORBIDDEN'; end if;
 if p_action='reschedule' then
   if a.status not in ('pending','confirmed') or p_new_start is null or extract(second from p_new_start)<>0 then raise exception 'INVALID_TRANSITION';end if;
   update appointments set starts_at=p_new_start,ends_at=p_new_start,token_expires_at=p_new_start+interval '90 days' where id=p_id;
   update appointment_items set starts_at=p_new_start,ends_at=p_new_start where appointment_id=p_id;
 else
   if not ((a.status='pending' and p_action in ('confirmed','rejected','cancelled_by_customer','cancelled_by_salon')) or
     (a.status='confirmed' and p_action in ('in_progress','cancelled_by_customer','cancelled_by_salon','no_show')) or
     (a.status='in_progress' and p_action in ('completed','cancelled_by_salon'))) then raise exception 'INVALID_TRANSITION';end if;
   update appointments set status=p_action where id=p_id;
 end if;
 insert into appointment_history(appointment_id,actor,action,details) values(p_id,p_actor::text,p_action,jsonb_build_object('old_start',a.starts_at,'new_start',p_new_start,'old_status',a.status,'reason',p_reason));
end $$;
revoke all on function public.change_booking(uuid,text,timestamptz,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_booking(uuid,text,timestamptz,uuid,text,text) to service_role;
-- Interval schedule guards must keep protecting legacy bookings without treating diary entries as timed allocations.
do $$ declare definition text; begin
 select pg_get_functiondef('public.admin_save(text,jsonb,boolean)'::regprocedure) into definition;
 execute replace(definition,'where a.ends_at>now() and a.status in','where a.scheduling_mode=''interval'' and a.ends_at>now() and a.status in');
end $$;
notify pgrst,'reload schema';
