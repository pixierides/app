-- A booking made by a signed-in customer belongs to that customer, whatever
-- number is in the contact field.
--
-- ingest_web_booking derives customer_id by matching the contact phone against
-- profiles. That is right for the website, where a stranger types their own
-- number and there is no session to consult. It is wrong for a signed-in app
-- customer booking a ride for someone else — their parents, on their parents'
-- phone — because the trip then matches no profile and disappears from the Trips
-- tab of the person who booked and is paying for it.
--
-- So the submission may state its account, and the trigger prefers it. Structured,
-- like booking_source, and never parsed out of the message string.
alter table public.contact_submissions
  add column if not exists booking_customer_id uuid;

comment on column public.contact_submissions.booking_customer_id is
  'The signed-in customer who made this booking, when there was one. Preferred over the phone lookup in ingest_web_booking — the contact number may be somebody else''s.';

do $$
declare
  def text;
  patched text;
  target text := '(select id from public.profiles where phone = v_phone)';
begin
  select pg_get_functiondef(oid) into def
  from pg_proc where proname = 'ingest_web_booking';

  if position(target in def) = 0 then
    raise exception 'ingest_web_booking: customer_id lookup not found, nothing patched';
  end if;

  patched := replace(
    def,
    target,
    -- An id supplied by the client is only ever ITS OWN session's: RLS on the
    -- insert cannot verify that, so treat it as a hint and fall back to the phone
    -- match. The worst a forged value does is attach a booking to another
    -- customer's trip list, which is why it must be a real profile id.
    '(coalesce(' ||
      '(select p.id from public.profiles p where p.id = new.booking_customer_id), ' ||
      '(select p.id from public.profiles p where p.phone = v_phone)' ||
    '))');

  execute patched;
end $$;
