-- Mirror of the applied migration `driver_shift_and_customer_note`.
--
-- Two things the handoff spec asks for that had no data behind them:
--
--   1. Shift status. "Account holds vehicle, seats and shift status." A driver
--      can say online/offline; dispatch sees it on the roster. It is a signal,
--      never a gate — dispatch can always send a run to an offline driver.
--   2. The note the family typed into the booking form. It was being folded
--      into the freeform `notes` blob that only dispatch reads, so gate codes
--      and "call on arrival" never reached the person driving.

-- 1. Shift ------------------------------------------------------------------

alter table public.profiles
  add column if not exists on_shift boolean not null default false;

create or replace function public.driver_set_shift(p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'driver' then
    raise exception 'drivers only';
  end if;
  update public.profiles set on_shift = coalesce(p_on, false), updated_at = now()
  where id = auth.uid();
end $$;

revoke all on function public.driver_set_shift(boolean) from public;
grant execute on function public.driver_set_shift(boolean) to authenticated;

-- Dispatch's roster grows a shift column. Postgres will not widen a function's
-- return type in place, so drop first.
drop function if exists public.dispatch_list_drivers();

create or replace function public.dispatch_list_drivers()
returns table (id uuid, full_name text, vehicle text, on_shift boolean)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  return query
    select p.id, p.full_name, public.vehicle_label(p.vehicle_id), p.on_shift
    from public.profiles p where p.role = 'driver';
end $$;

revoke all on function public.dispatch_list_drivers() from public;
grant execute on function public.dispatch_list_drivers() to authenticated;

-- 2. The customer's own note ------------------------------------------------

alter table public.trips
  add column if not exists customer_note text;

-- The website now posts the booking note as its own column instead of only
-- inside the message body.
alter table public.contact_submissions
  add column if not exists booking_notes text;

create or replace view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests, suitcases,
  origin, destination, pickup_address, dropoff_address,
  pickup_at, pickup_at_was, meet_point,
  flight_number, flight_landed_at,
  adults, children, car_seats, stroller, customer_note,
  driver_state, vehicle, arrived_at, started_at, completed_at
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;

-- Ingest fills customer_note from the new column, falling back to the "Notes:"
-- line in the message body for anything posted by an older build of the site.
-- Whole function restated because the insert's column list changes.

create or replace function public.ingest_web_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_phone text;
  v_digits text;
  v_pickup timestamptz;
  v_ref text;
  v_origin text;
  v_dest text;
  v_flight text;
  v_party text;
  v_guests text;
  v_adults int;
  v_price_cents int;
  v_trip_type text;
  v_car_seats text;
  v_note text;
  v_notes text;
begin
  -- One bad row must never cost us the enquiry, so everything is wrapped and
  -- failures are parked in ingest_failures for a human to look at.
  begin
    if new.pickup is null or new."date" is null
       or coalesce(new.message, '') like '[Contact:%' then
      return new;
    end if;

    v_digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
    if length(v_digits) = 11 and v_digits like '1%' then
      v_digits := substr(v_digits, 2);
    end if;
    if length(v_digits) <> 10 then
      raise exception 'phone will not normalise: %', coalesce(new.phone, '(null)');
    end if;
    v_phone := '+1' || v_digits;

    v_pickup := (new."date")::timestamp at time zone 'America/New_York';

    v_ref := coalesce(
      nullif(trim(new.booking_reference), ''),
      nullif(trim(new.reference), ''),
      public.make_trip_reference());

    v_origin := coalesce(
      nullif(trim(new.booking_origin), ''),
      nullif(trim(substring(new.message from 'Route: ([^→\n]+) →')), ''),
      left(new.pickup, 60));
    v_dest := coalesce(
      nullif(trim(new.booking_destination), ''),
      nullif(trim(substring(new.message from '→ ([^(\n]+)')), ''),
      left(coalesce(new.dropoff, ''), 60));
    v_trip_type := coalesce(
      nullif(trim(new.booking_trip_type), ''),
      substring(new.message from '\((one way|round trip)\)'));
    v_flight := coalesce(
      nullif(trim(new.booking_flight), ''),
      nullif(trim(substring(new.message from 'Flight: ([^\n]+)')), ''));
    v_guests := coalesce(
      nullif(trim(new.booking_guests), ''),
      nullif(trim(substring(new.message from 'Guests: ([^·\n]+)')), ''));
    v_party := case
      when v_guests is not null then
        'Guests: ' || v_guests
        || coalesce(' · Suitcases: ' || nullif(trim(new.booking_suitcases), ''), '')
      else nullif(trim(substring(new.message from '(Guests: [^\n]+)')), '')
    end;
    v_adults := coalesce(nullif(substring(coalesce(new.passengers, ''), '^\d+'), '')::int, 1);
    v_price_cents := coalesce(
      new.booking_price_cents,
      (nullif(regexp_replace(coalesce(new.price, ''), '[^0-9.]', '', 'g'), '')::numeric * 100)::int);

    v_car_seats := coalesce(
      (select string_agg((e->>'count') || '× ' || (e->>'type'), ', ') || ' · free'
       from jsonb_array_elements(new.booking_car_seats) e
       where coalesce((e->>'count')::int, 0) > 0),
      nullif(trim(substring(new.message from 'Car seats \(free\):? ?([^\n]*)')), ''));

    v_note := coalesce(
      nullif(trim(coalesce(new.booking_notes, '')), ''),
      nullif(trim(substring(new.message from 'Notes: ([^\n]+)')), ''));

    v_notes := trim(both e'\n' from
      coalesce(new.message, '')
      || e'\nPickup address: ' || new.pickup
      || coalesce(e'\nDrop-off address: ' || new.dropoff, '')
      || case when v_trip_type = 'round trip'
           then e'\n⚠ ROUND TRIP — schedule the return leg (details above).'
           else '' end);

    insert into public.trips
      (reference, source, customer_id, customer_phone, customer_name, customer_email,
       party_label, guests, contact_method, customer_note,
       origin, destination, pickup_at, payment_due_at, flight_number,
       adults, children, car_seats, stroller, suitcases,
       pickup_address, dropoff_address, return_at, return_flight,
       price_cents, status, notes)
    values
      (v_ref, 'web',
       (select id from public.profiles where phone = v_phone),
       v_phone,
       coalesce(nullif(trim(new.name), ''), 'Guest'),
       nullif(trim(coalesce(new.email, '')), ''),
       v_party, v_guests,
       nullif(trim(coalesce(new.booking_contact_method, '')), ''),
       v_note,
       v_origin, v_dest, v_pickup, v_pickup - interval '48 hours', v_flight,
       v_adults, null, v_car_seats,
       nullif(nullif(trim(coalesce(new.booking_stroller, '')), ''), 'None'),
       nullif(trim(coalesce(new.booking_suitcases, '')), ''),
       new.pickup, new.dropoff, new.booking_return_at,
       nullif(trim(coalesce(new.booking_return_flight, '')), ''),
       v_price_cents, 'requested', v_notes)
    on conflict (reference) do nothing;

  exception when others then
    begin
      insert into public.ingest_failures (reason, payload)
      values (SQLERRM, to_jsonb(new));
    exception when others then
      null;
    end;
  end;
  return new;
end $function$;

-- Old rows carried the suitcase count only inside the display label.
update public.trips
set suitcases = nullif(trim(substring(party_label from 'Suitcases: ([^·]+)$')), '')
where suitcases is null and party_label like '%Suitcases:%';
