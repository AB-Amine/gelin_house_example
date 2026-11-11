-- Private projections must format the same business timezone as the booking engine.
do $$ declare definition text; signature regprocedure; begin
 foreach signature in array array['public.manage_booking(text)'::regprocedure,'public.client_bookings()'::regprocedure] loop
  select pg_get_functiondef(signature) into definition;
  definition:=replace(definition,'''currency'',a.currency','''timezone'',(select timezone from salon_settings where id=1),''currency'',a.currency');
  execute definition;
 end loop;
end $$;
notify pgrst,'reload schema';
