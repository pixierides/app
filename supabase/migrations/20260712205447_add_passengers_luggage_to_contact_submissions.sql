alter table public.contact_submissions
  add column if not exists passengers text,
  add column if not exists luggage text;
