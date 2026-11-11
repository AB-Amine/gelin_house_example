-- Keep guest access valid until 90 days after the revised appointment end.
create or replace function public.change_booking(p_id uuid,p_action text,p_new_start timestamptz default null,p_actor uuid default null,p_token_hash text default null,p_reason text default '')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a appointments; cfg salon_settings; role_name text; next_status text; ids uuid[]; plan jsonb; item jsonb; equip jsonb; n integer:=0; begin
 perform pg_advisory_xact_lock(711042);
 select * into a from appointments where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into cfg from salon_settings where id=1;
 if p_actor is null then
   if a.token_hash is distinct from p_token_hash or a.token_expires_at<=now() then raise exception 'FORBIDDEN'; end if;
   if a.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION'; end if;
   if p_action='cancelled_by_customer' then
     if not cfg.cancellation_enabled or a.starts_at<now()+make_interval(hours=>cfg.cancellation_notice_hours) then raise exception 'POLICY_BLOCKED'; end if;
   elsif p_action='reschedule' then
     if not cfg.rescheduling_enabled or a.starts_at<now()+make_interval(hours=>cfg.rescheduling_notice_hours) then raise exception 'POLICY_BLOCKED'; end if;
   else raise exception 'FORBIDDEN'; end if;
 else
   select role into role_name from admin_profiles where id=p_actor and active;
   if role_name is null then raise exception 'FORBIDDEN'; end if;
   if role_name='staff' and p_action not in ('in_progress','completed','no_show') then raise exception 'FORBIDDEN'; end if;
   if role_name='staff' and not exists(select 1 from appointment_items i join resources r on r.id=i.resource_id where i.appointment_id=a.id and r.admin_user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 end if;
 if p_action='reschedule' then
   if a.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION'; end if;
   select array_agg(service_id order by sequence) into ids from appointment_items where appointment_id=a.id;
   plan:=booking_plan(ids,p_new_start,a.id);
   insert into appointment_history(appointment_id,actor,action,details) values(a.id,coalesce(p_actor::text,'customer'),'reschedule',jsonb_build_object('old_start',a.starts_at,'old_end',a.ends_at,'new_start',p_new_start,'prior_items',(select jsonb_agg(to_jsonb(i)) from appointment_items i where appointment_id=a.id)));
   update allocations set active=false where appointment_id=a.id;
   for item in select * from jsonb_array_elements(plan->'items') loop
     n:=n+1;
     update appointment_items set resource_id=(item->>'resource_id')::uuid,starts_at=(item->>'starts_at')::timestamptz,ends_at=(item->>'ends_at')::timestamptz where appointment_id=a.id and sequence=n;
     insert into allocations(appointment_id,resource_id,starts_at,ends_at) values(a.id,(item->>'resource_id')::uuid,(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz);
     for equip in select * from jsonb_array_elements(item->'equipment') loop
       insert into allocations(appointment_id,resource_id,starts_at,ends_at) values(a.id,(equip#>>'{}')::uuid,(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz);
     end loop;
   end loop;
   update appointments set starts_at=p_new_start,ends_at=(plan->>'ends_at')::timestamptz,token_expires_at=(plan->>'ends_at')::timestamptz+interval '90 days',status=case when p_actor is null then 'pending' else status end where id=a.id;
 else
   next_status:=p_action;
   if not (
     (a.status='pending' and next_status in ('confirmed','rejected','cancelled_by_customer','cancelled_by_salon')) or
     (a.status='confirmed' and next_status in ('in_progress','cancelled_by_customer','cancelled_by_salon','no_show')) or
     (a.status='in_progress' and next_status in ('completed','cancelled_by_salon'))
   ) then raise exception 'INVALID_TRANSITION'; end if;
   if next_status='no_show' and now()<a.starts_at+make_interval(mins=>cfg.no_show_grace_minutes) then raise exception 'POLICY_BLOCKED'; end if;
   if a.status='in_progress' and next_status='cancelled_by_salon' and trim(p_reason)='' then raise exception 'REASON_REQUIRED'; end if;
   if next_status in ('completed','cancelled_by_customer','cancelled_by_salon','rejected','no_show') then update allocations set active=false where appointment_id=a.id; end if;
   update appointments set status=next_status where id=a.id;
   insert into appointment_history(appointment_id,actor,action,details) values(a.id,coalesce(p_actor::text,'customer'),next_status,jsonb_build_object('old_status',a.status,'reason',p_reason));
 end if;
end $$;
