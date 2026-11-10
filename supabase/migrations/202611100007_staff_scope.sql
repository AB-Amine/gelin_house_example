revoke create on schema public from public,anon,authenticated;
alter table public.resources add column admin_user_id uuid unique references public.admin_profiles(id);
alter table public.resources add constraint only_staff_accounts check(admin_user_id is null or kind='staff');
alter table public.appointments add column internal_notes text not null default '';

create function public.can_read_appointment(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select staff_role() in ('owner','manager') or (staff_role()='staff' and exists(
   select 1 from appointment_items i join resources r on r.id=i.resource_id
   where i.appointment_id=p_id and r.admin_user_id=auth.uid()
 ))
$$;
create function public.can_read_customer(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select staff_role() in ('owner','manager') or (staff_role()='staff' and exists(
   select 1 from appointments a where a.customer_id=p_id and can_read_appointment(a.id)
 ))
$$;
revoke all on function public.can_read_appointment(uuid),public.can_read_customer(uuid) from public,anon;
grant execute on function public.can_read_appointment(uuid),public.can_read_customer(uuid) to authenticated;
create policy management_profiles on public.admin_profiles for select to authenticated using(public.staff_role() in ('owner','manager'));

do $$ declare t text; begin
 foreach t in array array['salon_settings','categories','services','resources','qualifications','service_resources','working_hours','opening_exceptions','closures','promotions','promotion_services','customers','appointments','appointment_items','allocations','appointment_history','gallery','website_content','translations','audit_logs'] loop
   execute format('drop policy staff_read on public.%I',t);
   execute format('create policy management_read on public.%I for select to authenticated using (public.staff_role() in (''owner'',''manager''))',t);
 end loop;
end $$;
create policy assigned_appointments on public.appointments for select to authenticated using(public.can_read_appointment(id));
create policy assigned_items on public.appointment_items for select to authenticated using(public.can_read_appointment(appointment_id));
create policy assigned_allocations on public.allocations for select to authenticated using(public.can_read_appointment(appointment_id));
create policy assigned_history on public.appointment_history for select to authenticated using(public.can_read_appointment(appointment_id));
create policy assigned_customers on public.customers for select to authenticated using(public.can_read_customer(id));
create policy own_resource on public.resources for select to authenticated using(admin_user_id=auth.uid() and public.staff_role()='staff');
create policy staff_salon_hours on public.working_hours for select to authenticated using(public.staff_role()='staff' and (resource_id is null or exists(select 1 from public.resources r where r.id=resource_id and r.admin_user_id=auth.uid())));
create policy staff_exceptions on public.opening_exceptions for select to authenticated using(public.staff_role()='staff' and (resource_id is null or exists(select 1 from public.resources r where r.id=resource_id and r.admin_user_id=auth.uid())));
create policy staff_closures on public.closures for select to authenticated using(public.staff_role()='staff' and (resource_id is null or exists(select 1 from public.resources r where r.id=resource_id and r.admin_user_id=auth.uid())));

create function public.admin_note(p_id uuid,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if coalesce(staff_role(),'') not in ('owner','manager') then raise exception 'FORBIDDEN'; end if;
 if length(p_note)>5000 then raise exception 'INVALID_INPUT'; end if;
 update appointments set internal_notes=p_note where id=p_id;
 if not found then raise exception 'NOT_FOUND'; end if;
 insert into audit_logs(actor,action,entity,entity_id) values(auth.uid(),'update_internal_note','appointments',p_id::text);
end $$;
revoke all on function public.admin_note(uuid,text) from public,anon;
grant execute on function public.admin_note(uuid,text) to authenticated;

create function public.search_appointments(p_query text,p_start timestamptz,p_end timestamptz,p_resource uuid default null)
returns setof public.appointments language sql stable set search_path=public,pg_temp as $$
 select a.* from appointments a join customers c on c.id=a.customer_id
 where a.starts_at>=p_start and a.starts_at<p_end
 and (p_query='' or a.reference ilike '%'||p_query||'%' or c.name ilike '%'||p_query||'%' or c.phone ilike '%'||p_query||'%')
 and (p_resource is null or exists(select 1 from appointment_items i where i.appointment_id=a.id and i.resource_id=p_resource))
 order by a.starts_at
$$;
revoke all on function public.search_appointments(text,timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.search_appointments(text,timestamptz,timestamptz,uuid) to authenticated;
