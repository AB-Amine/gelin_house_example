create extension if not exists btree_gist;

create table public.admin_profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  role text not null check (role in ('owner','manager','staff')),
  active boolean not null default true
);
create table public.salon_settings (
  id integer primary key default 1 check(id=1),
  name text not null default 'GELIN HOUSE',
  approved boolean not null default false,
  booking_enabled boolean not null default false,
  phone text, whatsapp text, address text, map_url text,
  instagram text, about text not null default '',
  hero_title text not null default 'Un moment pour vous.',
  hero_subtitle text not null default 'Bienvenue chez GELIN HOUSE.',
  privacy_text text not null default '', policy_text text not null default '',
  timezone text not null default 'Africa/Casablanca' check(timezone='Africa/Casablanca'),
  currency text not null default 'MAD' check(currency='MAD'),
  notice_minutes integer not null default 120 check(notice_minutes>=0),
  horizon_days integer not null default 60 check(horizon_days between 1 and 365),
  increment_minutes integer not null default 15 check(increment_minutes between 5 and 120),
  cancellation_enabled boolean not null default false,
  rescheduling_enabled boolean not null default false,
  cancellation_notice_hours integer not null default 24 check(cancellation_notice_hours>=0),
  rescheduling_notice_hours integer not null default 24 check(rescheduling_notice_hours>=0),
  no_show_grace_minutes integer not null default 30 check(no_show_grace_minutes>=0)
);
insert into public.salon_settings(id) values(1);
create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  description text not null default '', position integer not null default 0,
  published boolean not null default false, archived boolean not null default false
);
create table public.services (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id),
  name text not null, slug text unique not null, description text not null default '',
  preparation text not null default '', duration_minutes integer not null check(duration_minutes between 5 and 720),
  buffer_before integer not null default 0 check(buffer_before between 0 and 240),
  buffer_after integer not null default 0 check(buffer_after between 0 and 240),
  price_type text not null default 'fixed' check(price_type in ('fixed','starting','consultation')),
  price_minor integer check(price_minor between 0 and 100000000),
  published boolean not null default false, archived boolean not null default false,
  bookable boolean not null default false, featured boolean not null default false,
  position integer not null default 0,
  check((price_type='consultation' and price_minor is null) or (price_type<>'consultation' and price_minor is not null))
);
create table public.resources (
  id uuid primary key default gen_random_uuid(), name text not null,
  kind text not null check(kind in ('staff','equipment')), active boolean not null default true
);
create table public.qualifications (
  id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.resources(id),
  service_id uuid not null references public.services(id), unique(resource_id,service_id)
);
create table public.service_resources (
  id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id),
  resource_id uuid not null references public.resources(id), unique(service_id,resource_id)
);
-- Null resource = salon hours; multiple rows allow split shifts and breaks.
create table public.working_hours (
  id uuid primary key default gen_random_uuid(), resource_id uuid references public.resources(id),
  weekday integer not null check(weekday between 0 and 6),
  opens time not null, closes time not null, check(opens<closes)
);
-- Null resource = salon-wide closure; supports staff leave and exceptions.
create table public.closures (
  id uuid primary key default gen_random_uuid(), resource_id uuid references public.resources(id),
  starts_at timestamptz not null, ends_at timestamptz not null, reason text not null,
  check(starts_at<ends_at)
);
create table public.opening_exceptions (
  id uuid primary key default gen_random_uuid(), resource_id uuid references public.resources(id),
  day date not null, opens time not null, closes time not null, check(opens<closes)
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
  kind text not null check(kind in ('percentage','fixed')), value integer not null check(value>0),
  starts_at timestamptz not null, ends_at timestamptz not null,
  active boolean not null default false, terms text not null default '',
  check(starts_at<ends_at), check(kind<>'percentage' or value<=100)
);
create table public.promotion_services (
  id uuid primary key default gen_random_uuid(), promotion_id uuid not null references public.promotions(id),
  service_id uuid not null references public.services(id), unique(promotion_id,service_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), name text not null, phone text not null,
  email text, notes text not null default '', created_at timestamptz not null default now()
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), reference text unique not null default ('GH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
  customer_id uuid not null references public.customers(id), starts_at timestamptz not null,
  ends_at timestamptz not null, status text not null default 'pending'
    check(status in ('pending','confirmed','in_progress','completed','cancelled_by_customer','cancelled_by_salon','rejected','no_show')),
  source text not null default 'website' check(source in ('website','phone','whatsapp','instagram','walk_in','other')),
  total_minor integer not null check(total_minor>=0), uncertain boolean not null,
  notes text not null default '', token_hash text not null,
  token_expires_at timestamptz not null, created_at timestamptz not null default now(),
  check(starts_at<ends_at)
);
create table public.appointment_items (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id),
  service_id uuid not null references public.services(id), sequence integer not null,
  name text not null, duration_minutes integer not null, buffer_before integer not null, buffer_after integer not null,
  price_type text not null, original_minor integer, discount_minor integer not null,
  final_minor integer, promotion_name text, resource_id uuid not null references public.resources(id),
  starts_at timestamptz not null, ends_at timestamptz not null, unique(appointment_id,sequence)
);
create table public.allocations (
  id uuid primary key default gen_random_uuid(), appointment_id uuid references public.appointments(id),
  resource_id uuid not null references public.resources(id), starts_at timestamptz not null,
  ends_at timestamptz not null, active boolean not null default true,
  check(starts_at<ends_at),
  exclude using gist (resource_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(active)
);
create table public.appointment_history (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id),
  actor text not null, action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.idempotency_records (
  key uuid primary key, request_hash text not null, appointment_id uuid not null references public.appointments(id),
  created_at timestamptz not null default now()
);
create table public.gallery (
  id uuid primary key default gen_random_uuid(), path text not null, alt text not null,
  album text not null default '', position integer not null default 0, published boolean not null default false
);
create table public.website_content (
  id uuid primary key default gen_random_uuid(), key text unique not null, title text not null,
  body text not null, published boolean not null default false
);
create table public.translations (
  id uuid primary key default gen_random_uuid(), entity text not null, entity_id uuid not null,
  locale text not null check(locale in ('fr','ar','en')), fields jsonb not null,
  unique(entity,entity_id,locale)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor uuid references public.admin_profiles(id),
  action text not null, entity text not null, entity_id text, details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.rate_limits (
  key text primary key, window_start timestamptz not null default now(), hits integer not null default 1
);
create index appointments_dates on public.appointments(starts_at);
create index appointments_customer on public.appointments(customer_id);
create index history_appointment on public.appointment_history(appointment_id,created_at);
create index items_appointment on public.appointment_items(appointment_id);
create index allocations_dates on public.allocations(resource_id, starts_at, ends_at) where active;

create function public.staff_role() returns text language sql stable security definer set search_path=public,pg_temp as $$
  select role from public.admin_profiles where id=auth.uid() and active
$$;
revoke all on function public.staff_role() from public;
grant execute on function public.staff_role() to authenticated;

do $$ declare t text; begin
  foreach t in array array['admin_profiles','salon_settings','categories','services','resources','qualifications','service_resources','working_hours','opening_exceptions','closures','promotions','promotion_services','customers','appointments','appointment_items','allocations','appointment_history','idempotency_records','gallery','website_content','translations','audit_logs','rate_limits'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  foreach t in array array['salon_settings','categories','services','resources','qualifications','service_resources','working_hours','opening_exceptions','closures','promotions','promotion_services','customers','appointments','appointment_items','allocations','appointment_history','gallery','website_content','translations','audit_logs'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.staff_role() is not null)',t);
  end loop;
end $$;
grant select on public.admin_profiles to authenticated;
create policy self_profile on public.admin_profiles for select to authenticated using(id=auth.uid());

-- Public projection is deliberately restricted to approved website data.
create function public.public_catalog() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object(
  'settings',(select to_jsonb(s)-'approved' from salon_settings s where approved),
  'services',coalesce((select jsonb_agg(to_jsonb(s) order by position,name) from services s where published and not archived and (category_id is null or exists(select 1 from categories c where c.id=s.category_id and c.published and not c.archived))),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by position,name) from categories c where published and not archived),'[]'::jsonb),
  'promotions',coalesce((select jsonb_agg(to_jsonb(p)) from promotions p where active and starts_at<=now() and ends_at>now()),'[]'::jsonb),
  'promotion_services',coalesce((select jsonb_agg(to_jsonb(ps)) from promotion_services ps join promotions p on p.id=ps.promotion_id where p.active and p.starts_at<=now() and p.ends_at>now()),'[]'::jsonb),
  'gallery',coalesce((select jsonb_agg(to_jsonb(g) order by position) from gallery g where published),'[]'::jsonb),
  'content',coalesce((select jsonb_agg(to_jsonb(c)) from website_content c where published),'[]'::jsonb),
  'hours',coalesce((select jsonb_agg(jsonb_build_object('weekday',weekday,'opens',opens,'closes',closes)) from working_hours where resource_id is null),'[]'::jsonb)
)
$$;
revoke all on function public.public_catalog() from public;
grant execute on function public.public_catalog() to anon,authenticated,service_role;

create function public.take_rate_limit(p_key text, p_limit integer, p_seconds integer) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$ declare n integer; begin
  insert into rate_limits(key) values(p_key) on conflict(key) do update set
    hits=case when rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else rate_limits.hits+1 end,
    window_start=case when rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else rate_limits.window_start end
    returning hits into n;
  return n<=p_limit;
end $$;
revoke all on function public.take_rate_limit(text,integer,integer) from public;
grant execute on function public.take_rate_limit(text,integer,integer) to service_role;
