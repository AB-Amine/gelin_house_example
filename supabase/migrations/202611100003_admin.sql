create function public.admin_save(p_table text,p_data jsonb,p_delete boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare role_name text; cols text; vals text; assignments text; result jsonb; row_id text; old_row jsonb; cfg salon_settings; affected jsonb; begin
 perform pg_advisory_xact_lock(711042);
 role_name:=staff_role();
 if role_name not in ('owner','manager') or role_name is null then raise exception 'FORBIDDEN'; end if;
 if p_table not in ('salon_settings','categories','services','resources','qualifications','service_resources','working_hours','opening_exceptions','closures','promotions','promotion_services','gallery','website_content','customers') then raise exception 'FORBIDDEN'; end if;
 if p_table='salon_settings' and role_name<>'owner' then raise exception 'FORBIDDEN'; end if;
 row_id:=p_data->>'id';
 if row_id is not null then execute format('select to_jsonb(t) from public.%I t where id::text=$1',p_table) into old_row using row_id; end if;
 if p_table='resources' and old_row is not null and p_data ? 'kind' and old_row->>'kind' is distinct from p_data->>'kind' and exists(select 1 from allocations where resource_id=row_id::uuid) then raise exception 'EXISTING_APPOINTMENTS'; end if;
 if p_table='closures' and not p_delete then
   select jsonb_agg(jsonb_build_object('reference',x.reference)) into affected from (
     select distinct ap.reference from allocations a join appointments ap on ap.id=a.appointment_id where a.active and a.ends_at>now()
     and (nullif(p_data->>'resource_id','') is null or a.resource_id=(p_data->>'resource_id')::uuid)
     and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange((p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,'[)') limit 50
   )x;
   if affected is not null then raise exception 'EXISTING_APPOINTMENTS' using detail=affected::text; end if;
 end if;
 if p_delete then
   if p_table not in ('working_hours','opening_exceptions','closures','qualifications','service_resources','promotion_services','gallery') then raise exception 'ARCHIVE_INSTEAD'; end if;
   execute format('delete from public.%I where id::text=$1 returning to_jsonb(%I.*)',p_table,p_table) into result using row_id;
 else
   if exists(select 1 from jsonb_object_keys(p_data) k where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=p_table and c.column_name=k)) then raise exception 'INVALID_INPUT'; end if;
   select string_agg(format('%I',key),','),string_agg(format('x.%I',key),','),string_agg(format('%I=x.%I',key,key),',') into cols,vals,assignments from jsonb_each(p_data) where key<>'id';
   if old_row is not null then
     execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) x where t.id::text=$2 returning to_jsonb(t)',p_table,assignments,p_table) into result using p_data,row_id;
   else
     execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x returning to_jsonb(%I.*)',p_table,cols,vals,p_table,p_table) into result using p_data;
   end if;
 end if;
 if p_table in ('working_hours','opening_exceptions','resources','qualifications','service_resources') then
   select jsonb_agg(jsonb_build_object('reference',x.reference)) into affected from (
     select a.reference from appointments a where a.ends_at>now() and a.status in ('pending','confirmed','in_progress') and (
       exists(select 1 from allocations al join resources r on r.id=al.resource_id where al.appointment_id=a.id and al.active and (not r.active or not resource_free(al.resource_id,al.starts_at,al.ends_at,a.id)))
       or exists(select 1 from appointment_items i where i.appointment_id=a.id and not exists(select 1 from qualifications q join resources r on r.id=q.resource_id where q.service_id=i.service_id and q.resource_id=i.resource_id and r.kind='staff' and r.active))
       or exists(select 1 from appointment_items i join service_resources sr on sr.service_id=i.service_id where i.appointment_id=a.id and not exists(select 1 from allocations al where al.appointment_id=a.id and al.active and al.resource_id=sr.resource_id and al.starts_at<=i.starts_at and al.ends_at>=i.ends_at))
     ) order by a.starts_at limit 50
   )x;
   if affected is not null then raise exception 'EXISTING_APPOINTMENTS' using detail=affected::text; end if;
 end if;
 if p_table='salon_settings' then
   select * into cfg from salon_settings where id=1;
   if cfg.booking_enabled and (not cfg.approved or coalesce(cfg.phone,'')='' or cfg.privacy_text='' or cfg.policy_text='' or not exists(select 1 from working_hours where resource_id is null)
     or not exists(select 1 from services s join qualifications q on q.service_id=s.id join resources r on r.id=q.resource_id where s.published and s.bookable and not s.archived and r.active and r.kind='staff')) then raise exception 'NOT_CONFIGURED'; end if;
 end if;
 insert into audit_logs(actor,action,entity,entity_id,details) values(auth.uid(),case when p_delete then 'delete' when old_row is null then 'create' else 'update' end,p_table,coalesce(result->>'id',row_id),case when p_table='customers' then '{}'::jsonb else jsonb_build_object('before',old_row,'after',result) end);
 return result;
end $$;
revoke all on function public.admin_save(text,jsonb,boolean) from public,anon;
grant execute on function public.admin_save(text,jsonb,boolean) to authenticated;

-- Public image objects have shareable URLs. No direct client upload permissions;
-- the server verifies owner/manager before every upload.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('salon-images','salon-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
