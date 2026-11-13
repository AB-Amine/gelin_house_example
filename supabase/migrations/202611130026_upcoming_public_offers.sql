-- Announce enabled future offers without making their discounts redeemable early.
-- Keep the existing publication, code, usage-limit and service visibility rules.
do $$
declare definition text; updated text;
begin
 select pg_get_functiondef('public.fatu_catalog()'::regprocedure) into definition;
 updated := replace(definition, ' and starts_at<=now() and ends_at>now()', ' and ends_at>now()');
 updated := replace(updated, ' and p.starts_at<=now() and p.ends_at>now()', ' and p.ends_at>now()');
 if updated = definition then raise exception 'Public offer visibility predicates not found'; end if;
 execute updated;
end $$;
notify pgrst,'reload schema';
