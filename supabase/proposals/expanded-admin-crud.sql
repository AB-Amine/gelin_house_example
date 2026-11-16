-- PROPOSAL: NOT INSTALLED. Requires review/confirmation before production.
-- Extends the installed base; does not activate EXECUTE or modify business rows.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
SELECT pg_catalog.pg_advisory_xact_lock(711042);
DO $$ BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'GH_INSTALL_AS_POSTGRES'; END IF;
 IF to_regprocedure('gelin_delete_private.current_user_id()') IS NULL THEN RAISE EXCEPTION 'GH_BASE_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.contact_messages m CROSS JOIN LATERAL unnest(m.service_ids) s(id)
   WHERE NOT EXISTS(SELECT 1 FROM public.services x WHERE x.id=s.id)) THEN
   RAISE EXCEPTION 'GH_DANGLING_SERVICE_REFERENCES';
 END IF;
END $$;

-- Keep replay keys after deleting their booking, without retaining a live FK.
ALTER TABLE public.idempotency_records ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE public.idempotency_records ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.idempotency_records ADD CONSTRAINT gelin_idempotency_tombstone
 CHECK ((appointment_id IS NULL) = (deleted_at IS NOT NULL));
CREATE TABLE gelin_delete_private.deleted_request_keys(id uuid PRIMARY KEY);
CREATE TABLE gelin_delete_private.account_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_user uuid NOT NULL UNIQUE,
 actor uuid NOT NULL, label text NOT NULL,
 state text NOT NULL DEFAULT 'application_deleted' CHECK(state IN ('application_deleted','completed')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
-- Normalize request/service links: FK enforcement closes the request-array race,
-- including requests whose statement snapshot predates the service deletion.
CREATE TABLE gelin_delete_private.request_services(
 message_id uuid NOT NULL REFERENCES public.contact_messages(id),
 service_id uuid NOT NULL REFERENCES public.services(id),
 PRIMARY KEY(message_id,service_id)
);
INSERT INTO gelin_delete_private.request_services
 SELECT DISTINCT m.id,s.id FROM public.contact_messages m CROSS JOIN LATERAL unnest(m.service_ids) s(id);
REVOKE ALL ON ALL TABLES IN SCHEMA gelin_delete_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION gelin_delete_private.sync_request_services() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(711042);
 IF TG_OP='DELETE' THEN
   DELETE FROM gelin_delete_private.request_services WHERE message_id=OLD.id;
   RETURN OLD;
 END IF;
 IF EXISTS(SELECT 1 FROM gelin_delete_private.deleted_request_keys WHERE id=NEW.id) THEN RAISE EXCEPTION 'BOOKING_DELETED'; END IF;
 DELETE FROM gelin_delete_private.request_services WHERE message_id=NEW.id;
 INSERT INTO gelin_delete_private.request_services SELECT DISTINCT NEW.id,s FROM pg_catalog.unnest(NEW.service_ids) s;
 RETURN NEW;
END $$;
CREATE TRIGGER gelin_request_service_links AFTER INSERT OR UPDATE OF service_ids ON public.contact_messages
 FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.sync_request_services();
CREATE TRIGGER gelin_request_service_unlink BEFORE DELETE ON public.contact_messages
 FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.sync_request_services();

CREATE FUNCTION gelin_delete_private.guard_translation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.entity='services' THEN PERFORM id FROM public.services WHERE id=NEW.entity_id FOR KEY SHARE;
 ELSIF NEW.entity='categories' THEN PERFORM id FROM public.categories WHERE id=NEW.entity_id FOR KEY SHARE;
 ELSIF NEW.entity='promotions' THEN PERFORM id FROM public.promotions WHERE id=NEW.entity_id FOR KEY SHARE;
 ELSE RETURN NEW; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'GH_RELATED_RECORD_DELETED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gelin_translation_guard BEFORE INSERT OR UPDATE ON public.translations FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_translation();

CREATE FUNCTION gelin_delete_private.serialize_writer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM pg_catalog.pg_advisory_xact_lock(711042); RETURN NULL; END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['categories','services','promotions','appointments','appointment_items','customers',
 'contact_messages','client_profiles','promotion_services','qualifications','service_resources','service_cities',
 'translations','allocations','appointment_history','change_requests','payment_records','notification_outbox','idempotency_records'] LOOP
 EXECUTE format('CREATE TRIGGER gelin_crud_writer BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION gelin_delete_private.serialize_writer()',t);
 END LOOP;
END $$;
CREATE FUNCTION gelin_delete_private.guard_account_writer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME IN ('client_profiles','admin_profiles') THEN target:=NEW.id;
 ELSE target:=NEW.client_user_id; END IF;
 IF target IS NOT NULL AND EXISTS(SELECT 1 FROM gelin_delete_private.account_jobs WHERE target_user=target) THEN
  RAISE EXCEPTION 'ACCOUNT_DELETION_IN_PROGRESS';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gelin_account_guard BEFORE INSERT OR UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_account_writer();
CREATE TRIGGER gelin_account_guard BEFORE INSERT OR UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_account_writer();
CREATE TRIGGER gelin_account_guard BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_account_writer();
CREATE TRIGGER gelin_account_guard BEFORE INSERT OR UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_account_writer();
CREATE TRIGGER gelin_account_guard BEFORE INSERT OR UPDATE ON public.change_requests FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_account_writer();

CREATE FUNCTION gelin_delete_private.guard_replay_key() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'BOOKING_DELETED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gelin_replay_key_immutable BEFORE UPDATE OR DELETE ON public.idempotency_records FOR EACH ROW EXECUTE FUNCTION gelin_delete_private.guard_replay_key();
-- Patch only the three replay checks; assertions make unexpected definitions fail closed.
DO $$ DECLARE sig text; def text; needle text:='select * into idem from idempotency_records where key=p_key;'; BEGIN
 FOREACH sig IN ARRAY ARRAY[
 'public.create_booking(uuid[],timestamptz,text,text,text,text,uuid,text,text,text,uuid)',
 'public.create_fatu_booking(uuid[],timestamptz,uuid,text,text,text,text,text,text,text,uuid,text,text,uuid,text,uuid)',
 'public.create_diary_appointment(uuid[],timestamptz,text,text,text,text,uuid,uuid)'] LOOP
  SELECT pg_get_functiondef(sig::regprocedure) INTO def;
  IF position(needle in def)=0 THEN RAISE EXCEPTION 'GH_BOOKING_SIGNATURE_CHANGED: %',sig; END IF;
  EXECUTE replace(def,needle,needle||E'\n if found and idem.deleted_at is not null then raise exception ''BOOKING_DELETED''; end if;');
 END LOOP;
END $$;

GRANT SELECT,DELETE ON public.services,public.categories,public.promotions,public.appointments,public.appointment_items,
 public.allocations,public.appointment_history,public.change_requests,public.payment_records,public.notification_outbox,
 public.contact_messages,public.promotion_services,public.qualifications,public.service_resources,public.service_cities,
 public.translations,public.customers,public.client_profiles TO gelin_delete_owner;
GRANT SELECT ON public.idempotency_records TO gelin_delete_owner;
GRANT UPDATE(appointment_id,deleted_at) ON public.idempotency_records TO gelin_delete_owner;
GRANT SELECT,INSERT ON gelin_delete_private.deleted_request_keys TO gelin_delete_owner;
GRANT SELECT,INSERT ON gelin_delete_private.account_jobs TO gelin_delete_owner;
GRANT gelin_delete_owner TO CURRENT_USER WITH SET TRUE,INHERIT FALSE;
GRANT CREATE ON SCHEMA public,gelin_delete_private TO gelin_delete_owner;
SET LOCAL ROLE gelin_delete_owner;

-- Writers now serialize before DML; retaining the old table-lock-after-mutex
-- order could deadlock a waiting REST writer. Keep legacy previews compatible.
CREATE OR REPLACE FUNCTION gelin_delete_private.lock_entity(p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(711042);
 IF p_kind NOT IN ('categories','promotions','appointments','services') OR p_kind IS NULL THEN RAISE EXCEPTION 'GH_FORBIDDEN'; END IF;
END $$;

CREATE FUNCTION gelin_delete_private.crud_plan(p_kind text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE svc uuid[]:='{}'; apps uuid[]:='{}'; msgs uuid[]:='{}'; cats uuid[]:='{}'; promos uuid[]:='{}'; cust uuid[]:='{}';
 client uuid; r jsonb; t text; condition text; data jsonb; items jsonb; changes jsonb:='[]';
 all_rows jsonb:='{}'; preserved jsonb:='["Le journal d’audit existant est conservé.","Les fichiers du stockage ne sont pas supprimés."]'; total integer:=0; label text;
BEGIN
 IF p_kind='services' THEN
  SELECT to_jsonb(x) INTO r FROM public.services x WHERE id=p_id;svc:=ARRAY[p_id];
 ELSIF p_kind='categories' THEN
  SELECT to_jsonb(x) INTO r FROM public.categories x WHERE id=p_id;cats:=ARRAY[p_id];
  SELECT coalesce(array_agg(id),'{}') INTO svc FROM public.services WHERE category_id=p_id;
 ELSIF p_kind='promotions' THEN
  SELECT to_jsonb(x) INTO r FROM public.promotions x WHERE id=p_id;promos:=ARRAY[p_id];
  preserved:=preserved||jsonb_build_array('Les prix et remises déjà enregistrés dans les rendez-vous sont conservés.');
 ELSIF p_kind='appointments' THEN
  SELECT to_jsonb(x) INTO r FROM public.appointments x WHERE id=p_id;apps:=ARRAY[p_id];
 ELSIF p_kind='clients' THEN
  IF p_id=gelin_delete_private.current_user_id() OR EXISTS(SELECT 1 FROM public.admin_profiles WHERE id=p_id) THEN
   RAISE EXCEPTION 'GH_ADMIN_ACCOUNT_PROTECTED';
  END IF;
  SELECT to_jsonb(x) INTO r FROM public.client_profiles x WHERE id=p_id;client:=p_id;
 ELSE RAISE EXCEPTION 'GH_FORBIDDEN'; END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'GH_NOT_FOUND'; END IF;
 label:=coalesce(r->>'name',r->>'reference',p_id::text);
 IF cardinality(svc)>0 OR client IS NOT NULL THEN
  SELECT coalesce(array_agg(DISTINCT a.id),'{}') INTO apps FROM public.appointments a
   WHERE a.client_user_id=client OR EXISTS(SELECT 1 FROM public.appointment_items i WHERE i.appointment_id=a.id AND i.service_id=ANY(svc));
 END IF;
 SELECT coalesce(array_agg(id),'{}') INTO msgs FROM public.contact_messages
  WHERE appointment_id=ANY(apps) OR service_ids&&svc OR client_user_id=client;
 IF client IS NOT NULL THEN
  preserved:=preserved||jsonb_build_array('Les coordonnées partagées avec d’autres réservations et les données sans lien vérifiable avec ce compte sont conservées.');
  SELECT coalesce(array_agg(c.id),'{}') INTO cust FROM public.customers c
   WHERE EXISTS(SELECT 1 FROM public.appointments a WHERE a.id=ANY(apps) AND a.customer_id=c.id)
   AND NOT EXISTS(SELECT 1 FROM public.appointments a WHERE a.customer_id=c.id AND NOT(a.id=ANY(apps)));
 END IF;
 -- Fixed internal identifiers only; no caller-supplied table/SQL is interpolated.
 FOREACH t IN ARRAY ARRAY['contact_messages','change_requests','payment_records','notification_outbox',
  'allocations','appointment_history','appointment_items','promotion_services','qualifications','service_resources',
  'service_cities','translations','idempotency_records','appointments','services','categories','promotions','customers','client_profiles'] LOOP
  condition:=CASE
   WHEN t='contact_messages' THEN 't.id=ANY($3)'
   WHEN t='change_requests' THEN 't.appointment_id=ANY($2) OR t.client_user_id=$6'
   WHEN t IN ('payment_records','notification_outbox','allocations','appointment_history','appointment_items','idempotency_records') THEN 't.appointment_id=ANY($2)'
   WHEN t='promotion_services' THEN 't.service_id=ANY($1) OR t.promotion_id=ANY($5)'
   WHEN t IN ('qualifications','service_resources','service_cities') THEN 't.service_id=ANY($1)'
   WHEN t='translations' THEN '(t.entity=''services'' AND t.entity_id=ANY($1)) OR (t.entity=''categories'' AND t.entity_id=ANY($4)) OR (t.entity=''promotions'' AND t.entity_id=ANY($5))'
   WHEN t='appointments' THEN 't.id=ANY($2)'
   WHEN t='services' THEN 't.id=ANY($1)'
   WHEN t='categories' THEN 't.id=ANY($4)'
   WHEN t='promotions' THEN 't.id=ANY($5)'
   WHEN t='customers' THEN 't.id=ANY($7)'
   WHEN t='client_profiles' THEN 't.id=$6' END;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY coalesce(to_jsonb(t)->>''id'',to_jsonb(t)->>''key'')),''[]'') FROM public.%I t WHERE %s',t,condition)
   INTO data USING svc,apps,msgs,cats,promos,client,cust;
  all_rows:=all_rows||jsonb_build_object(t,data);
  IF jsonb_array_length(data)>0 THEN
   IF t='idempotency_records' THEN
    preserved:=preserved||jsonb_build_array('Les clés des requêtes supprimées restent réservées pour empêcher la recréation des rendez-vous.');
   ELSE
    SELECT jsonb_agg(jsonb_build_object('id',x->>'id','label',coalesce(x->>'reference',x->>'name',x->>'id'))) INTO items FROM jsonb_array_elements(data) x;
    changes:=changes||jsonb_build_array(jsonb_build_object('table',t,'count',jsonb_array_length(data),'rows',items));
    total:=total+jsonb_array_length(data);
   END IF;
  END IF;
 END LOOP;
 IF client IS NOT NULL THEN changes:=changes||jsonb_build_array(jsonb_build_object('table','auth.users','count',1,'rows',jsonb_build_array(jsonb_build_object('id',client,'label','Compte de connexion')))); END IF;
 RETURN jsonb_build_object('entity',p_kind,'id',p_id,'name',label,'eligible',true,'reasons','[]'::jsonb,'owned','[]'::jsonb,'details','{}'::jsonb,
  'affected',changes,'preserved',preserved,'requiresDependenciesConfirmation',total>1 OR client IS NOT NULL,
  'notices',CASE WHEN cardinality(svc)>0 AND cardinality(apps)>0 THEN jsonb_build_array('Les rendez-vous répertoriés sont supprimés en entier, même s’ils contiennent d’autres prestations.') ELSE '[]'::jsonb END,
  'fingerprint',encode(sha256(convert_to(jsonb_build_array(p_kind,p_id,all_rows)::text,'UTF8')),'hex'));
END $$;

CREATE FUNCTION public.gelin_crud_preview(p_kind text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='15s' AS $$
BEGIN
 PERFORM gelin_delete_private.require_admin();
 RETURN gelin_delete_private.crud_plan(p_kind,p_id);
END $$;
CREATE FUNCTION public.gelin_crud_delete(p_kind text,p_id uuid,p_fingerprint text,p_phrase text,p_dependents boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='3s' SET statement_timeout='15s' AS $$
DECLARE info jsonb; entry jsonb; ids uuid[]; apps uuid[]:='{}'; msgs uuid[]:='{}'; job uuid;
BEGIN
 PERFORM gelin_delete_private.require_admin();
 info:=gelin_delete_private.crud_plan(p_kind,p_id);
 IF p_phrase IS DISTINCT FROM 'SUPPRIMER' THEN RAISE EXCEPTION 'GH_CONFIRMATION'; END IF;
 IF p_fingerprint IS DISTINCT FROM info->>'fingerprint' THEN RAISE EXCEPTION 'GH_CHANGED'; END IF;
 IF (info->>'requiresDependenciesConfirmation')::boolean AND p_dependents IS DISTINCT FROM true THEN RAISE EXCEPTION 'GH_DEPENDENCY_CONFIRMATION'; END IF;
 SELECT coalesce(array_agg((r->>'id')::uuid),'{}') INTO apps FROM jsonb_array_elements(info->'affected') e CROSS JOIN LATERAL jsonb_array_elements(e->'rows') r WHERE e->>'table'='appointments';
 SELECT coalesce(array_agg((r->>'id')::uuid),'{}') INTO msgs FROM jsonb_array_elements(info->'affected') e CROSS JOIN LATERAL jsonb_array_elements(e->'rows') r WHERE e->>'table'='contact_messages';
 UPDATE public.idempotency_records SET appointment_id=NULL,deleted_at=transaction_timestamp() WHERE appointment_id=ANY(apps);
 INSERT INTO gelin_delete_private.deleted_request_keys SELECT unnest(msgs) ON CONFLICT DO NOTHING;
 -- The plan order is the explicit FK deletion order. Unknown new FKs fail and
 -- roll the entire operation back; nothing uses DROP/CASCADE or arbitrary SQL.
 FOR entry IN SELECT * FROM jsonb_array_elements(info->'affected') LOOP
  IF entry->>'table'='auth.users' THEN CONTINUE; END IF;
  SELECT array_agg((r->>'id')::uuid) INTO ids FROM jsonb_array_elements(entry->'rows') r;
  IF entry->>'table' NOT IN ('contact_messages','change_requests','payment_records','notification_outbox','allocations','appointment_history','appointment_items','promotion_services','qualifications','service_resources','service_cities','translations','appointments','services','categories','promotions','customers','client_profiles') THEN RAISE EXCEPTION 'GH_FORBIDDEN'; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id=ANY($1)',entry->>'table') USING ids;
 END LOOP;
 IF p_kind='clients' THEN
  INSERT INTO gelin_delete_private.account_jobs(target_user,actor,label) VALUES(p_id,gelin_delete_private.current_user_id(),info->>'name') RETURNING id INTO job;
  RETURN jsonb_build_object('deleted',false,'pending',true,'id',p_id,'jobId',job);
 END IF;
 RETURN jsonb_build_object('deleted',true,'id',p_id,'name',info->>'name');
END $$;
CREATE FUNCTION public.gelin_account_deletion_jobs() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM gelin_delete_private.require_admin();
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('jobId',id,'id',target_user,'name',label,'state',state) ORDER BY created_at) FROM gelin_delete_private.account_jobs WHERE state<>'completed'),'[]');
END $$;
REVOKE ALL ON FUNCTION gelin_delete_private.crud_plan(text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gelin_crud_preview(text,uuid),public.gelin_crud_delete(text,uuid,text,text,boolean),public.gelin_account_deletion_jobs() FROM PUBLIC,anon,authenticated,service_role;
RESET ROLE;
REVOKE CREATE ON SCHEMA public,gelin_delete_private FROM gelin_delete_owner;
REVOKE gelin_delete_owner FROM CURRENT_USER;

-- Server-only completion: verify Auth absence, rather than trusting a client claim.
CREATE FUNCTION public.gelin_complete_account_deletion(p_job uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j gelin_delete_private.account_jobs;
BEGIN
 PERFORM pg_advisory_xact_lock(711042);
 SELECT * INTO j FROM gelin_delete_private.account_jobs WHERE id=p_job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GH_NOT_FOUND'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=j.target_user) THEN RAISE EXCEPTION 'GH_AUTH_DELETION_PENDING'; END IF;
 UPDATE gelin_delete_private.account_jobs SET state='completed',label='',completed_at=now() WHERE id=p_job;
 RETURN jsonb_build_object('deleted',true,'id',j.target_user,'jobId',j.id);
END $$;
REVOKE ALL ON FUNCTION public.gelin_complete_account_deletion(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION gelin_delete_private.sync_request_services(),gelin_delete_private.serialize_writer(),gelin_delete_private.guard_account_writer(),gelin_delete_private.guard_replay_key(),gelin_delete_private.guard_translation() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
