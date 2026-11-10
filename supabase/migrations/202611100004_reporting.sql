create function public.admin_stats(p_start timestamptz,p_end timestamptz) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; today_local date:=(now() at time zone 'Africa/Casablanca')::date; begin
 if coalesce(staff_role(),'') not in ('owner','manager') then raise exception 'FORBIDDEN'; end if;
 if p_start>=p_end or p_end-p_start>interval '366 days' then raise exception 'INVALID_INPUT'; end if;
 select jsonb_build_object('count',count(*),'pending',count(*) filter(where status='pending'),'completed',count(*) filter(where status='completed'),
   'confirmed',count(*) filter(where status in ('confirmed','in_progress','completed')),
   'cancelled',count(*) filter(where status in ('cancelled_by_customer','cancelled_by_salon')),
   'estimated_minor',coalesce(sum(total_minor) filter(where status in ('pending','confirmed','in_progress')),0),
   'completed_minor',coalesce(sum(total_minor) filter(where status='completed'),0),
   'uncertain_count',count(*) filter(where uncertain)) into result
 from appointments where starts_at>=p_start and starts_at<p_end;
 return result||jsonb_build_object(
   'today',(select count(*) from appointments where starts_at>=today_local::timestamp at time zone 'Africa/Casablanca' and starts_at<(today_local+1)::timestamp at time zone 'Africa/Casablanca'),
   'today_minor',(select coalesce(sum(total_minor),0) from appointments where starts_at>=today_local::timestamp at time zone 'Africa/Casablanca' and starts_at<(today_local+1)::timestamp at time zone 'Africa/Casablanca' and status in ('pending','confirmed','in_progress','completed')),
   'week',(select count(*) from appointments where starts_at>=date_trunc('week',today_local::timestamp) at time zone 'Africa/Casablanca' and starts_at<(date_trunc('week',today_local::timestamp)+interval '1 week') at time zone 'Africa/Casablanca'),
   'month',(select count(*) from appointments where starts_at>=date_trunc('month',today_local::timestamp) at time zone 'Africa/Casablanca' and starts_at<(date_trunc('month',today_local::timestamp)+interval '1 month') at time zone 'Africa/Casablanca'),
   'popular',coalesce((select jsonb_agg(x) from (select i.name,count(*) bookings from appointment_items i join appointments a on a.id=i.appointment_id where a.starts_at>=p_start and a.starts_at<p_end group by i.name order by bookings desc limit 5)x),'[]'::jsonb),
   'sources',coalesce((select jsonb_agg(x) from (select source,count(*) bookings from appointments where starts_at>=p_start and starts_at<p_end group by source)x),'[]'::jsonb)
 );
end $$;
revoke all on function public.admin_stats(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_stats(timestamptz,timestamptz) to authenticated;
