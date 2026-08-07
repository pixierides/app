-- Live updates for the dispatch calendar: subscribe, don't poll.
--
-- Applied to production as a one-off statement rather than a migration;
-- recorded here so a fresh environment gets trips into the publication too.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end $$;
