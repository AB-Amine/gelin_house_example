alter table public.salon_settings add column logo_path text not null default '';
alter table public.salon_settings add column hero_image_path text not null default '';
alter table public.salon_settings add column brand_color text not null default '#8b5147' check(brand_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.services add column image_path text not null default '';
alter table public.categories add column image_path text not null default '';
create function public.anonymize_customer(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 perform pg_advisory_xact_lock(711042);
 if staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if length(trim(p_reason))<5 then raise exception 'REASON_REQUIRED'; end if;
 if exists(select 1 from appointments where customer_id=p_id and status in ('pending','confirmed','in_progress')) then raise exception 'EXISTING_APPOINTMENTS'; end if;
 update customers set name='Client anonymisé',phone='',email=null,notes='' where id=p_id;
 update appointments set notes='',internal_notes='',token_expires_at=now() where customer_id=p_id;
 insert into audit_logs(actor,action,entity,entity_id,details) values(auth.uid(),'anonymize','customers',p_id::text,jsonb_build_object('reason',p_reason));
end $$;
revoke all on function public.anonymize_customer(uuid,text) from public,anon;
grant execute on function public.anonymize_customer(uuid,text) to authenticated;
