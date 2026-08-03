-- Every place that sets or reads a deadline now goes through
-- booking_deadlines() or the stored columns. Nothing recomputes pickup − 48h.

-- 1 · App bookings
create or replace function public.submit_ride_request(
  p_origin text, p_destination text, p_pickup_at timestamptz, p_adults integer,
  p_children integer, p_car_seats text, p_flight_number text,
  p_customer_name text, p_email text)
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
     adults, children, car_seats, price_cents, status)
  values
    (public.make_trip_reference(), 'app', auth.uid(), coalesce(v_phone, ''),
     trim(p_customer_name), nullif(trim(p_email), ''), null,
     trim(p_origin), trim(p_destination), p_pickup_at,
     v_deadlines.payment_due_at, v_deadlines.free_cancel_until,
     nullif(trim(p_flight_number), ''),
     p_adults, p_children, nullif(trim(p_car_seats), ''),
     public.get_quote(p_origin, p_destination), 'requested')
  returning id into v_trip_id;

  return v_trip_id;
end $function$;

-- 2 · A customer moving their own pickup. Recomputes from the NEW pickup, which
--     is the customer's own choice — unlike a flight delay, which they never
--     agreed to and which must leave both deadlines alone.
create or replace function public.customer_change_pickup(
  p_trip_id uuid, p_new_pickup timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v public.trips%rowtype;
  v_deadlines record;
begin
  select * into v from public.trips
  where id = p_trip_id and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'not your trip';
  end if;
  if v.status in ('complete','cancelled','no_show') then
    raise exception 'this trip can no longer be changed';
  end if;
  if now() >= v.pickup_at - interval '2 hours' then
    raise exception 'inside 2 hours changes are phone only';
  end if;
  if p_new_pickup <= now() then
    raise exception 'pickup must be in the future';
  end if;

  select * into v_deadlines from public.booking_deadlines(p_new_pickup, now());

  update public.trips
    set pickup_at = p_new_pickup,
        payment_due_at = v_deadlines.payment_due_at,
        free_cancel_until = v_deadlines.free_cancel_until,
        updated_at = now()
  where id = p_trip_id;
end $function$;

-- 3 · Cancellation reads the stated deadline instead of recomputing it.
create or replace function public.customer_cancel_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v public.trips%rowtype;
begin
  select * into v from public.trips
  where id = p_trip_id and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'not your trip';
  end if;
  if v.status in ('complete','cancelled','no_show') then
    raise exception 'this trip can no longer be cancelled';
  end if;
  -- Paid bookings: free cancellation is whatever was stated at booking. NULL
  -- means it never applied.
  if v.paid_at is not null
     and (v.free_cancel_until is null or now() >= v.free_cancel_until) then
    raise exception 'inside 48 hours this booking is non-refundable';
  end if;
  update public.trips
    set status = 'cancelled', updated_at = now()
  where id = p_trip_id;
end $function$;

-- 4 · The pay page needs to branch on free_cancel_until, so it has to see it.
--     Return type changes, so drop first.
drop function if exists public.get_pay_info(text);
create or replace function public.get_pay_info(p_reference text)
returns table (
  reference text, origin text, destination text, pickup_at timestamptz,
  price_cents integer, paid_at timestamptz, payment_due_at timestamptz,
  free_cancel_until timestamptz, status text)
language sql
stable security definer
set search_path = ''
as $function$
  select t.reference, t.origin, t.destination, t.pickup_at,
         t.price_cents, t.paid_at, t.payment_due_at, t.free_cancel_until,
         t.status::text
  from public.trips t
  where t.reference = p_reference;
$function$;

-- 5 · The write-off gate read payment_cutoff(pickup) — an independent
--     recomputation that would keep flagging late bookings. Read the column.
create or replace function public.dispatch_writeoff_send(
  p_trip_id uuid, p_driver_id uuid, p_vehicle text, p_meet_point text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_name text;
  v_vehicle text;
  v public.trips%rowtype;
begin
  perform public.assert_dispatch();
  select * into v from public.trips where id = p_trip_id for update;
  if not found or v.paid_at is not null then
    raise exception 'not an unpaid trip';
  end if;
  if now() < v.payment_due_at then
    raise exception 'cutoff has not passed';
  end if;
  select full_name, public.vehicle_label(vehicle_id) into v_name, v_vehicle
  from public.profiles
  where id = p_driver_id and role = 'driver';
  if v_name is null then
    raise exception 'not a driver';
  end if;
  update public.trips
    set written_off = true,
        driver_id = p_driver_id,
        driver_name = split_part(v_name, ' ', 1),
        vehicle = coalesce(nullif(trim(p_vehicle), ''), v_vehicle),
        meet_point = nullif(trim(p_meet_point), ''),
        status = 'driver_assigned',
        driver_state = 'pending',
        updated_at = now()
  where id = p_trip_id;
end $function$;

-- 6 · No callers left. Remove it so nothing can recompute the deadline again.
drop function if exists public.payment_cutoff(timestamptz);
