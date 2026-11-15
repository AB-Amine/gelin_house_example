-- DESTRUCTIVE AUTHORITY ACTIVATION. REVIEW ONLY. Never run in production
-- without separate explicit approval. Disposable tests load this after the base.
BEGIN;
GRANT EXECUTE ON FUNCTION public.gelin_delete_category(uuid,text,text),
 public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.gelin_cleanup_expired_offers() TO gelin_cleanup_executor;
-- Executor remains NOLOGIN/PASSWORD NULL. Credential provisioning and the
-- hourly scheduler are separate operator-controlled approval steps.
COMMIT;
