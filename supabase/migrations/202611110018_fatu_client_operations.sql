alter table public.client_profiles add column admin_notes text not null default '';
-- The client's own profile never includes administrator notes.
do $$ declare definition text; begin
 select pg_get_functiondef('public.client_profile(text,text,text)'::regprocedure) into definition;
 execute replace(definition,'select to_jsonb(p) into result','select jsonb_build_object(''id'',p.id,''name'',p.name,''phone'',p.phone,''locale'',p.locale,''created_at'',p.created_at) into result');
end $$;
create index appointments_city_dates on public.appointments(city_id,starts_at);
create index appointment_items_service_booking on public.appointment_items(service_id,appointment_id);

create function public.fatu_search_bookings(p_query text default '',p_status text default '',p_city uuid default null,p_service uuid default null,p_from timestamptz default null,p_to timestamptz default null,p_customer uuid default null,p_client uuid default null,p_reference text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$ declare result jsonb; begin
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 if length(p_query)>100 or p_page not between 1 and 10000 then raise exception 'INVALID_INPUT'; end if;
 with filtered as (
  select a.* from appointments a join customers c on c.id=a.customer_id where
   (p_query='' or strpos(lower(c.name||' '||c.phone||' '||a.reference),lower(trim(p_query)))>0) and
   (p_reference='' or a.reference=p_reference) and
   (p_status='' or a.status=p_status or (p_status='reschedule_requested' and exists(select 1 from change_requests r where r.appointment_id=a.id and r.kind='reschedule' and r.status='pending'))) and
   (p_city is null or a.city_id=p_city) and (p_service is null or exists(select 1 from appointment_items i where i.appointment_id=a.id and i.service_id=p_service)) and
   (p_customer is null or a.customer_id=p_customer) and (p_client is null or a.client_user_id=p_client) and
   (p_from is null or a.starts_at>=p_from) and (p_to is null or a.starts_at<p_to)
 ), paged as(select * from filtered order by starts_at,id limit 50 offset (p_page-1)*50)
 select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(
   (to_jsonb(a)-'token_hash'-'token_expires_at')||jsonb_build_object(
    'customers',(select jsonb_build_object('name',c.name,'phone',c.phone,'email',c.email) from customers c where c.id=a.customer_id),
    'pending_request_kind',(select kind from change_requests r where r.appointment_id=a.id and status='pending' limit 1),
    'appointment_items',(select jsonb_agg((to_jsonb(i)-'resource_id')||jsonb_build_object('resources',(select jsonb_build_object('name',name) from resources where id=i.resource_id)) order by sequence) from appointment_items i where i.appointment_id=a.id)
   ) order by a.starts_at,a.id) from paged a),'[]')) into result;
 return result;
end $$;

create function public.fatu_clients(p_query text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$ declare result jsonb; begin
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 if length(p_query)>100 or p_page not between 1 and 10000 then raise exception 'INVALID_INPUT'; end if;
 with people as(
  select p.id,'account'::text kind,coalesce(nullif(p.name,''),(select c.name from appointments a join customers c on c.id=a.customer_id where a.client_user_id=p.id order by a.created_at desc limit 1),'') name,
   p.phone,coalesce(u.email,'') email,p.admin_notes notes,
   (select count(*) from appointments where client_user_id=p.id) bookings,
   (select count(*) from appointments where client_user_id=p.id and status='completed') completed,
   (select min(starts_at) from appointments where client_user_id=p.id and ends_at>now() and status in ('pending','confirmed','in_progress')) next_at
  from client_profiles p join auth.users u on u.id=p.id
  union all
  select c.id,'guest',c.name,c.phone,coalesce(c.email,''),c.notes,
   (select count(*) from appointments where customer_id=c.id and client_user_id is null),
   (select count(*) from appointments where customer_id=c.id and client_user_id is null and status='completed'),
   (select min(starts_at) from appointments where customer_id=c.id and client_user_id is null and ends_at>now() and status in ('pending','confirmed','in_progress'))
  from customers c where exists(select 1 from appointments a where a.customer_id=c.id and a.client_user_id is null)
 ), filtered as(select * from people where p_query='' or strpos(lower(name||' '||phone||' '||email),lower(trim(p_query)))>0),
 paged as(select * from filtered order by name,id limit 50 offset (p_page-1)*50)
 select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p) order by name,id) from paged p),'[]')) into result;
 return result;
end $$;
create function public.admin_client_note(p_id uuid,p_kind text,p_note text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 if length(p_note)>5000 then raise exception 'INVALID_INPUT'; end if;
 if p_kind='account' then update client_profiles set admin_notes=p_note where id=p_id;
 elsif p_kind='guest' then update customers set notes=p_note where id=p_id;
 else raise exception 'INVALID_INPUT'; end if;
 if not found then raise exception 'NOT_FOUND'; end if;
 insert into audit_logs(actor,action,entity,entity_id) values(auth.uid(),'client_note',case when p_kind='account' then 'client_profiles' else 'customers' end,p_id::text);
end $$;
revoke all on function public.fatu_search_bookings(text,text,uuid,uuid,timestamptz,timestamptz,uuid,uuid,text,integer),public.fatu_clients(text,integer),public.admin_client_note(uuid,text,text) from public,anon;
grant execute on function public.fatu_search_bookings(text,text,uuid,uuid,timestamptz,timestamptz,uuid,uuid,text,integer),public.fatu_clients(text,integer),public.admin_client_note(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
