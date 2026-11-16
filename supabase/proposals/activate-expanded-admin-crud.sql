-- PROPOSAL ONLY. Requires the owner's separate confirmation for production.
BEGIN;
DO $$ BEGIN IF current_user<>'postgres' THEN RAISE EXCEPTION 'GH_INSTALL_AS_POSTGRES'; END IF; END $$;
GRANT gelin_delete_owner TO CURRENT_USER WITH SET TRUE,INHERIT FALSE;
SET LOCAL ROLE gelin_delete_owner;
GRANT EXECUTE ON FUNCTION public.gelin_crud_preview(text,uuid),public.gelin_crud_delete(text,uuid,text,text,boolean),public.gelin_account_deletion_jobs() TO authenticated;
RESET ROLE;
REVOKE gelin_delete_owner FROM CURRENT_USER;
GRANT EXECUTE ON FUNCTION public.gelin_complete_account_deletion(uuid) TO service_role;
-- No cleanup grants, login or scheduler activation.
COMMIT;
