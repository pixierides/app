drop policy if exists "Allow anonymous inserts" on public.contact_submissions;

create policy "Allow public booking inserts"
  on public.contact_submissions
  for insert
  to public
  with check (true);
