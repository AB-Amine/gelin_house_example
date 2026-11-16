-- REVIEW ONLY: separate future manual-deletion activation, not base installation.
-- Requires verified recovery and explicit activation approval. Never enables cleanup.
BEGIN;
DO $$ BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'GH_INSTALL_AS_POSTGRES'; END IF;
END $$;
GRANT gelin_delete_owner TO CURRENT_USER WITH SET TRUE, INHERIT FALSE;
SET LOCAL ROLE gelin_delete_owner;
GRANT EXECUTE ON FUNCTION public.gelin_delete_category(uuid,text,text),
 public.gelin_delete_offer(uuid,text,text),public.gelin_delete_appointment(uuid,text,text)
 TO authenticated;
RESET ROLE;
REVOKE gelin_delete_owner FROM CURRENT_USER;
COMMIT;
