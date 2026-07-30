-- Customer spine: quotes, verify-first request submission, pay-screen hold.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)

-- Flat-rate lookup. Keyword-matched, server-side only; aligns with the
-- website's flat pricing (to be unified with web quote logic later).
create table public.route_rates (
  keyword text primary key,
  price_cents int not null
);
alter table public.route_rates enable row level security;
-- No client policies: rates are read only through get_quote.

insert into public.route_rates (keyword, price_cents) values
  ('disney', 12900), ('floridian', 12900), ('animal kingdom', 12900),
  ('polynesian', 12900), ('contemporary', 12900), ('epcot', 12900),
  ('universal', 9900), ('cabana bay', 9900),
  ('international drive', 8900), ('convention', 8900),
  ('port canaveral', 15900);

-- The price is final: computed server-side, same function at quote and submit.
create or replace function public.get_quote(p_origin text, p_destination text)
returns int
language plpgsql security definer set search_path = ''
stable
as $$
declare
  v_price int;
begin
  select price_cents into v_price
  from public.route_rates
  where lower(p_destination) like '%' || keyword || '%'
  order by length(keyword) desc
  limit 1;
  return coalesce(v_price, 12900);
end $$;

grant execute on function public.get_quote to anon, authenticated;

-- Extra columns: the 20-minute hold (starts when the customer first opens
-- the pay screen — restated from "starts at claim" under verify-first) and
-- the assigned driver's public-facing name.
alter table public.trips
  add column hold_until timestamptz,
  add column driver_name text;

-- Verify-first submission: the caller is already signed in (OTP just
-- happened), so the request is theirs from birth. Price recomputed
-- server-side — the client's displayed number is never trusted.
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
    (customer_id, customer_phone, customer_name, party_label,
     origin, destination, pickup_at, flight_number,
     adults, children, car_seats, price_cents, status)
  values
    (auth.uid(), coalesce(v_phone, ''), trim(p_customer_name),
     null,
     trim(p_origin), trim(p_destination), p_pickup_at, nullif(trim(p_flight_number), ''),
     p_adults, p_children, nullif(trim(p_car_seats), ''),
     public.get_quote(p_origin, p_destination), 'requested')
  returning id into v_trip_id;

  return v_trip_id;
end $$;

grant execute on function public.submit_ride_request to authenticated;
revoke execute on function public.submit_ride_request from anon;

-- The hold starts when the customer first opens the pay screen after
-- confirmation — someone who can't see the pay screen isn't ignoring it.
create or replace function public.customer_open_pay(p_trip_id uuid)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_hold timestamptz;
begin
  update public.trips
    set hold_until = coalesce(hold_until, now() + interval '20 minutes'),
        updated_at = now()
  where id = p_trip_id and customer_id = auth.uid() and status = 'confirmed'
  returning hold_until into v_hold;
  if v_hold is null then
    raise exception 'trip not payable';
  end if;
  return v_hold;
end $$;

grant execute on function public.customer_open_pay to authenticated;

-- ⚠️ DEV ONLY — stands in for the Stripe payment confirmation webhook.
-- Replace with real payment verification before launch; must never ship.
create or replace function public.dev_mark_paid(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.trips
    set status = 'paid', paid_at = now(), updated_at = now()
  where id = p_trip_id and customer_id = auth.uid() and status = 'confirmed';
  if not found then
    raise exception 'trip not payable';
  end if;
end $$;

grant execute on function public.dev_mark_paid to authenticated;
