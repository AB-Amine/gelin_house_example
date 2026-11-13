-- Structured requests reuse the existing private inbox. No appointment is allocated on submission.
alter table public.contact_messages
 add column service_ids uuid[] not null default '{}',
 add column preferred_date date,
 add column preferred_time time,
 add column request_status text not null default 'pending' check(request_status in ('pending','confirmed','rejected')),
 add column appointment_id uuid references public.appointments(id);
create unique index one_request_per_appointment on public.contact_messages(appointment_id) where appointment_id is not null;

-- Recover only exact, unambiguous selections from the earlier text-only form.
update public.contact_messages m set
 service_ids=coalesce((select array_agg(s.id order by n.ordinality)
   from unnest(string_to_array(split_part(split_part(m.message,E'\n',1),': ',2),' ; ')) with ordinality n(name,ordinality)
   join public.services s on s.name=n.name
   where (select count(*) from public.services s2 where s2.name=n.name)=1),'{}'),
 preferred_date=case when pg_input_is_valid(substring(message from 'Date souhaitée : ([0-9]{4}-[0-9]{2}-[0-9]{2})'),'date')
   then substring(message from 'Date souhaitée : ([0-9]{4}-[0-9]{2}-[0-9]{2})')::date end,
 preferred_time=case when pg_input_is_valid(substring(message from 'Heure souhaitée : ([0-9]{2}:[0-9]{2})'),'time')
   then substring(message from 'Heure souhaitée : ([0-9]{2}:[0-9]{2})')::time end
 where subject='Demande de rendez-vous';
update public.contact_messages set service_ids='{}'
 where subject='Demande de rendez-vous' and cardinality(service_ids)<>cardinality(string_to_array(split_part(split_part(message,E'\n',1),': ',2),' ; '));

create function public.resolve_appointment_request(p_id uuid,p_action text,p_actor uuid,p_date date default null,p_time time default null,p_services uuid[] default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r contact_messages; cfg salon_settings; city_ids uuid[]; city uuid; plan jsonb; result jsonb; start_at timestamptz; begin
 -- Same lock order as the existing booking operations; serialises competing confirmations.
 perform pg_advisory_xact_lock(711042);
 if not exists(select 1 from admin_profiles where id=p_actor and active and role in ('owner','manager')) then raise exception 'FORBIDDEN'; end if;
 select * into r from contact_messages where id=p_id and subject='Demande de rendez-vous' for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_action='confirm' and r.appointment_id is not null then
   select jsonb_build_object('id',id,'reference',reference,'status',status) into result from appointments where id=r.appointment_id;
   return result;
 end if;
 if r.request_status<>'pending' then raise exception 'INVALID_TRANSITION'; end if;
 if p_action='reject' then
   update contact_messages set request_status='rejected',handled=true where id=p_id;
   return jsonb_build_object('status','rejected');
 end if;
 if p_action not in ('modify','confirm') then raise exception 'INVALID_INPUT'; end if;
 r.preferred_date:=coalesce(p_date,r.preferred_date); r.preferred_time:=coalesce(p_time,r.preferred_time);
 r.service_ids:=coalesce(p_services,r.service_ids);
 if cardinality(r.service_ids) not between 1 and 10 or cardinality(r.service_ids)<>(select count(distinct s) from unnest(r.service_ids)s)
   or exists(select 1 from unnest(r.service_ids)s where not exists(select 1 from services where id=s and published and not archived and service_type='appointment'))
 then raise exception 'INVALID_SERVICES'; end if;
 if r.preferred_date is null then raise exception 'REQUEST_DATE_REQUIRED'; end if;
 if p_action='modify' then
   update contact_messages set preferred_date=r.preferred_date,preferred_time=r.preferred_time,service_ids=r.service_ids where id=p_id;
   return jsonb_build_object('status','pending');
 end if;
 if r.preferred_time is null then raise exception 'REQUEST_TIME_REQUIRED'; end if;
 if exists(select 1 from services where id=any(r.service_ids) and (duration_minutes is null or duration_minutes<=0)) then raise exception 'REQUEST_DURATION_REQUIRED'; end if;
 select * into cfg from salon_settings where id=1;
 if not cfg.approved or not cfg.booking_enabled or length(trim(coalesce(cfg.address,'')))<5 then raise exception 'REQUEST_SETUP_REQUIRED'; end if;
 -- Use only a uniquely configured common city; never guess a city or staff assignment.
 select array_agg(c.id) into city_ids from cities c where c.active and not exists(
   select 1 from unnest(r.service_ids)s where not exists(select 1 from service_cities sc where sc.city_id=c.id and sc.service_id=s));
 if coalesce(cardinality(city_ids),0)<>1 then raise exception 'REQUEST_LOCATION_REQUIRED'; end if;
 city:=city_ids[1]; start_at:=(r.preferred_date+r.preferred_time) at time zone cfg.timezone;
 plan:=fatu_plan(r.service_ids,start_at,city,'');
 result:=create_fatu_booking(r.service_ids,start_at,city,cfg.address,'','',r.name,r.phone,r.email,left(r.message,2000),
   r.id,encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'),plan->>'fingerprint',null,'other',p_actor);
 perform change_booking((result->>'id')::uuid,'confirmed',null,p_actor);
 update contact_messages set request_status='confirmed',handled=true,appointment_id=(result->>'id')::uuid,
   preferred_date=r.preferred_date,preferred_time=r.preferred_time,service_ids=r.service_ids where id=p_id;
 return jsonb_build_object('id',result->>'id','reference',result->>'reference','status','confirmed');
end $$;
revoke all on function public.resolve_appointment_request(uuid,text,uuid,date,time,uuid[]) from public,anon,authenticated;
grant execute on function public.resolve_appointment_request(uuid,text,uuid,date,time,uuid[]) to service_role;
