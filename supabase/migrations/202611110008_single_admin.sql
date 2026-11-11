-- One application access level. Retain the legacy 'owner' value so existing
-- transactional functions and deployed sessions remain compatible.
update public.admin_profiles set role='owner';
alter table public.admin_profiles add constraint single_admin_access check(role='owner');
alter table public.admin_profiles alter column role set default 'owner';

create or replace function public.owner_update_access(p_id uuid,p_role text,p_active boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous admin_profiles; begin
 perform pg_advisory_xact_lock(711044);
 if staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_role is distinct from 'owner' or p_active is null then raise exception 'INVALID_INPUT'; end if;
 select * into previous from admin_profiles where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if previous.active and not p_active and (select count(*) from admin_profiles where active)<=1
 then raise exception 'LAST_OWNER'; end if;
 update admin_profiles set active=p_active where id=p_id;
 insert into audit_logs(actor,action,entity,entity_id,details)
 values(auth.uid(),'update_access','admin_profiles',p_id::text,jsonb_build_object('active',p_active));
end $$;
