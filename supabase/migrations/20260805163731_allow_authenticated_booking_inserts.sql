-- Booking submissions from a signed-in customer.
--
-- contact_submissions had exactly one policy: INSERT for `anon`. That is right
-- for the website, whose visitors are strangers. The app is verify-first — the
-- customer proves their mobile with a code and is therefore `authenticated` by
-- the moment the request is submitted — so RLS rejected every app booking. Not
-- an edge case: it was all of them.
--
-- No widening of exposure. `anon` can already insert any row here with the
-- public key, so allowing `authenticated` grants nothing that was not already
-- available to anyone on the internet; it just stops signing in from being the
-- thing that breaks a booking.
create policy "Allow authenticated inserts"
  on public.contact_submissions
  for insert
  to authenticated
  with check (true);
