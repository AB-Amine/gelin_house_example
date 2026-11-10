create function public.resource_free(p_resource uuid,p_start timestamptz,p_end timestamptz,p_ignore uuid default null)
returns boolean language sql stable set search_path=public,pg_temp as $$
select p_start<p_end
 and (p_start at time zone 'Africa/Casablanca')::date=(p_end at time zone 'Africa/Casablanca')::date
 and (exists(select 1 from opening_exceptions h where h.resource_id is null and h.day=(p_start at time zone 'Africa/Casablanca')::date
   and h.opens<=(p_start at time zone 'Africa/Casablanca')::time and h.closes>=(p_end at time zone 'Africa/Casablanca')::time)
 or (not exists(select 1 from opening_exceptions h where h.resource_id is null and h.day=(p_start at time zone 'Africa/Casablanca')::date)
 and exists(select 1 from working_hours h where h.resource_id is null
   and h.weekday=extract(dow from p_start at time zone 'Africa/Casablanca')
   and h.opens<=(p_start at time zone 'Africa/Casablanca')::time and h.closes>=(p_end at time zone 'Africa/Casablanca')::time)))
 and (p_resource is null or exists(select 1 from opening_exceptions h where h.resource_id=p_resource and h.day=(p_start at time zone 'Africa/Casablanca')::date
   and h.opens<=(p_start at time zone 'Africa/Casablanca')::time and h.closes>=(p_end at time zone 'Africa/Casablanca')::time)
 or (not exists(select 1 from opening_exceptions h where h.resource_id=p_resource and h.day=(p_start at time zone 'Africa/Casablanca')::date)
 and exists(select 1 from working_hours h where h.resource_id=p_resource
   and h.weekday=extract(dow from p_start at time zone 'Africa/Casablanca')
   and h.opens<=(p_start at time zone 'Africa/Casablanca')::time and h.closes>=(p_end at time zone 'Africa/Casablanca')::time)))
 and not exists(select 1 from closures c where (c.resource_id is null or c.resource_id=p_resource)
   and tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(p_start,p_end,'[)'))
 and not exists(select 1 from allocations a where a.active and a.resource_id=p_resource
   and (p_ignore is null or a.appointment_id is distinct from p_ignore)
   and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_start,p_end,'[)'))
$$;

create function public.booking_plan(p_services uuid[],p_start timestamptz,p_ignore uuid default null)
returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare cfg salon_settings; sid uuid; s services; existing appointment_items; provider uuid; rr uuid; cursor_at timestamptz:=p_start;
  finish timestamptz; amount integer; discount integer; promo text; d record;
  result jsonb:='[]'; equipment jsonb; uncertain boolean:=false; total integer:=0;
begin
 select * into cfg from salon_settings where id=1;
 if not cfg.approved or not cfg.booking_enabled or coalesce(cfg.phone,'')='' or cfg.privacy_text='' or cfg.policy_text=''
 then raise exception 'NOT_CONFIGURED'; end if;
 if cardinality(p_services) not between 1 and 10 or cardinality(p_services)<>(select count(distinct x) from unnest(p_services) x)
 then raise exception 'INVALID_SERVICES'; end if;
 if p_start < now()+make_interval(mins=>cfg.notice_minutes) or p_start > now()+make_interval(days=>cfg.horizon_days)
 then raise exception 'OUTSIDE_WINDOW'; end if;
 if extract(second from p_start)<>0 or (extract(hour from p_start at time zone cfg.timezone)::integer*60+extract(minute from p_start at time zone cfg.timezone)::integer)%cfg.increment_minutes<>0
 then raise exception 'INVALID_SLOT'; end if;
 foreach sid in array p_services loop
   select * into s from services where id=sid and published and bookable and not archived
     and (category_id is null or exists(select 1 from categories c where c.id=category_id and c.published and not c.archived));
   if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
   if p_ignore is not null then
     select * into existing from appointment_items where appointment_id=p_ignore and service_id=sid;
     if not found then raise exception 'INVALID_SERVICES'; end if;
     s.duration_minutes:=existing.duration_minutes; s.buffer_before:=existing.buffer_before; s.buffer_after:=existing.buffer_after;
   end if;
   finish:=cursor_at+make_interval(mins=>s.buffer_before+s.duration_minutes+s.buffer_after);
   select r.id into provider from resources r join qualifications q on q.resource_id=r.id
     where q.service_id=sid and r.active and r.kind='staff' and resource_free(r.id,cursor_at,finish,p_ignore)
     order by r.id limit 1;
   if provider is null then raise exception 'SLOT_UNAVAILABLE'; end if;
   equipment:='[]';
   for rr in select sr.resource_id from service_resources sr join resources r on r.id=sr.resource_id where sr.service_id=sid and r.active and r.kind='equipment' order by sr.resource_id loop
     if not resource_free(rr,cursor_at,finish,p_ignore) then raise exception 'SLOT_UNAVAILABLE'; end if;
     equipment:=equipment||jsonb_build_array(rr);
   end loop;
   if exists(select 1 from service_resources sr join resources r on r.id=sr.resource_id where sr.service_id=sid and (not r.active or r.kind<>'equipment')) then raise exception 'SLOT_UNAVAILABLE'; end if;
   amount:=s.price_minor; discount:=0; promo:=null;
   if s.price_type='fixed' then
     select p.name,least(amount,case when p.kind='fixed' then p.value else round(amount::numeric*p.value/100)::integer end) as reduction
       into d from promotions p join promotion_services ps on ps.promotion_id=p.id
       where ps.service_id=sid and p.active and p.starts_at<=now() and p.ends_at>now()
       order by reduction desc,p.id limit 1;
     if found then discount:=d.reduction; promo:=d.name; end if;
   end if;
   total:=total+coalesce(amount-discount,0); uncertain:=uncertain or s.price_type<>'fixed';
   result:=result||jsonb_build_array(jsonb_build_object('service_id',sid,'name',s.name,'duration_minutes',s.duration_minutes,
     'buffer_before',s.buffer_before,'buffer_after',s.buffer_after,'price_type',s.price_type,'original_minor',amount,
     'discount_minor',discount,'final_minor',amount-discount,'promotion_name',promo,'resource_id',provider,'equipment',equipment,
     'starts_at',cursor_at,'ends_at',finish));
   cursor_at:=finish;
 end loop;
 return jsonb_build_object('items',result,'total_minor',total,'uncertain',uncertain,'starts_at',p_start,'ends_at',cursor_at);
end $$;

create function public.available_slots(p_services uuid[],p_date date,p_ignore uuid default null)
returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare cfg salon_settings; t timestamptz; stop_at timestamptz; plan jsonb; slots jsonb:='[]'; begin
 select * into cfg from salon_settings where id=1;
 t:=p_date::timestamp at time zone cfg.timezone;
 stop_at:=(p_date+1)::timestamp at time zone cfg.timezone;
 while t<stop_at loop
   begin
     plan:=booking_plan(p_services,t,p_ignore);
     slots:=slots||jsonb_build_array(jsonb_build_object('starts_at',t,'ends_at',plan->'ends_at'));
   exception when raise_exception then
     if sqlerrm not in ('SLOT_UNAVAILABLE','OUTSIDE_WINDOW','INVALID_SLOT') then raise; end if;
   end;
   t:=t+interval '1 minute'*cfg.increment_minutes;
 end loop;
 return slots;
end $$;

create function public.quote_booking(p_services uuid[],p_start timestamptz) returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare plan jsonb; begin
 plan:=booking_plan(p_services,p_start);
 return plan||jsonb_build_object('fingerprint',encode(sha256(convert_to(plan::text,'UTF8')),'hex'));
end $$;

create function public.create_booking(p_services uuid[],p_start timestamptz,p_name text,p_phone text,p_email text,p_notes text,p_key uuid,p_token_hash text,p_fingerprint text,p_source text default 'website',p_actor uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare plan jsonb; request_digest text; idem idempotency_records; a appointments; cust uuid; item jsonb; equip jsonb; n integer:=0; begin
 perform pg_advisory_xact_lock(711042);
 if p_source<>'website' and (p_actor is null or not exists(select 1 from admin_profiles where id=p_actor and active and role in ('owner','manager'))) then raise exception 'FORBIDDEN'; end if;
 if length(p_name) not between 2 and 120 or length(p_phone) not between 8 and 30 or length(coalesce(p_notes,''))>2000 or length(p_token_hash)<>64 then raise exception 'INVALID_INPUT'; end if;
 request_digest:=encode(sha256(convert_to(jsonb_build_array(p_services,p_start,p_name,p_phone,p_email,p_notes,p_token_hash,p_source,p_fingerprint,p_actor)::text,'UTF8')),'hex');
 select * into idem from idempotency_records where key=p_key;
 if found then
   if idem.request_hash<>request_digest then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
   select * into a from appointments where id=idem.appointment_id;
   return jsonb_build_object('reference',a.reference,'id',a.id,'status',a.status,'booking',public.manage_booking(p_token_hash));
 end if;
 plan:=quote_booking(p_services,p_start);
 if plan->>'fingerprint'<>p_fingerprint then raise exception 'QUOTE_CHANGED'; end if;
 insert into customers(name,phone,email) values(trim(p_name),p_phone,nullif(p_email,'')) returning id into cust;
 insert into appointments(customer_id,starts_at,ends_at,total_minor,uncertain,notes,token_hash,token_expires_at,source)
 values(cust,p_start,(plan->>'ends_at')::timestamptz,(plan->>'total_minor')::integer,(plan->>'uncertain')::boolean,coalesce(p_notes,''),p_token_hash,(plan->>'ends_at')::timestamptz+interval '90 days',p_source) returning * into a;
 for item in select * from jsonb_array_elements(plan->'items') loop
   n:=n+1;
   insert into appointment_items(appointment_id,service_id,sequence,name,duration_minutes,buffer_before,buffer_after,price_type,original_minor,discount_minor,final_minor,promotion_name,resource_id,starts_at,ends_at)
   values(a.id,(item->>'service_id')::uuid,n,item->>'name',(item->>'duration_minutes')::integer,(item->>'buffer_before')::integer,(item->>'buffer_after')::integer,item->>'price_type',(item->>'original_minor')::integer,(item->>'discount_minor')::integer,(item->>'final_minor')::integer,item->>'promotion_name',(item->>'resource_id')::uuid,(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz);
   insert into allocations(appointment_id,resource_id,starts_at,ends_at) values(a.id,(item->>'resource_id')::uuid,(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz);
   for equip in select * from jsonb_array_elements(item->'equipment') loop
     insert into allocations(appointment_id,resource_id,starts_at,ends_at) values(a.id,(equip#>>'{}')::uuid,(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz);
   end loop;
 end loop;
 insert into appointment_history(appointment_id,actor,action) values(a.id,coalesce(p_actor::text,'customer'),'pending');
 insert into idempotency_records(key,request_hash,appointment_id) values(p_key,request_digest,a.id);
 return jsonb_build_object('reference',a.reference,'id',a.id,'status',a.status,'booking',public.manage_booking(p_token_hash));
end $$;

create function public.manage_booking(p_token_hash text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',a.id,'reference',a.reference,'status',a.status,'starts_at',a.starts_at,'ends_at',a.ends_at,
 'total_minor',a.total_minor,'uncertain',a.uncertain,'items',(select jsonb_agg(to_jsonb(i)-'resource_id' order by sequence) from appointment_items i where i.appointment_id=a.id),
 'history',(select jsonb_agg(jsonb_build_object('action',action,'created_at',created_at) order by created_at) from appointment_history where appointment_id=a.id))
from appointments a where token_hash=p_token_hash and token_expires_at>now()
$$;

create function public.change_booking(p_id uuid,p_action text,p_new_start timestamptz default null,p_actor uuid default null,p_token_hash text default null,p_reason text default '')
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
   update appointments set starts_at=p_new_start,ends_at=(plan->>'ends_at')::timestamptz,status=case when p_actor is null then 'pending' else status end where id=a.id;
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

-- Every engine function is server-only, including helper functions with private reads.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('resource_free','booking_plan','available_slots','quote_booking','create_booking','manage_booking','change_booking') loop
   execute format('revoke all on function %s from public,anon,authenticated',f.signature);
   execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
