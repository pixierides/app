-- Website bookings flow into the dispatch queue. One trip record, two sources.
-- The website keeps writing contact_submissions exactly as today; a trigger
-- mirrors booking rows into trips. The trigger NEVER raises — a failure here
-- must never break the booking flow that already works.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)

create type public.trip_source as enum ('web','app');

alter table public.trips
  add column reference text,
  add column source public.trip_source not null default 'app',
  add column customer_email text,
  add column trip_group_id uuid;

-- Same format and charset as the website generator: PR- + 6 unambiguous
-- chars (no I, O, 1, 0 — customers read these over the phone at night).
create or replace function public.make_trip_reference()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := 'PR-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
    exit when not exists (select 1 from public.trips where reference = code);
  end loop;
  return code;
end $$;

update public.trips set reference = public.make_trip_reference() where reference is null;
alter table public.trips alter column reference set not null;
alter table public.trips add constraint trips_reference_key unique (reference);

-- Durable log of rejected ingests. Dispatch-readable; silence here means a
-- family arrives at MCO with a booking nobody saw.
create table public.ingest_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reason text not null,
  payload jsonb
);
alter table public.ingest_failures enable row level security;
create policy "dispatch reads ingest failures"
  on public.ingest_failures for select
  using ((select role from public.profiles where id = auth.uid()) = 'dispatch');

-- Claiming: one mechanism for both paths. A verified sign-in attaches any
-- unclaimed trips whose phone matches the account.
create or replace function public.claim_my_trips()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_phone text;
  v_count int;
begin
  select phone into v_phone from public.profiles where id = auth.uid();
  if v_phone is null then return 0; end if;
  update public.trips
    set customer_id = auth.uid(), updated_at = now()
  where customer_id is null and customer_phone = v_phone;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
grant execute on function public.claim_my_trips to authenticated;
revoke execute on function public.claim_my_trips from anon;

-- App submissions now carry the same reference format. Dispatch must never
-- have two ID systems.
create or replace function public.submit_ride_request(
  p_origin text,
  p_destination text,
  p_pickup_at timestamptz,
  p_adults int,
  p_children int,
  p_car_seats text,
  p_flight_number text,
  p_customer_name text,
  p_email text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if p_adults < 1 or p_adults > 8 or p_children < 0 or p_children > 8 then
    raise exception 'party size out of range';
  end if;

  select phone into v_phone from public.profiles where id = auth.uid();

  update public.profiles
    set full_name = coalesce(nullif(trim(p_customer_name), ''), full_name),
        email = coalesce(nullif(trim(p_email), ''), email),
        updated_at = now()
  where id = auth.uid();

  insert into public.trips
    (reference, source, customer_id, customer_phone, customer_name, customer_email, party_label,
     origin, destination, pickup_at, flight_number,
     adults, children, car_seats, price_cents, status)
  values
    (public.make_trip_reference(), 'app', auth.uid(), coalesce(v_phone, ''),
     trim(p_customer_name), nullif(trim(p_email), ''), null,
     trim(p_origin), trim(p_destination), p_pickup_at, nullif(trim(p_flight_number), ''),
     p_adults, p_children, nullif(trim(p_car_seats), ''),
     public.get_quote(p_origin, p_destination), 'requested')
  returning id into v_trip_id;

  return v_trip_id;
end $$;

-- The ingest trigger. Mirrors booking-shaped contact_submissions rows into
-- trips. Idempotent on reference; swallows every error into ingest_failures.
create or replace function public.ingest_web_booking()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_phone text;
  v_digits text;
  v_pickup timestamptz;
  v_ref text;
  v_origin text;
  v_dest text;
  v_flight text;
  v_party text;
  v_adults int;
  v_price_cents int;
  v_trip_type text;
  v_notes text;
begin
  begin
    -- Only booking-shaped rows: contact/enquiry rows pass through untouched.
    if new.pickup is null or new."date" is null
       or coalesce(new.message, '') like '[Contact:%' then
      return new;
    end if;

    -- Phone is the matching key; it must normalise to E.164.
    v_digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
    if length(v_digits) = 11 and v_digits like '1%' then
      v_digits := substr(v_digits, 2);
    end if;
    if length(v_digits) <> 10 then
      raise exception 'phone will not normalise: %', coalesce(new.phone, '(null)');
    end if;
    v_phone := '+1' || v_digits;

    -- "2026-07-31T09:11" is local Orlando time.
    v_pickup := (new."date")::timestamp at time zone 'America/New_York';

    v_ref := coalesce(nullif(trim(new.reference), ''), public.make_trip_reference());

    -- Labels live in the message ("Route: MCO → Disney area (one way)");
    -- fall back to the raw addresses.
    v_origin := coalesce(
      nullif(trim(substring(new.message from 'Route: ([^→\n]+) →')), ''),
      left(new.pickup, 60));
    v_dest := coalesce(
      nullif(trim(substring(new.message from '→ ([^(\n]+)')), ''),
      left(coalesce(new.dropoff, ''), 60));
    v_trip_type := substring(new.message from '\((one way|round trip)\)');
    v_flight := nullif(trim(substring(new.message from 'Flight: ([^\n]+)')), '');
    v_party := nullif(trim(substring(new.message from '(Guests: [^\n]+)')), '');
    v_adults := coalesce(nullif(substring(coalesce(new.passengers, ''), '^\d+'), '')::int, 1);
    v_price_cents := (nullif(regexp_replace(coalesce(new.price, ''), '[^0-9.]', '', 'g'), '')::numeric * 100)::int;

    v_notes := trim(both e'\n' from
      coalesce(new.message, '')
      || e'\nPickup address: ' || new.pickup
      || coalesce(e'\nDrop-off address: ' || new.dropoff, '')
      || case when v_trip_type = 'round trip'
           then e'\n⚠ ROUND TRIP — schedule the return leg (details above).'
           else '' end);

    insert into public.trips
      (reference, source, customer_id, customer_phone, customer_name, customer_email,
       party_label, origin, destination, pickup_at, flight_number,
       adults, children, price_cents, status, notes)
    values
      (v_ref, 'web',
       (select id from public.profiles where phone = v_phone),
       v_phone,
       coalesce(nullif(trim(new.name), ''), 'Guest'),
       nullif(trim(coalesce(new.email, '')), ''),
       v_party, v_origin, v_dest, v_pickup, v_flight,
       v_adults, 0, v_price_cents, 'requested', v_notes)
    on conflict (reference) do nothing;

  exception when others then
    begin
      insert into public.ingest_failures (reason, payload)
      values (SQLERRM, to_jsonb(new));
    exception when others then
      null; -- absolutely nothing may break the website's insert
    end;
  end;
  return new;
end $$;

create trigger on_web_booking
  after insert on public.contact_submissions
  for each row execute function public.ingest_web_booking();
