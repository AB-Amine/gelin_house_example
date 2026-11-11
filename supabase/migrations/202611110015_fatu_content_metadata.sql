alter table public.salon_settings add column email text, add column deposit_policy text not null default '';
alter table public.gallery add column title text not null default '',add column description text not null default '',
 add column video_url text not null default '' check(video_url='' or video_url like 'https://%'),add column featured boolean not null default false;
do $$ declare definition text; begin
 select pg_get_functiondef('public.fatu_catalog()'::regprocedure) into definition;
 definition:=replace(definition,'to_jsonb(g) order by position','to_jsonb(g) order by featured desc,position');
 definition:=replace(definition,'(t.entity=''services'' and','(t.entity=''gallery'' and exists(select 1 from gallery g where g.id=t.entity_id and g.published and g.consent_confirmed and not g.temporary)) or
   (t.entity=''reviews'' and exists(select 1 from reviews r where r.id=t.entity_id and r.published and r.verified and r.consent_confirmed)) or
   (t.entity=''services'' and');
 execute definition;
end $$;
