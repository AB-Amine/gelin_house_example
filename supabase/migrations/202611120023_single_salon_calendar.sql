-- Optional single salon diary: actual shared capacity, without employee setup.
alter table public.salon_settings add column single_calendar boolean not null default false;
alter table public.resources drop constraint resources_kind_check;
alter table public.resources add constraint resources_kind_check check(kind in ('staff','equipment','salon'));
create unique index one_salon_calendar on public.resources(kind) where kind='salon';

do $$ declare definition text; old_query text; new_query text; begin
 select pg_get_functiondef('public.resource_free(uuid,timestamptz,timestamptz,uuid)'::regprocedure) into definition;
 definition:=replace(definition,chr(13),'');
 definition:=replace(definition,'and (p_resource is null or exists(select 1 from opening_exceptions',
 'and (p_resource is null or exists(select 1 from resources where id=p_resource and kind=''salon'') or exists(select 1 from opening_exceptions');
 execute definition;
 select pg_get_functiondef('public.booking_plan(uuid[],timestamptz,uuid)'::regprocedure) into definition;
 definition:=replace(definition,chr(13),'');
 old_query:=$q$select r.id into provider from resources r join qualifications q on q.resource_id=r.id
     where q.service_id=sid and r.active and r.kind='staff' and resource_free(r.id,cursor_at,finish,p_ignore)
     order by r.id limit 1;$q$;
 new_query:=$q$if cfg.single_calendar then
   select r.id into provider from resources r where r.kind='salon' and r.active
     and resource_free(r.id,cursor_at,finish,p_ignore)
     and not exists(select 1 from appointments a where a.status in ('pending','confirmed','in_progress')
       and (p_ignore is null or a.id<>p_ignore) and a.starts_at<finish and a.ends_at>cursor_at)
     limit 1;
 else
 $q$||old_query||$q$
 end if;$q$;
 if position(old_query in definition)=0 then raise exception 'Booking planner signature changed'; end if;
 -- Consultation prices must stay unknown; initialise optional promotion metadata safely.
 definition:=replace(definition,'select * into cfg from salon_settings where id=1;',
 'select null::uuid as id into d; select * into cfg from salon_settings where id=1;');
 execute replace(definition,old_query,new_query);
 -- The internal salon location uses the owner's global hours and dated exceptions.
 select pg_get_functiondef('public.fatu_plan(uuid[],timestamptz,uuid,text,uuid)'::regprocedure) into definition;
 definition:=replace(definition,chr(13),'');
 execute replace(definition,'if not exists(select 1 from city_hours h','if c.slug<>''salon'' and not exists(select 1 from city_hours h');
 select pg_get_functiondef('public.guard_city_schedule()'::regprocedure) into definition;
 definition:=replace(definition,chr(13),'');
 old_query:=$q$not exists(select 1 from city_hours h where h.city_id=a.city_id and h.weekday=extract(dow from a.starts_at at time zone tz) and h.opens<=(a.starts_at at time zone tz)::time and h.closes>=(a.ends_at at time zone tz)::time and (a.starts_at at time zone tz)::date=(a.ends_at at time zone tz)::date)$q$;
 if position(old_query in definition)=0 then raise exception 'City schedule guard signature changed'; end if;
 execute replace(definition,old_query,'((select slug from cities where id=a.city_id)<>''salon'' and '||old_query||')');
 select pg_get_functiondef('public.admin_save(text,jsonb,boolean)'::regprocedure) into definition;
 definition:=replace(definition,chr(13),'');
 definition:=replace(definition,'and not exists(select 1 from qualifications q join resources r on r.id=q.resource_id where q.service_id=i.service_id',
 'and not exists(select 1 from resources r where r.id=i.resource_id and r.kind=''salon'' and r.active) and not exists(select 1 from qualifications q join resources r on r.id=q.resource_id where q.service_id=i.service_id');
 old_query:=$q$not exists(select 1 from services s join qualifications q on q.service_id=s.id join resources r on r.id=q.resource_id where s.published and s.bookable and not s.archived and r.active and r.kind='staff')$q$;
 if position(old_query in definition)=0 then raise exception 'Settings guard signature changed'; end if;
 definition:=replace(definition,old_query,'not ((cfg.single_calendar and exists(select 1 from resources where kind=''salon'' and active) and exists(select 1 from services where published and bookable and not archived)) or '||substr(old_query,5)||')');
 execute definition;
end $$;

-- New services automatically belong to the actual salon location in this mode.
create function public.link_single_salon_service() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if new.service_type='appointment' and (select single_calendar from salon_settings where id=1) then
   insert into service_cities(service_id,city_id) select new.id,id from cities where slug='salon' and active on conflict do nothing;
 end if;
 return new;
end $$;
create trigger link_single_salon_service after insert or update of service_type on public.services for each row execute function public.link_single_salon_service();
notify pgrst,'reload schema';
