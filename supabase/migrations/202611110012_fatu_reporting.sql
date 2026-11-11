create function public.fatu_admin_summary(p_start timestamptz,p_end timestamptz) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$ begin
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object(
 'total',(select count(*) from appointments where starts_at>=p_start and starts_at<p_end),
 'pending',(select count(*) from appointments where status='pending'),
 'clients',(select count(*) from client_profiles)+(select count(*) from customers c where exists(select 1 from appointments a where a.customer_id=c.id and a.client_user_id is null)),
 'completed',(select count(*) from appointments where status='completed' and starts_at>=p_start and starts_at<p_end),
 'cancelled',(select count(*) from appointments where status in ('cancelled_by_customer','cancelled_by_salon','rejected') and starts_at>=p_start and starts_at<p_end),
 'booked_value',coalesce((select jsonb_agg(to_jsonb(x)) from(select currency,sum(total_minor) total_minor from appointments where starts_at>=p_start and starts_at<p_end and status in ('pending','confirmed','in_progress','completed') group by currency)x),'[]'),
 'paid',coalesce((select jsonb_agg(to_jsonb(x)) from(select currency,sum(case when kind='payment' then amount_minor else -amount_minor end) total_minor from payment_records where received_at>=p_start and received_at<p_end group by currency)x),'[]'),
 'popular',coalesce((select jsonb_agg(to_jsonb(x)) from(select i.name,count(*) bookings from appointment_items i join appointments a on a.id=i.appointment_id where a.starts_at>=p_start and a.starts_at<p_end and a.status not in ('cancelled_by_customer','cancelled_by_salon','rejected') group by i.name order by count(*) desc,i.name limit 5)x),'[]'),
 'upcoming',coalesce((select jsonb_agg(to_jsonb(x)) from(select a.id,a.reference,a.starts_at,a.status,a.city_name,c.name from appointments a join customers c on c.id=a.customer_id where a.ends_at>now() and a.status in ('pending','confirmed','in_progress') order by a.starts_at limit 8)x),'[]'),
 'requests',(select count(*) from change_requests where status='pending'),
 'messages',(select count(*) from contact_messages where not handled),
 'notifications',(select count(*) from notification_outbox where status='queued'));
end $$;
revoke all on function public.fatu_admin_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.fatu_admin_summary(timestamptz,timestamptz) to authenticated;

-- Automatic limited offers count actual use just like coded ones.
do $$ declare definition text; begin
 select pg_get_functiondef('public.booking_plan(uuid[],timestamptz,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'select p.name,least','select p.id,p.name,least');
 definition:=replace(definition,'''promotion_name'',promo','''promotion_id'',case when promo is null then null else d.id end,''promotion_name'',promo');
 execute definition;
end $$;
