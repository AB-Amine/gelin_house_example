-- Settings has integer ID 1; its translation namespace uses this fixed UUID.
do $$ declare definition text; begin
 select pg_get_functiondef('public.fatu_catalog()'::regprocedure) into definition;
 definition:=replace(definition,'(t.entity=''services'' and','(t.entity=''salon_settings'' and t.entity_id=''00000000-0000-4000-8000-000000000001''::uuid and exists(select 1 from salon_settings where id=1 and approved)) or
   (t.entity=''services'' and');
 execute definition;
end $$;
