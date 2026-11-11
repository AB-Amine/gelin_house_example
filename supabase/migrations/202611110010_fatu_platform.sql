-- Additive Fatu platform. Legacy scheduling transactions remain the allocation authority.
create table public.cities (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 travel_fee_minor integer not null default 0 check(travel_fee_minor between 0 and 100000000),
 active boolean not null default false, position integer not null default 0
);
create table public.service_cities (
 id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id),
 city_id uuid not null references public.cities(id), unique(service_id,city_id)
);
create table public.city_hours (
 id uuid primary key default gen_random_uuid(), city_id uuid not null references public.cities(id),
 weekday integer not null check(weekday between 0 and 6), opens time not null, closes time not null,
 check(opens<closes), unique(city_id,weekday,opens)
);
create table public.client_profiles (
 id uuid primary key references auth.users(id) on delete cascade, name text not null default '', phone text not null default '',
 locale text not null default 'fr' check(locale in ('fr','ar','en')), created_at timestamptz not null default now()
);
alter table public.services add column included_items text not null default '';
alter table public.appointments add column client_user_id uuid references auth.users(id) on delete set null,
 add column city_id uuid references public.cities(id), add column city_name text,
 add column event_address text not null default '', add column event_details text not null default '',
 add column travel_fee_minor integer not null default 0 check(travel_fee_minor>=0),
 add column currency text not null default 'MAD' check(currency ~ '^[A-Z]{3}$');
create index appointments_client on public.appointments(client_user_id,starts_at);
alter table public.idempotency_records add column context_hash text;
alter table public.promotions add column code text unique,
 add column max_uses integer check(max_uses>0), add column usage_count integer not null default 0 check(usage_count>=0);
alter table public.gallery add column consent_confirmed boolean not null default false,
 add column temporary boolean not null default false;
create table public.reviews (
 id uuid primary key default gen_random_uuid(), name text not null, body text not null,
 rating integer check(rating between 1 and 5), consent_confirmed boolean not null default false,
 verified boolean not null default false, published boolean not null default false, position integer not null default 0
);
create table public.contact_messages (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text not null default '',
 subject text not null, message text not null, handled boolean not null default false, created_at timestamptz not null default now()
);
create table public.change_requests (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id),
 client_user_id uuid not null references auth.users(id), kind text not null check(kind in ('cancel','reschedule')),
 proposed_start timestamptz, reason text not null, status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now(), resolved_at timestamptz,
 check(kind<>'reschedule' or proposed_start is not null)
);
create unique index one_pending_change on public.change_requests(appointment_id) where status='pending';
create table public.payment_records (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id),
 amount_minor integer not null check(amount_minor>0), currency text not null check(currency ~ '^[A-Z]{3}$'),
 kind text not null check(kind in ('payment','refund')), method text not null,
 received_at timestamptz not null default now(), recorded_by uuid not null references public.admin_profiles(id)
);
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), appointment_id uuid references public.appointments(id),
 event text not null, status text not null default 'queued' check(status in ('queued','sent','failed')),
 created_at timestamptz not null default now(), sent_at timestamptz
);
-- No public/customer table grants: ownership access uses explicit safe projections below.
do $$ declare t text; begin
 foreach t in array array['cities','service_cities','city_hours','client_profiles','reviews','contact_messages','change_requests','payment_records','notification_outbox'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy active_admin_read on public.%I for select to authenticated using (public.staff_role() is not null)',t);
 end loop;
end $$;

-- Configurable IANA timezone; store an immutable currency on each booking.
alter table public.salon_settings drop constraint salon_settings_timezone_check;
alter table public.salon_settings drop constraint salon_settings_currency_check;
alter table public.salon_settings add constraint salon_settings_currency_check check(currency ~ '^[A-Z]{3}$');
create function public.validate_studio_timezone() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin
 perform now() at time zone new.timezone; return new;
end $$;
create trigger validate_studio_timezone before insert or update of timezone on public.salon_settings for each row execute function public.validate_studio_timezone();
do $$ declare definition text; begin
 select pg_get_functiondef('public.resource_free(uuid,timestamptz,timestamptz,uuid)'::regprocedure) into definition;
 execute replace(definition,'''Africa/Casablanca''','(select timezone from public.salon_settings where id=1)');
 -- Coded offers are only applied by the context-aware quote, never automatically.
 select pg_get_functiondef('public.booking_plan(uuid[],timestamptz,uuid)'::regprocedure) into definition;
 execute replace(definition,'where ps.service_id=sid and p.active','where ps.service_id=sid and (p.code is null or p.code='''') and (p.max_uses is null or p.usage_count<p.max_uses) and p.active');
end $$;

create function public.fatu_plan(p_services uuid[],p_start timestamptz,p_city uuid,p_code text default '',p_ignore uuid default null)
returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare plan jsonb; c cities; cfg salon_settings; promo promotions; item jsonb; items jsonb:='[]'; discount integer; amount integer; total integer:=0; tz text; begin
 select * into cfg from salon_settings where id=1; tz:=cfg.timezone;
 select * into c from cities where id=p_city and active;
 if not found then raise exception 'CITY_UNAVAILABLE'; end if;
 if exists(select 1 from unnest(p_services) s where not exists(select 1 from service_cities sc where sc.service_id=s and sc.city_id=p_city)) then raise exception 'CITY_SERVICE_UNAVAILABLE'; end if;
 plan:=booking_plan(p_services,p_start,p_ignore);
 if not exists(select 1 from city_hours h where h.city_id=p_city and h.weekday=extract(dow from p_start at time zone tz)
  and h.opens<=(p_start at time zone tz)::time and h.closes>=((plan->>'ends_at')::timestamptz at time zone tz)::time
  and (p_start at time zone tz)::date=((plan->>'ends_at')::timestamptz at time zone tz)::date) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if nullif(trim(p_code),'') is not null then
  select * into promo from promotions where upper(code)=upper(trim(p_code)) and active and starts_at<=now() and ends_at>now() and (max_uses is null or usage_count<max_uses);
  if not found then raise exception 'PROMOTION_UNAVAILABLE'; end if;
 end if;
 for item in select * from jsonb_array_elements(plan->'items') loop
  amount:=(item->>'original_minor')::integer;
  if promo.id is not null and item->>'price_type'='fixed' and exists(select 1 from promotion_services where promotion_id=promo.id and service_id=(item->>'service_id')::uuid) then
   discount:=least(amount,case when promo.kind='fixed' then promo.value else round(amount::numeric*promo.value/100)::integer end);
   if discount>(item->>'discount_minor')::integer then item:=item||jsonb_build_object('discount_minor',discount,'final_minor',amount-discount,'promotion_name',promo.name,'promotion_id',promo.id); end if;
  end if;
  items:=items||jsonb_build_array(item); total:=total+coalesce((item->>'final_minor')::integer,0);
 end loop;
 plan:=plan||jsonb_build_object('items',items,'total_minor',total+c.travel_fee_minor,'travel_fee_minor',c.travel_fee_minor,'city_id',c.id,'city_name',c.name,'currency',cfg.currency,'timezone',tz,'code',upper(trim(p_code)));
 return plan||jsonb_build_object('fingerprint',encode(sha256(convert_to(plan::text,'UTF8')),'hex'));
end $$;
create function public.fatu_slots(p_services uuid[],p_date date,p_city uuid,p_code text default '') returns jsonb
language plpgsql stable set search_path=public,pg_temp as $$ declare s jsonb; plan jsonb; result jsonb:='[]'; begin
 for s in select * from jsonb_array_elements(available_slots(p_services,p_date)) loop
  begin plan:=fatu_plan(p_services,(s->>'starts_at')::timestamptz,p_city,p_code); result:=result||jsonb_build_array(s);
  exception when raise_exception then if sqlerrm<>'SLOT_UNAVAILABLE' then raise; end if; end;
 end loop; return result;
end $$;
create function public.create_fatu_booking(p_services uuid[],p_start timestamptz,p_city uuid,p_address text,p_details text,p_code text,p_name text,p_phone text,p_email text,p_notes text,p_key uuid,p_token_hash text,p_fingerprint text,p_user uuid default null,p_source text default 'website',p_actor uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare plan jsonb; base jsonb; result jsonb; digest text; idem idempotency_records; item jsonb; a_id uuid; begin
 perform pg_advisory_xact_lock(711042);
 if length(trim(p_address)) not between 5 and 500 or length(p_details)>2000 then raise exception 'INVALID_INPUT'; end if;
 digest:=encode(sha256(convert_to(jsonb_build_array(p_services,p_start,p_city,p_address,p_details,p_code,p_name,p_phone,p_email,p_notes,p_token_hash,p_fingerprint,p_user,p_source,p_actor)::text,'UTF8')),'hex');
 select * into idem from idempotency_records where key=p_key;
 if found then
  if idem.context_hash is distinct from digest then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
  select jsonb_build_object('id',id,'reference',reference,'status',status,'booking',manage_booking(p_token_hash)) into result from appointments where id=idem.appointment_id; return result;
 end if;
 plan:=fatu_plan(p_services,p_start,p_city,p_code);
 if plan->>'fingerprint' is distinct from p_fingerprint then raise exception 'QUOTE_CHANGED'; end if;
 base:=quote_booking(p_services,p_start);
 result:=create_booking(p_services,p_start,p_name,p_phone,p_email,p_notes,p_key,p_token_hash,base->>'fingerprint',p_source,p_actor); a_id:=(result->>'id')::uuid;
 update appointments set client_user_id=p_user,city_id=p_city,city_name=plan->>'city_name',event_address=trim(p_address),event_details=p_details,travel_fee_minor=(plan->>'travel_fee_minor')::integer,currency=plan->>'currency',total_minor=(plan->>'total_minor')::integer where id=a_id;
 for item in select * from jsonb_array_elements(plan->'items') loop
  update appointment_items set discount_minor=(item->>'discount_minor')::integer,final_minor=(item->>'final_minor')::integer,promotion_name=item->>'promotion_name' where appointment_id=a_id and service_id=(item->>'service_id')::uuid;
 end loop;
 -- Count each actually selected promotion once per appointment while holding the scheduling lock.
 update promotions set usage_count=usage_count+1 where id in (select distinct (i->>'promotion_id')::uuid from jsonb_array_elements(plan->'items') i where i ? 'promotion_id');
 update idempotency_records set context_hash=digest where key=p_key;
 insert into notification_outbox(appointment_id,event) values(a_id,'booking_requested');
 return result||jsonb_build_object('booking',manage_booking(p_token_hash));
end $$;
do $$ declare f regprocedure; begin
 foreach f in array array['public.fatu_plan(uuid[],timestamptz,uuid,text,uuid)'::regprocedure,'public.fatu_slots(uuid[],date,uuid,text)'::regprocedure,'public.create_fatu_booking(uuid[],timestamptz,uuid,text,text,text,text,text,text,text,uuid,text,text,uuid,text,uuid)'::regprocedure] loop
  execute format('revoke all on function %s from public,anon,authenticated',f); execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;

create function public.client_profile(p_name text default null,p_phone text default null,p_locale text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare result jsonb; metadata jsonb; begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 if p_name is not null and length(trim(p_name)) not between 2 and 120 then raise exception 'INVALID_INPUT'; end if;
 if p_phone is not null and length(p_phone)>30 then raise exception 'INVALID_INPUT'; end if;
 select coalesce(raw_user_meta_data,'{}'::jsonb) into metadata from auth.users where id=auth.uid();
 insert into client_profiles(id,name,phone,locale) values(auth.uid(),coalesce(p_name,case when jsonb_typeof(metadata->'name')='string' then left(metadata->>'name',120) else '' end),coalesce(p_phone,case when jsonb_typeof(metadata->'phone')='string' then left(metadata->>'phone',30) else '' end),coalesce(p_locale,case when metadata->>'locale' in ('fr','ar','en') then metadata->>'locale' else 'fr' end))
 on conflict(id) do update set name=coalesce(p_name,client_profiles.name),phone=coalesce(p_phone,client_profiles.phone),locale=coalesce(p_locale,client_profiles.locale);
 select to_jsonb(p) into result from client_profiles p where id=auth.uid(); return result;
end $$;
create function public.client_bookings() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'reference',a.reference,'status',a.status,'starts_at',a.starts_at,'ends_at',a.ends_at,'total_minor',a.total_minor,'currency',a.currency,'travel_fee_minor',a.travel_fee_minor,'city_name',a.city_name,'event_address',a.event_address,'uncertain',a.uncertain,
 'items',(select jsonb_agg(jsonb_build_object('name',i.name,'duration_minutes',i.duration_minutes,'final_minor',i.final_minor) order by sequence) from appointment_items i where i.appointment_id=a.id),
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'status',r.status,'proposed_start',r.proposed_start,'created_at',r.created_at) order by created_at desc),'[]') from change_requests r where r.appointment_id=a.id)) order by a.starts_at desc),'[]') from appointments a where a.client_user_id=auth.uid()
$$;
create function public.client_request(p_id uuid,p_kind text,p_reason text,p_start timestamptz default null) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$ declare a appointments; cfg salon_settings; result uuid; begin
 perform pg_advisory_xact_lock(711042);
 select * into a from appointments where id=p_id and client_user_id=auth.uid() for update;
 if not found or auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 select * into cfg from salon_settings where id=1;
 if a.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION'; end if;
 if length(trim(p_reason)) not between 3 and 2000 then raise exception 'REASON_REQUIRED'; end if;
 if p_kind='cancel' and (not cfg.cancellation_enabled or a.starts_at<now()+make_interval(hours=>cfg.cancellation_notice_hours)) then raise exception 'POLICY_BLOCKED'; end if;
 if p_kind='reschedule' then
  if not cfg.rescheduling_enabled or a.starts_at<now()+make_interval(hours=>cfg.rescheduling_notice_hours) or p_start is null then raise exception 'POLICY_BLOCKED'; end if;
  if a.city_id is null then perform booking_plan(array(select service_id from appointment_items where appointment_id=a.id order by sequence),p_start,a.id); else perform fatu_plan(array(select service_id from appointment_items where appointment_id=a.id order by sequence),p_start,a.city_id,'',a.id); end if;
 end if;
 insert into change_requests(appointment_id,client_user_id,kind,proposed_start,reason) values(a.id,auth.uid(),p_kind,p_start,trim(p_reason)) returning id into result;
 insert into notification_outbox(appointment_id,event) values(a.id,'change_requested'); return result;
end $$;
create function public.claim_guest_booking(p_user uuid,p_token_hash text) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare a appointments; begin
 select * into a from appointments where token_hash=p_token_hash and token_expires_at>now() for update;
 if not found or p_user is null or (a.client_user_id is not null and a.client_user_id<>p_user) then raise exception 'FORBIDDEN'; end if;
 update appointments set client_user_id=p_user where id=a.id;
end $$;
revoke all on function public.claim_guest_booking(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_guest_booking(uuid,text) to service_role;
revoke all on function public.client_profile(text,text,text),public.client_bookings(),public.client_request(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.client_profile(text,text,text),public.client_bookings(),public.client_request(uuid,text,text,timestamptz) to authenticated;

create function public.resolve_client_request(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r change_requests; a appointments; begin
 perform pg_advisory_xact_lock(711042);
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 select * into r from change_requests where id=p_id and status='pending' for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_accept then
  select * into a from appointments where id=r.appointment_id;
  if r.kind='reschedule' then
   if a.city_id is not null then perform fatu_plan(array(select service_id from appointment_items where appointment_id=a.id order by sequence),r.proposed_start,a.city_id,'',a.id); end if;
   perform change_booking(a.id,'reschedule',r.proposed_start,auth.uid(),null,r.reason);
  else perform change_booking(a.id,'cancelled_by_customer',null,auth.uid(),null,r.reason); end if;
 end if;
 update change_requests set status=case when p_accept then 'accepted' else 'rejected' end,resolved_at=now() where id=p_id;
 insert into notification_outbox(appointment_id,event) values(r.appointment_id,'change_resolved');
end $$;
revoke all on function public.resolve_client_request(uuid,boolean) from public,anon;
grant execute on function public.resolve_client_request(uuid,boolean) to authenticated;

-- Extend the existing guarded CMS, retaining its conflict checks and audit logging.
do $$ declare definition text; begin
 select pg_get_functiondef('public.admin_save(text,jsonb,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'''website_content'',''customers''','''website_content'',''customers'',''cities'',''service_cities'',''city_hours'',''reviews'',''translations''');
 definition:=replace(definition,'''promotion_services'',''gallery'')','''promotion_services'',''gallery'',''service_cities'',''city_hours'',''translations'')');
 execute definition;
end $$;

create function public.fatu_catalog() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select (public_catalog() - 'gallery' - 'promotions' - 'promotion_services')||jsonb_build_object(
  'cities',coalesce((select jsonb_agg(to_jsonb(c) order by position,name) from cities c where active),'[]'),
  'service_cities',coalesce((select jsonb_agg(to_jsonb(sc)) from service_cities sc join cities c on c.id=sc.city_id join services s on s.id=sc.service_id where c.active and s.published and not s.archived and (s.category_id is null or exists(select 1 from categories cat where cat.id=s.category_id and cat.published and not cat.archived))),'[]'),
  'gallery',coalesce((select jsonb_agg(to_jsonb(g) order by position) from gallery g where published and consent_confirmed and not temporary),'[]'),
  'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'body',body,'rating',rating) order by position) from reviews where published and verified and consent_confirmed),'[]'),
  'promotions',coalesce((select jsonb_agg(to_jsonb(p)-'code'-'max_uses'-'usage_count') from promotions p where active and code is null and starts_at<=now() and ends_at>now() and (max_uses is null or usage_count<max_uses)),'[]'),
  'promotion_services',coalesce((select jsonb_agg(to_jsonb(ps)) from promotion_services ps join promotions p on p.id=ps.promotion_id join services s on s.id=ps.service_id where s.published and not s.archived and (s.category_id is null or exists(select 1 from categories cat where cat.id=s.category_id and cat.published and not cat.archived)) and p.active and p.code is null and p.starts_at<=now() and p.ends_at>now() and (p.max_uses is null or p.usage_count<p.max_uses)),'[]'),
  'translations',coalesce((select jsonb_agg(to_jsonb(t)) from translations t where
   (t.entity='services' and exists(select 1 from services s where s.id=t.entity_id and s.published and not s.archived and (s.category_id is null or exists(select 1 from categories cat where cat.id=s.category_id and cat.published and not cat.archived)))) or
   (t.entity='categories' and exists(select 1 from categories c where c.id=t.entity_id and c.published and not c.archived)) or
   (t.entity='cities' and exists(select 1 from cities c where c.id=t.entity_id and c.active)) or
   (t.entity='website_content' and exists(select 1 from website_content c where c.id=t.entity_id and c.published))),'[]')
 )
$$;
revoke all on function public.fatu_catalog() from public;
grant execute on function public.fatu_catalog() to anon,authenticated,service_role;
