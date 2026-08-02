-- Amendment: the driver advances the run.
--
-- All day-of communication is the driver's job. They text or call the
-- passenger from the cell lot, the passenger replies when they have their
-- bags, and the driver taps. Nobody else in the chain knows before the driver
-- does — so the customer button is gone and dispatch's override stops being
-- part of the loop.
--
-- What does NOT change: bags-collected is still the trigger, never
-- flight-landed. The driver taps a fact they were told, not a decision they
-- made in a cell lot at minute forty. The button says "Passenger has their
-- bags", never "Heading to terminal".

create or replace function public.driver_set_run_state(
  p_trip_id uuid, p_state public.driver_run_state)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.driver_run_state;
begin
  select driver_state into v_current
  from public.trips where id = p_trip_id and driver_id = auth.uid();

  if not found then
    raise exception 'not your run';
  end if;

  -- Double taps are not errors.
  if v_current = p_state then
    return;
  end if;

  -- Still one step at a time: holding → at_kerb and holding → on_trip stay
  -- refused. The kerb clock only ever starts from 'called'.
  if not (
    (v_current in ('pending', 'en_route') and p_state in ('en_route', 'holding'))
    or (v_current = 'holding' and p_state = 'called')
    or (v_current = 'called'  and p_state = 'at_kerb')
    or (v_current = 'at_kerb' and p_state = 'on_trip')
    or (v_current = 'on_trip' and p_state = 'complete')
  ) then
    raise exception 'cannot go from % to %', v_current, p_state;
  end if;

  update public.trips
    set driver_state = p_state,
        updated_at   = now(),
        holding_at   = case when p_state = 'holding'  then now() else holding_at end,
        called_at    = case when p_state = 'called'   then now() else called_at end,
        called_by    = case when p_state = 'called'   then 'driver' else called_by end,
        kerb_at      = case when p_state = 'at_kerb'  then now() else kerb_at end,
        started_at   = case when p_state = 'on_trip'  then now() else started_at end,
        completed_at = case when p_state = 'complete' then now() else completed_at end,
        status       = case when p_state = 'complete'
                            then 'complete'::public.trip_status else status end
  where id = p_trip_id;
end $$;

revoke all on function public.driver_set_run_state(uuid, public.driver_run_state) from public;
grant execute on function public.driver_set_run_state(uuid, public.driver_run_state) to authenticated;

-- The customer has no say in this any more. Removed rather than left callable:
-- a state-changing RPC nobody calls is a thing that gets called by accident.
drop function if exists public.customer_bags_collected(uuid);

-- The driver's job in the cell lot is to reach the passenger, so the number
-- has to be there while they are holding — not from 'called' onward, which
-- was too late by exactly the step that matters.
-- Still no price columns.
drop view if exists public.driver_runs;

create view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests, suitcases,
  origin, destination, pickup_address, dropoff_address,
  pickup_at, pickup_at_was, meet_point,
  flight_number, flight_landed_at,
  adults, children, car_seats, stroller, customer_note,
  driver_state, vehicle,
  holding_at, called_at, called_by, kerb_at, kerb_loops, started_at, completed_at,
  case when driver_state in ('holding', 'called', 'at_kerb', 'on_trip')
       then customer_phone end as customer_phone
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;
