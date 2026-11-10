create function public.owner_update_access(p_id uuid,p_role text,p_active boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous admin_profiles; begin
 perform pg_advisory_xact_lock(711044);
 if staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_role not in ('owner','manager','staff') then raise exception 'INVALID_INPUT'; end if;
 select * into previous from admin_profiles where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if previous.role='owner' and previous.active and (not p_active or p_role<>'owner')
 and (select count(*) from admin_profiles where role='owner' and active)<=1 then raise exception 'LAST_OWNER'; end if;
 update admin_profiles set role=p_role,active=p_active where id=p_id;
 insert into audit_logs(actor,action,entity,entity_id,details) values(auth.uid(),'update_access','admin_profiles',p_id::text,jsonb_build_object('role',p_role,'active',p_active));
end $$;
revoke all on function public.owner_update_access(uuid,text,boolean) from public,anon;
grant execute on function public.owner_update_access(uuid,text,boolean) to authenticated;
