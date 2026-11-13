-- Additive simplification: retain all existing records, RLS and interval guards.
alter table public.promotions add column audience text not null default 'public'
  check (audience in ('public','members'));
alter table public.contact_messages add column client_user_id uuid references auth.users(id) on delete set null;

-- A diary reserves a start, not an interval. Closing time is exclusive.
create function public.salon_start_open(p_start timestamptz) returns boolean
language sql volatile security definer set search_path=public,pg_temp as $$
 with local_start as (
   select p_start at time zone timezone t from salon_settings where id=1
 )
 select coalesce((select
   not exists(select 1 from closures c where c.resource_id is null and c.starts_at<=p_start and p_start<c.ends_at)
   and case when exists(select 1 from opening_exceptions e where e.resource_id is null and e.day=t::date)
     then exists(select 1 from opening_exceptions e where e.resource_id is null and e.day=t::date and e.opens<=t::time and t::time<e.closes)
     else exists(select 1 from working_hours h where h.resource_id is null and h.weekday=extract(dow from t) and h.opens<=t::time and t::time<h.closes)
   end from local_start),false)
$$;
revoke all on function public.salon_start_open(timestamptz) from public,anon,authenticated;
grant execute on function public.salon_start_open(timestamptz) to service_role;

create function public.guard_diary_opening() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(711042);
 if new.scheduling_mode='diary' and new.status in ('pending','confirmed','in_progress') then
   if tg_op='INSERT' then
     if not salon_start_open(new.starts_at) then raise exception 'SALON_CLOSED'; end if;
   elsif new.starts_at is distinct from old.starts_at or (new.status='confirmed' and old.status<>'confirmed') then
     if not salon_start_open(new.starts_at) then raise exception 'SALON_CLOSED'; end if;
   end if;
 end if;
 return new;
end $$;
create trigger guard_diary_opening before insert or update of starts_at,status on public.appointments
for each row execute function public.guard_diary_opening();

-- Reuse every existing save/security/audit check, then reject changes that would
-- close an already scheduled diary start. Raising rolls the whole save back.
alter function public.admin_save(text,jsonb,boolean) rename to admin_save_guarded_core;
revoke all on function public.admin_save_guarded_core(text,jsonb,boolean) from public,anon,authenticated;
create function public.admin_save(p_table text,p_data jsonb,p_delete boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare previously_open uuid[]; affected jsonb; result jsonb;
begin
 perform pg_advisory_xact_lock(711042);
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 if p_table in ('working_hours','opening_exceptions','closures') then
   select array_agg(id) into previously_open from appointments
   where scheduling_mode='diary' and starts_at>=now() and status in ('pending','confirmed','in_progress') and salon_start_open(starts_at);
 end if;
 result:=admin_save_guarded_core(p_table,p_data,p_delete);
 if previously_open is not null then
   select jsonb_agg(jsonb_build_object('reference',x.reference)) into affected from (
     select reference from appointments where id=any(previously_open) and not salon_start_open(starts_at) order by starts_at limit 50
   ) x;
   if affected is not null then raise exception 'EXISTING_APPOINTMENTS' using detail=affected::text; end if;
 end if;
 return result;
end $$;
revoke all on function public.admin_save(text,jsonb,boolean) from public,anon;
grant execute on function public.admin_save(text,jsonb,boolean) to authenticated;

-- Remove guests from the directory; keep them on their original appointments.
create or replace function public.fatu_clients(p_query text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; begin
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 if length(p_query)>100 or p_page not between 1 and 10000 then raise exception 'INVALID_INPUT'; end if;
 with people as (
   select p.id,'account'::text kind,p.name,p.phone,coalesce(u.email,'') email,coalesce((to_jsonb(u)->>'created_at')::timestamptz,p.created_at) created_at,
     (select count(*) from appointments a where a.client_user_id=p.id) bookings
   from client_profiles p join auth.users u on u.id=p.id
   where not exists(select 1 from admin_profiles ap where ap.id=p.id)
 ), filtered as (
   select * from people where p_query='' or strpos(lower(name||' '||phone||' '||email),lower(trim(p_query)))>0
 ), paged as (select * from filtered order by name,id limit 50 offset (p_page-1)*50)
 select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p) order by name,id) from paged p),'[]')) into result;
 return result;
end $$;

-- Customer sessions cannot create customer profiles for administrator identities.
do $$ declare definition text; begin
 select pg_get_functiondef('public.fatu_admin_summary(timestamptz,timestamptz)'::regprocedure) into definition;
 execute replace(definition,'(select count(*) from client_profiles)+(select count(*) from customers c where exists(select 1 from appointments a where a.customer_id=c.id and a.client_user_id is null))','(select count(*) from client_profiles p join auth.users u on u.id=p.id where not exists(select 1 from admin_profiles ap where ap.id=p.id))');
 select pg_get_functiondef('public.fatu_search_bookings(text,text,uuid,uuid,timestamptz,timestamptz,uuid,uuid,text,integer)'::regprocedure) into definition;
 execute replace(definition,'p_status='''' or a.status=p_status','p_status='''' or (p_status=''history'' and a.status in (''completed'',''cancelled_by_customer'',''cancelled_by_salon'',''rejected'',''no_show'')) or a.status=p_status');
 select pg_get_functiondef('public.client_profile(text,text,text)'::regprocedure) into definition;
 definition:=replace(definition,'if auth.uid() is null then','if auth.uid() is null or exists(select 1 from admin_profiles where id=auth.uid()) then');
 execute definition;
end $$;

-- The server stores request ownership from verified Auth, never from contact matching.
-- Only a request's trusted account link enables a member promotion at confirmation.
do $$ declare definition text; begin
 select pg_get_functiondef('public.create_diary_appointment(uuid[],timestamptz,text,text,text,text,uuid,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'result uuid;','result uuid; member uuid;');
 definition:=replace(definition,'insert into customers(name,phone,email)',
   'select p.id into member from contact_messages r join client_profiles p on p.id=r.client_user_id where r.id=p_key and not exists(select 1 from admin_profiles ap where ap.id=p.id); insert into customers(name,phone,email)');
 definition:=replace(definition,'insert into appointments(customer_id,starts_at','insert into appointments(customer_id,client_user_id,starts_at');
 definition:=replace(definition,'values(customer,p_start','values(customer,member,p_start');
 definition:=replace(definition,'where ps.service_id=sid and p.active','where ps.service_id=sid and (p.audience=''public'' or member is not null) and p.active');
 execute definition;
 -- Whitelist the new field in the existing atomic promotion editor.
 select pg_get_functiondef('public.admin_owner_form(text,jsonb,uuid[],jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'''code'',''max_uses'']','''code'',''max_uses'',''audience'']');
 execute definition;
end $$;

-- Public projections AND old pricing paths must exclude member promotions.
do $$ declare signature text; definition text; begin
 foreach signature in array array['public.public_catalog()','public.fatu_catalog()'] loop
   select pg_get_functiondef(signature::regprocedure) into definition;
   definition:=replace(definition,'from promotions p where active','from promotions p where p.audience=''public'' and active');
   definition:=replace(definition,'where p.active','where p.audience=''public'' and p.active');
   definition:=replace(definition,'and p.active','and p.audience=''public'' and p.active');
   execute definition;
 end loop;
 select pg_get_functiondef('public.booking_plan(uuid[],timestamptz,uuid)'::regprocedure) into definition;
 execute replace(definition,'where ps.service_id=sid and','where ps.service_id=sid and p.audience=''public'' and');
 select pg_get_functiondef('public.fatu_plan(uuid[],timestamptz,uuid,text,uuid)'::regprocedure) into definition;
 execute replace(definition,'where upper(code)=','where audience=''public'' and upper(code)=');
end $$;

create function public.client_offers() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from client_profiles where id=auth.uid())
   or exists(select 1 from admin_profiles where id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 return coalesce((select jsonb_agg((to_jsonb(p)-'code'-'max_uses'-'usage_count')||jsonb_build_object('services',
   (select coalesce(jsonb_agg(s.name order by s.position),'[]') from promotion_services ps join services s on s.id=ps.service_id
    where ps.promotion_id=p.id and s.published and not s.archived
    and (s.category_id is null or exists(select 1 from categories c where c.id=s.category_id and c.published and not c.archived)))) order by p.starts_at)
   from promotions p where p.audience='members' and p.active and p.ends_at>now()
   and (p.max_uses is null or p.usage_count<p.max_uses)),'[]');
end $$;
revoke all on function public.client_offers() from public,anon;
grant execute on function public.client_offers() to authenticated;

-- Keep the existing policy/ownership checks, but diary rescheduling uses starts.
do $$ declare definition text; begin
 select pg_get_functiondef('public.client_request(uuid,text,text,timestamptz)'::regprocedure) into definition;
 definition:=replace(definition,'if a.city_id is null then perform booking_plan',
   'if a.scheduling_mode=''diary'' then if not salon_start_open(p_start) then raise exception ''SALON_CLOSED''; end if; if exists(select 1 from appointments other where other.id<>a.id and other.starts_at=p_start and other.status in (''pending'',''confirmed'',''in_progress'')) then raise exception ''START_TIME_TAKEN''; end if; elsif a.city_id is null then perform booking_plan');
 execute definition;
 select pg_get_functiondef('public.resolve_client_request(uuid,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'if a.city_id is not null then perform fatu_plan','if a.scheduling_mode=''interval'' and a.city_id is not null then perform fatu_plan');
 execute definition;
end $$;

notify pgrst,'reload schema';
