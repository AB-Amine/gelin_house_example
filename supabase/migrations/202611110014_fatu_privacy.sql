-- Customer erasure must cover the new event data and account link too.
do $$ declare definition text; begin
 select pg_get_functiondef('public.anonymize_customer(uuid,text)'::regprocedure) into definition;
 definition:=replace(definition,'update appointments set notes=''''','delete from change_requests where appointment_id in(select id from appointments where customer_id=p_id);
 update appointments set event_address='''',event_details='''',client_user_id=null,notes=''''');
 execute definition;
end $$;
create function public.handle_contact_message(p_id uuid,p_handled boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if staff_role() is null then raise exception 'FORBIDDEN'; end if;
 update contact_messages set handled=p_handled where id=p_id;
 if not found then raise exception 'NOT_FOUND'; end if;
 insert into audit_logs(actor,action,entity,entity_id) values(auth.uid(),case when p_handled then 'message_handled' else 'message_reopened' end,'contact_messages',p_id::text);
end $$;
revoke all on function public.handle_contact_message(uuid,boolean) from public,anon;
grant execute on function public.handle_contact_message(uuid,boolean) to authenticated;
