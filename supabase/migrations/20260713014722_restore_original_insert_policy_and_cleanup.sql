-- Revert to the original anon-scoped policy (the RLS change was unnecessary;
-- the real bug was the missing passengers/luggage columns)
drop policy if exists "Allow public booking inserts" on public.contact_submissions;
create policy "Allow anonymous inserts"
  on public.contact_submissions
  for insert
  to anon
  with check (true);

-- Remove the temporary diagnostic function
drop function if exists public.debug_whoami();

-- Remove test rows created during diagnosis
delete from public.contact_submissions
where email = 'anontest@example.com' or name like 'DB Test%' or name like 'Anon %Test';
