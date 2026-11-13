-- UI consolidation only. Reuse guarded saves, scheduling checks, and audit history.
-- Promotion eligibility and employee configuration commit together or roll back together.
create function public.admin_owner_form(p_kind text,p_data jsonb,p_services uuid[],p_hours jsonb default '[]') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare saved jsonb; row_id uuid; sid uuid; old_link record; h jsonb; allowed text[]; begin
 perform pg_advisory_xact_lock(711042);
 if staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_services is null or cardinality(p_services)>1000 or exists(select 1 from unnest(p_services) s where s is null)
 or cardinality(p_services)<>(select count(distinct s) from unnest(p_services) s) then raise exception 'INVALID_INPUT'; end if;
 if p_kind='promotion' then
  allowed:=array['id','name','description','kind','value','starts_at','ends_at','terms','active','code','max_uses'];
 elsif p_kind='employee' then
  allowed:=array['id','name','kind','active'];
  if p_data->>'kind' is distinct from 'staff' then raise exception 'INVALID_INPUT'; end if;
  if p_data ? 'id' and exists(select 1 from resources where id=(p_data->>'id')::uuid and kind<>'staff') then raise exception 'FORBIDDEN'; end if;
 else raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where not k=any(allowed)) then raise exception 'INVALID_INPUT'; end if;
 if p_kind='promotion' then
  if cardinality(p_services)=0 then raise exception 'INVALID_SERVICES'; end if;
  saved:=admin_save('promotions',p_data); row_id:=(saved->>'id')::uuid;
  foreach sid in array p_services loop
   if not exists(select 1 from promotion_services where promotion_id=row_id and service_id=sid) then
    perform admin_save('promotion_services',jsonb_build_object('promotion_id',row_id,'service_id',sid));
   end if;
  end loop;
  for old_link in select id from promotion_services where promotion_id=row_id and not(service_id=any(p_services)) loop
   perform admin_save('promotion_services',jsonb_build_object('id',old_link.id),true);
  end loop;
 else
  if jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours)>200 then raise exception 'INVALID_INPUT'; end if;
  saved:=admin_save('resources',p_data); row_id:=(saved->>'id')::uuid;
  foreach sid in array p_services loop
   if not exists(select 1 from qualifications where resource_id=row_id and service_id=sid) then
    perform admin_save('qualifications',jsonb_build_object('resource_id',row_id,'service_id',sid));
   end if;
  end loop;
  -- Add replacements before removing old rows so intermediate guards remain valid.
  for h in select value from jsonb_array_elements(p_hours) loop
   if not exists(select 1 from working_hours where resource_id=row_id and weekday=(h->>'weekday')::integer and opens=(h->>'opens')::time and closes=(h->>'closes')::time) then
    perform admin_save('working_hours',jsonb_build_object('resource_id',row_id,'weekday',(h->>'weekday')::integer,'opens',h->>'opens','closes',h->>'closes'));
   end if;
  end loop;
  for old_link in select id from working_hours w where resource_id=row_id and not exists(select 1 from jsonb_array_elements(p_hours) candidate where (candidate->>'weekday')::integer=w.weekday and (candidate->>'opens')::time=w.opens and (candidate->>'closes')::time=w.closes) loop
   perform admin_save('working_hours',jsonb_build_object('id',old_link.id),true);
  end loop;
  for old_link in select id from qualifications where resource_id=row_id and not(service_id=any(p_services)) loop
   perform admin_save('qualifications',jsonb_build_object('id',old_link.id),true);
  end loop;
 end if;
 return saved;
end $$;
revoke all on function public.admin_owner_form(text,jsonb,uuid[],jsonb) from public,anon;
grant execute on function public.admin_owner_form(text,jsonb,uuid[],jsonb) to authenticated;
notify pgrst,'reload schema';
