alter table public.contact_submissions
  add column if not exists reference text,
  add column if not exists price text,
  add column if not exists vehicle text;
