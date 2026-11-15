-- REVIEW ARTIFACT ONLY. Not a migration. Install ONLY in disposable databases
-- until a separate production installation is explicitly approved.
-- Requires PostgreSQL 17+ MAINTAIN privilege support (tested on PostgreSQL 18).
BEGIN;
CREATE ROLE gelin_delete_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
CREATE ROLE gelin_cleanup_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
CREATE ROLE gelin_cleanup_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD NULL;
CREATE SCHEMA gelin_delete_private AUTHORIZATION gelin_delete_owner;
REVOKE ALL ON SCHEMA gelin_delete_private FROM PUBLIC;
GRANT USAGE ON SCHEMA public, auth TO gelin_delete_owner;
GRANT EXECUTE ON FUNCTION auth.uid() TO gelin_delete_owner;
GRANT USAGE ON SCHEMA public, gelin_delete_private TO gelin_cleanup_owner;
GRANT USAGE ON SCHEMA public TO gelin_cleanup_executor;
GRANT SELECT ON public.appointments,public.categories,public.services,public.promotions TO gelin_delete_owner;
GRANT SELECT (id,active) ON public.admin_profiles TO gelin_delete_owner;
GRANT SELECT (id,appointment_id,service_id,name,promotion_name) ON public.appointment_items TO gelin_delete_owner;
GRANT SELECT (entity,entity_id) ON public.translations TO gelin_delete_owner;
GRANT SELECT (promotion_id,service_id) ON public.promotion_services TO gelin_delete_owner;
GRANT SELECT (appointment_id) ON public.allocations,public.appointment_history,
 public.change_requests,public.payment_records,public.idempotency_records,public.notification_outbox TO gelin_delete_owner;
GRANT SELECT (appointment_id,service_ids) ON public.contact_messages TO gelin_delete_owner;
GRANT SELECT (id,name) ON public.customers TO gelin_delete_owner;
GRANT MAINTAIN ON public.admin_profiles, public.appointments, public.appointment_items,
 public.categories, public.services, public.promotions, public.translations,
 public.promotion_services, public.allocations, public.appointment_history,
 public.contact_messages, public.change_requests, public.payment_records,
 public.idempotency_records, public.notification_outbox TO gelin_delete_owner;
GRANT DELETE ON public.categories, public.promotions, public.translations,
 public.promotion_services, public.appointments, public.appointment_items,
 public.allocations, public.appointment_history TO gelin_delete_owner;
GRANT SELECT ON public.promotions TO gelin_cleanup_owner;
GRANT SELECT (promotion_name) ON public.appointment_items TO gelin_cleanup_owner;
GRANT SELECT (entity,entity_id) ON public.translations TO gelin_cleanup_owner;
GRANT SELECT (promotion_id) ON public.promotion_services TO gelin_cleanup_owner;
GRANT MAINTAIN ON public.promotions,public.appointment_items,public.translations,public.promotion_services TO gelin_cleanup_owner;
GRANT DELETE ON public.promotions, public.translations, public.promotion_services TO gelin_cleanup_owner;

-- Temporary CREATE only during installation; revoked before COMMIT.
GRANT CREATE ON SCHEMA public TO gelin_delete_owner, gelin_cleanup_owner;
SET LOCAL ROLE gelin_delete_owner;

CREATE FUNCTION gelin_delete_private.require_admin() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(711042);
 LOCK TABLE public.admin_profiles IN SHARE MODE;
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_profiles WHERE id=auth.uid() AND active) THEN
  RAISE EXCEPTION 'GH_FORBIDDEN';
 END IF;
END $$;

CREATE FUNCTION gelin_delete_private.lock_entity(p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(711042);
 IF p_kind='categories' THEN
  LOCK TABLE public.categories, public.services, public.translations IN SHARE ROW EXCLUSIVE MODE;
 ELSIF p_kind='promotions' THEN
  LOCK TABLE public.appointment_items, public.promotion_services, public.promotions, public.translations IN SHARE ROW EXCLUSIVE MODE;
 ELSIF p_kind='appointments' THEN
  LOCK TABLE public.allocations, public.appointment_history, public.appointment_items, public.appointments,
   public.change_requests, public.contact_messages, public.idempotency_records,
   public.notification_outbox, public.payment_records IN SHARE ROW EXCLUSIVE MODE;
 ELSIF p_kind='services' THEN
  LOCK TABLE public.appointment_items, public.contact_messages, public.promotion_services, public.services IN SHARE ROW EXCLUSIVE MODE;
 ELSE RAISE EXCEPTION 'GH_FORBIDDEN'; END IF;
END $$;

CREATE FUNCTION gelin_delete_private.inspect(p_kind text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r jsonb; reasons jsonb:='[]'; owned jsonb:='[]'; details jsonb:='{}'; n integer; fingerprint text;
BEGIN
 IF p_kind='categories' THEN
  SELECT pg_catalog.to_jsonb(t) INTO r FROM public.categories t WHERE id=p_id;
  IF EXISTS(SELECT 1 FROM public.services WHERE category_id=p_id) THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Cette catégorie contient encore des prestations, y compris archivées.'); END IF;
 ELSIF p_kind='services' THEN
  SELECT pg_catalog.to_jsonb(t) INTO r FROM public.services t WHERE id=p_id;
  IF (r->>'published')::boolean AND NOT (r->>'archived')::boolean THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Désactivez cette prestation avant toute demande de suppression.'); END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_items WHERE service_id=p_id) THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Prestation associée à des réservations ou à des données historiques.'); END IF;
  IF EXISTS(SELECT 1 FROM public.contact_messages WHERE p_id=ANY(service_ids)) THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Prestation associée à des demandes de rendez-vous.'); END IF;
  IF EXISTS(SELECT 1 FROM public.promotion_services WHERE service_id=p_id) THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Prestation associée à des offres.'); END IF;
  reasons:=reasons || pg_catalog.jsonb_build_array('Suppression définitive bloquée : les demandes concurrentes sans clé étrangère ne sont pas encore coordonnées. Vous pouvez conserver la prestation désactivée.');
 ELSIF p_kind='promotions' THEN
  SELECT pg_catalog.to_jsonb(t) INTO r FROM public.promotions t WHERE id=p_id;
  IF (r->>'usage_count') IS NULL OR (r->>'usage_count')::integer<>0 THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Cette offre a déjà été utilisée ou son utilisation est indéterminée.'); END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_items WHERE promotion_name IS NOT NULL) THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Historique de remises présent : absence d’utilisation de cette offre impossible à prouver, notamment après renommage.'); END IF;
  SELECT pg_catalog.count(*) INTO n FROM public.promotion_services WHERE promotion_id=p_id;
  owned:=owned || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('table','promotion_services','count',n));
 ELSIF p_kind='appointments' THEN
  SELECT pg_catalog.to_jsonb(t) INTO r FROM public.appointments t WHERE id=p_id;
  IF NOT ((r->>'status')=ANY(ARRAY['completed','cancelled_by_customer','cancelled_by_salon','rejected','no_show']))
    OR (r->>'ends_at')::timestamptz>=pg_catalog.transaction_timestamp() THEN
   reasons:=reasons || pg_catalog.jsonb_build_array('Seuls les rendez-vous passés et terminés, annulés, refusés ou absents sont éligibles.'); END IF;
  IF EXISTS(SELECT 1 FROM public.idempotency_records WHERE appointment_id=p_id) THEN reasons:=reasons || pg_catalog.jsonb_build_array('Clé d’idempotence protégée : suppression refusée pour empêcher le rejeu.'); END IF;
  IF EXISTS(SELECT 1 FROM public.payment_records WHERE appointment_id=p_id) THEN reasons:=reasons || pg_catalog.jsonb_build_array('Écritures financières protégées.'); END IF;
  IF EXISTS(SELECT 1 FROM public.change_requests WHERE appointment_id=p_id) THEN reasons:=reasons || pg_catalog.jsonb_build_array('Demandes de modification protégées.'); END IF;
  IF EXISTS(SELECT 1 FROM public.contact_messages WHERE appointment_id=p_id) THEN reasons:=reasons || pg_catalog.jsonb_build_array('Demande de réservation liée protégée.'); END IF;
  IF EXISTS(SELECT 1 FROM public.notification_outbox WHERE appointment_id=p_id) THEN reasons:=reasons || pg_catalog.jsonb_build_array('Historique de notifications protégé.'); END IF;
  SELECT pg_catalog.count(*) INTO n FROM public.appointment_items WHERE appointment_id=p_id;
  owned:=owned || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('table','appointment_items','count',n));
  SELECT pg_catalog.count(*) INTO n FROM public.allocations WHERE appointment_id=p_id;
  owned:=owned || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('table','allocations','count',n));
  SELECT pg_catalog.count(*) INTO n FROM public.appointment_history WHERE appointment_id=p_id;
  owned:=owned || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('table','appointment_history','count',n));
  details:=pg_catalog.jsonb_build_object('reference',r->>'reference','starts_at',r->>'starts_at','status',r->>'status',
   'customer',(SELECT name FROM public.customers WHERE id=(r->>'customer_id')::uuid),
   'services',COALESCE((SELECT pg_catalog.jsonb_agg(name ORDER BY id) FROM public.appointment_items WHERE appointment_id=p_id),'[]'::jsonb));
 ELSE RAISE EXCEPTION 'GH_FORBIDDEN'; END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'GH_NOT_FOUND'; END IF;
 IF p_kind IN ('categories','promotions') THEN
  SELECT pg_catalog.count(*) INTO n FROM public.translations WHERE entity=p_kind AND entity_id=p_id;
  owned:=owned || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('table','translations','count',n));
 END IF;
 fingerprint:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array(r,owned,details)::text,'UTF8')),'hex');
 RETURN pg_catalog.jsonb_build_object('entity',p_kind,'id',p_id,'name',COALESCE(r->>'name',r->>'reference',p_id::text),
  'details',details,'owned',owned,'reasons',reasons,'eligible',pg_catalog.jsonb_array_length(reasons)=0,'fingerprint',fingerprint);
END $$;

CREATE FUNCTION gelin_delete_private.remove_offer(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 DELETE FROM public.promotion_services WHERE promotion_id=p_id;
 DELETE FROM public.translations WHERE entity='promotions' AND entity_id=p_id;
 DELETE FROM public.promotions WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'GH_NOT_FOUND'; END IF;
END $$;

CREATE FUNCTION gelin_delete_private.manual(p_kind text,p_id uuid,p_confirm boolean,p_fingerprint text,p_phrase text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE info jsonb;
BEGIN
 PERFORM gelin_delete_private.require_admin();
 PERFORM gelin_delete_private.lock_entity(p_kind);
 info:=gelin_delete_private.inspect(p_kind,p_id);
 IF NOT p_confirm THEN RETURN info; END IF;
 IF p_phrase IS DISTINCT FROM 'SUPPRIMER' OR p_fingerprint IS NULL THEN RAISE EXCEPTION 'GH_CONFIRMATION'; END IF;
 IF NOT (info->>'eligible')::boolean THEN RAISE EXCEPTION USING MESSAGE='GH_DELETE_BLOCKED',DETAIL=(info->'reasons')::text; END IF;
 IF info->>'fingerprint' IS DISTINCT FROM p_fingerprint THEN RAISE EXCEPTION 'GH_CHANGED'; END IF;
 IF p_kind='categories' THEN
  DELETE FROM public.translations WHERE entity='categories' AND entity_id=p_id;
  DELETE FROM public.categories WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GH_NOT_FOUND'; END IF;
 ELSIF p_kind='promotions' THEN PERFORM gelin_delete_private.remove_offer(p_id);
 ELSIF p_kind='appointments' THEN
  DELETE FROM public.appointment_items WHERE appointment_id=p_id;
  DELETE FROM public.allocations WHERE appointment_id=p_id;
  DELETE FROM public.appointment_history WHERE appointment_id=p_id;
  DELETE FROM public.appointments WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GH_NOT_FOUND'; END IF;
 ELSE RAISE EXCEPTION 'GH_DELETE_BLOCKED'; END IF;
 RETURN pg_catalog.jsonb_build_object('deleted',true,'id',p_id,'name',info->>'name');
END $$;

-- Each public entry point fixes the target kind. No caller-supplied actor or SQL.
CREATE FUNCTION public.gelin_preview_service(p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('services',p_id,false,NULL,NULL) $$;
CREATE FUNCTION public.gelin_preview_category(p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('categories',p_id,false,NULL,NULL) $$;
CREATE FUNCTION public.gelin_preview_offer(p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('promotions',p_id,false,NULL,NULL) $$;
CREATE FUNCTION public.gelin_preview_appointment(p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('appointments',p_id,false,NULL,NULL) $$;
CREATE FUNCTION public.gelin_delete_category(p_id uuid,p_fingerprint text,p_phrase text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('categories',p_id,true,p_fingerprint,p_phrase) $$;
CREATE FUNCTION public.gelin_delete_offer(p_id uuid,p_fingerprint text,p_phrase text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('promotions',p_id,true,p_fingerprint,p_phrase) $$;
CREATE FUNCTION public.gelin_delete_appointment(p_id uuid,p_fingerprint text,p_phrase text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca'
 AS $$ SELECT gelin_delete_private.manual('appointments',p_id,true,p_fingerprint,p_phrase) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gelin_delete_private FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gelin_preview_service(uuid),public.gelin_preview_category(uuid),public.gelin_preview_offer(uuid),public.gelin_preview_appointment(uuid),
 public.gelin_delete_category(uuid,text,text),public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gelin_preview_service(uuid),public.gelin_preview_category(uuid),public.gelin_preview_offer(uuid),public.gelin_preview_appointment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION gelin_delete_private.lock_entity(text),gelin_delete_private.inspect(text,uuid),gelin_delete_private.remove_offer(uuid) TO gelin_cleanup_owner;
RESET ROLE;
SET LOCAL ROLE gelin_cleanup_owner;

CREATE FUNCTION public.gelin_cleanup_expired_offers() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='8s' SET timezone='Africa/Casablanca' AS $$
DECLARE candidate record; info jsonb; removed integer:=0; retained integer:=0; errors integer:=0;
BEGIN
 IF session_user<>'gelin_cleanup_executor' THEN RAISE EXCEPTION 'GH_FORBIDDEN'; END IF;
 PERFORM gelin_delete_private.lock_entity('promotions');
 SELECT pg_catalog.count(*) INTO retained FROM public.promotions WHERE ends_at<=pg_catalog.transaction_timestamp()
  AND (usage_count IS NULL OR usage_count<>0 OR EXISTS(SELECT 1 FROM public.appointment_items WHERE promotion_name IS NOT NULL));
 FOR candidate IN SELECT id FROM public.promotions WHERE ends_at<=pg_catalog.transaction_timestamp()
  AND usage_count=0 AND NOT EXISTS(SELECT 1 FROM public.appointment_items WHERE promotion_name IS NOT NULL)
  ORDER BY ends_at,id LIMIT 25 LOOP
  BEGIN
   info:=gelin_delete_private.inspect('promotions',candidate.id);
   IF (info->>'eligible')::boolean THEN
    PERFORM gelin_delete_private.remove_offer(candidate.id); removed:=removed+1;
   ELSE retained:=retained+1; END IF;
  EXCEPTION WHEN foreign_key_violation THEN retained:=retained+1;
   WHEN OTHERS THEN errors:=errors+1;
  END;
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('removed',removed,'retained',retained,'errors',errors);
END $$;
REVOKE ALL ON FUNCTION public.gelin_cleanup_expired_offers() FROM PUBLIC,anon,authenticated,service_role;
-- Destructive execution grants live in a separate approval-only artifact.
-- Application flags alone do not protect direct REST RPC invocation.
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM gelin_delete_owner,gelin_cleanup_owner;
COMMIT;
