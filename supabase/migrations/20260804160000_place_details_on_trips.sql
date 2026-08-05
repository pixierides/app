-- What Places gives us beyond the label. The trip keeps working without any of
-- it: a typed address with no place id is a valid trip, so every column is
-- nullable and nothing reads them as required.
alter table public.trips
  add column if not exists pickup_place_id  text,
  add column if not exists pickup_lat       double precision,
  add column if not exists pickup_lng       double precision,
  add column if not exists dropoff_place_id text,
  add column if not exists dropoff_lat      double precision,
  add column if not exists dropoff_lng      double precision;

comment on column public.trips.pickup_place_id is
  'Google place id when the customer picked a suggestion. NULL when they typed a free-form address — which stays a valid booking.';

-- Only the app calls this, so the signature can change outright rather than
-- leaving an ambiguous overload behind.
drop function if exists public.submit_ride_request(
  text, text, timestamptz, integer, integer, text, text, text, text);

create or replace function public.submit_ride_request(
  p_origin text, p_destination text, p_pickup_at timestamptz, p_adults integer,
  p_children integer, p_car_seats text, p_flight_number text,
  p_customer_name text, p_email text,
  p_pickup_address text default null, p_pickup_place_id text default null,
  p_pickup_lat double precision default null, p_pickup_lng double precision default null,
  p_dropoff_address text default null, p_dropoff_place_id text default null,
  p_dropoff_lat double precision default null, p_dropoff_lng double precision default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_trip_id uuid;
  v_phone text;
  v_deadlines record;
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

  select * into v_deadlines from public.booking_deadlines(p_pickup_at, now());

  insert into public.trips
    (reference, source, customer_id, customer_phone, customer_name, customer_email, party_label,
     origin, destination, pickup_at, payment_due_at, free_cancel_until, flight_number,
     adults, children, car_seats, price_cents, status,
     pickup_address, pickup_place_id, pickup_lat, pickup_lng,
     dropoff_address, dropoff_place_id, dropoff_lat, dropoff_lng)
  values
    (public.make_trip_reference(), 'app', auth.uid(), coalesce(v_phone, ''),
     trim(p_customer_name), nullif(trim(p_email), ''), null,
     trim(p_origin), trim(p_destination), p_pickup_at,
     v_deadlines.payment_due_at, v_deadlines.free_cancel_until,
     nullif(trim(p_flight_number), ''),
     p_adults, p_children, nullif(trim(p_car_seats), ''),
     public.get_quote(p_origin, p_destination), 'requested',
     nullif(trim(coalesce(p_pickup_address, '')), ''), p_pickup_place_id,
     p_pickup_lat, p_pickup_lng,
     nullif(trim(coalesce(p_dropoff_address, '')), ''), p_dropoff_place_id,
     p_dropoff_lat, p_dropoff_lng)
  returning id into v_trip_id;

  return v_trip_id;
end $function$;
