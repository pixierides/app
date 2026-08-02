-- flight_status_checked_by_hand
--
-- AeroAPI is $100/month minimum and a Google search on the flight number
-- returns more than it does, arrival terminal included, for nothing. Every
-- transfer operator in Orlando works this way. These are the same columns an
-- API would populate later, so that switch becomes a background job writing to
-- fields the UI already reads — nothing else changes.
--
-- Florida's problem is that a flight checked at 2pm moves at 4pm, and the
-- driver is the one sitting in the cell lot when it does. So both roles can
-- write the flight: dispatch when scheduling, the driver from the cell lot.

alter table public.trips
  add column if not exists flight_terminal text,
  add column if not exists flight_status_note text,
  add column if not exists flight_checked_at timestamptz,
  add column if not exists flight_checked_by uuid references public.profiles(id),
  -- Denormalised so the board can say "the driver checked this" without a join.
  add column if not exists flight_checked_by_role text,
  add column if not exists international boolean not null default false;

alter table public.trips
  drop constraint if exists trips_flight_terminal_check;
alter table public.trips
  add constraint trips_flight_terminal_check
  check (flight_terminal is null or flight_terminal in ('A', 'B', 'C'));

comment on column public.trips.flight_terminal is
  'A, B or C. Deliberately no gate column: gates change late and often, and a
   driver sent to a stale gate is worse off than one sent to none. Terminal
   almost never changes and is the decision the driver is actually making —
   MCO''s kerbs are separate per terminal.';

comment on column public.trips.international is
  'Drives the pickup buffer: 45 min domestic, 75 international (immigration).
   Defaulted from the carrier at ingest, flippable by dispatch.';

-- Carrier-based inference. A foreign carrier arriving at MCO is an
-- international arrival; a US carrier could be either, so it defaults to
-- domestic and dispatch flips it. One list, in one place, so nothing drifts.
create or replace function public.is_foreign_carrier(p_flight text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    substring(upper(regexp_replace(coalesce(p_flight, ''), '[^A-Za-z0-9]', '', 'g'))
              from '^[A-Z]{2,3}')
    in (
      -- Canada
      'AC', 'WS', 'TS', 'PD', 'F8',
      -- UK and Ireland
      'BA', 'VS', 'TOM', 'BY', 'EI',
      -- Europe
      'LH', 'DE', 'AF', 'KL', 'LX', 'IB', 'UX', 'AZ', 'SK', 'DY', 'LO', 'TP',
      -- Latin America and Caribbean
      'CM', 'AV', 'LA', 'AM', 'Y4', 'VB', 'BW',
      -- Middle East and beyond
      'EK', 'QR', 'TK'
    ), false);
$$;

-- The one place the buffer lives.
create or replace function public.flight_pickup_buffer(p_international boolean)
returns interval
language sql
immutable
set search_path = ''
as $$
  -- MCO: taxi 5-10, deplaning 10-15, airside monorail to the main terminal 10,
  -- bags 15-20. International adds immigration.
  select case when p_international then interval '75 minutes'
              else interval '45 minutes' end;
$$;

/**
 * Shared body for both roles. Callers do their own authorisation first.
 *
 * Pickup only ever moves LATER on its own. A flight landing early does not
 * drag the pickup forward, because the customer planned around a time — the
 * one exception is a shift small enough not to matter, under 30 minutes.
 */
create or replace function public.apply_flight_update(
  p_trip_id uuid,
  p_arrival timestamptz,
  p_terminal text,
  p_note text,
  p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pickup timestamptz;
  v_intl boolean;
  v_proposed timestamptz;
  v_new_pickup timestamptz;
begin
  select pickup_at, international into v_pickup, v_intl
  from public.trips where id = p_trip_id;

  if p_terminal is not null and p_terminal not in ('A', 'B', 'C') then
    raise exception 'terminal must be A, B or C';
  end if;

  if p_arrival is null then
    v_new_pickup := v_pickup;
  else
    v_proposed := p_arrival + public.flight_pickup_buffer(v_intl);
    if v_proposed > v_pickup then
      v_new_pickup := v_proposed;                    -- later: always follow
    elsif v_pickup - v_proposed <= interval '30 minutes' then
      v_new_pickup := v_proposed;                    -- earlier, but trivially so
    else
      v_new_pickup := v_pickup;                      -- early landing: hold the time
    end if;
  end if;

  update public.trips
    set flight_landed_at    = coalesce(p_arrival, flight_landed_at),
        flight_terminal     = coalesce(p_terminal, flight_terminal),
        flight_status_note  = nullif(trim(coalesce(p_note, '')), ''),
        flight_checked_at   = now(),
        flight_checked_by   = auth.uid(),
        flight_checked_by_role = p_role,
        -- the previous value, so the was → now pair on the customer's trip
        -- keeps meaning "it moved" rather than "it was booked for"
        pickup_at_was       = case when v_new_pickup <> pickup_at
                                   then pickup_at else pickup_at_was end,
        pickup_at           = v_new_pickup,
        payment_due_at      = case when v_new_pickup <> pickup_at
                                   then v_new_pickup - interval '48 hours'
                                   else payment_due_at end,
        updated_at          = now()
  where id = p_trip_id;
end $$;

revoke all on function public.apply_flight_update(uuid, timestamptz, text, text, text) from public;

-- Drivers: their own runs, these three fields, nothing else.
create or replace function public.driver_update_flight(
  p_trip_id uuid,
  p_arrival timestamptz,
  p_terminal text,
  p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.trips
    where id = p_trip_id and driver_id = auth.uid()
  ) then
    raise exception 'not your run';
  end if;
  perform public.apply_flight_update(p_trip_id, p_arrival, p_terminal, p_note, 'driver');
end $$;

revoke all on function public.driver_update_flight(uuid, timestamptz, text, text) from public;
grant execute on function public.driver_update_flight(uuid, timestamptz, text, text) to authenticated;

-- Dispatch: any trip.
create or replace function public.dispatch_update_flight(
  p_trip_id uuid,
  p_arrival timestamptz,
  p_terminal text,
  p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  if not exists (select 1 from public.trips where id = p_trip_id) then
    raise exception 'no such trip';
  end if;
  perform public.apply_flight_update(p_trip_id, p_arrival, p_terminal, p_note, 'dispatch');
end $$;

revoke all on function public.dispatch_update_flight(uuid, timestamptz, text, text) from public;
grant execute on function public.dispatch_update_flight(uuid, timestamptz, text, text) to authenticated;

-- Dispatch can correct the domestic/international call the carrier guessed.
create or replace function public.dispatch_set_international(p_trip_id uuid, p_intl boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  update public.trips set international = coalesce(p_intl, false), updated_at = now()
  where id = p_trip_id;
  if not found then
    raise exception 'no such trip';
  end if;
end $$;

revoke all on function public.dispatch_set_international(uuid, boolean) from public;
grant execute on function public.dispatch_set_international(uuid, boolean) to authenticated;

-- Backfill the carrier guess for rows already in the table.
update public.trips
set international = public.is_foreign_carrier(flight_number)
where flight_number is not null;

-- The run payload gains what the driver needs to judge the wait. Still no
-- price columns — the column list is the boundary.
drop view if exists public.driver_runs;

create view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests, suitcases,
  origin, destination, pickup_address, dropoff_address,
  pickup_at, pickup_at_was, meet_point,
  flight_number, flight_landed_at, flight_terminal, flight_status_note,
  flight_checked_at, flight_checked_by_role, international,
  adults, children, car_seats, stroller, customer_note,
  driver_state, vehicle,
  holding_at, called_at, called_by, kerb_at, kerb_loops, started_at, completed_at,
  case when driver_state in ('holding', 'called', 'at_kerb', 'on_trip')
       then customer_phone end as customer_phone
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;
