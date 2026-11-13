create function public.save_salon_week(p_hours jsonb,p_days integer[]) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare h jsonb; d integer; old_row record; begin
 perform pg_advisory_xact_lock(711042);
 if staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_days is null or cardinality(p_days)>7 or exists(select 1 from unnest(p_days)v where v is null or v not between 0 and 6)
   or jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours) not between 1 and 10 then raise exception 'INVALID_INPUT'; end if;
 for h in select value from jsonb_array_elements(p_hours) loop
   if h->>'opens' is null or h->>'closes' is null or (h->>'opens')::time>=(h->>'closes')::time then raise exception 'INVALID_INPUT';end if;
   foreach d in array p_days loop
     if not exists(select 1 from working_hours where resource_id is null and weekday=d and opens=(h->>'opens')::time and closes=(h->>'closes')::time) then
       perform admin_save('working_hours',jsonb_build_object('resource_id',null,'weekday',d,'opens',h->>'opens','closes',h->>'closes'));
     end if;
   end loop;
 end loop;
 for old_row in select id from working_hours w where resource_id is null and (not(w.weekday=any(p_days)) or not exists(
   select 1 from jsonb_array_elements(p_hours)x where (x->>'opens')::time=w.opens and (x->>'closes')::time=w.closes))
 loop perform admin_save('working_hours',jsonb_build_object('id',old_row.id),true);end loop;
end $$;
revoke all on function public.save_salon_week(jsonb,integer[]) from public,anon;
grant execute on function public.save_salon_week(jsonb,integer[]) to authenticated;
notify pgrst,'reload schema';
