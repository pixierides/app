-- driver_run_cell_lot_states
--
-- "arrived" meant two different things: the driver is at the airport, and the
-- driver is at the kerb. Only the second starts the airport's 15-minute clock
-- and only the second should tell the family anything. The gap between a
-- flight landing and a family having their bags is 20-50 minutes, and that
-- variance is exactly what burns the 15.
--
-- Flight-landed is not the trigger. Bags-collected is.

-- 1. The states ------------------------------------------------------------
-- pending stays: a run assigned for Tuesday is not yet "driving to the
-- airport". The six states from the spec sit on top of it.

create type public.driver_run_state_v2 as enum (
  'pending', 'en_route', 'holding', 'called', 'at_kerb', 'on_trip', 'complete');

drop view if exists public.driver_runs;
drop function if exists public.driver_set_run_state(uuid, public.driver_run_state);

alter table public.trips alter column driver_state drop default;
alter table public.trips
  alter column driver_state type public.driver_run_state_v2
  using (case driver_state::text
           when 'arrived' then 'holding'   -- the safer of the two readings
           else driver_state::text
         end)::public.driver_run_state_v2;
alter table public.trips alter column driver_state set default 'pending';

drop type public.driver_run_state;
alter type public.driver_run_state_v2 rename to driver_run_state;

-- 2. Timestamps, same pattern as before ------------------------------------

alter table public.trips rename column arrived_at to holding_at;
alter table public.trips
  add column if not exists called_at timestamptz,
  add column if not exists kerb_at timestamptz,
  add column if not exists called_by text,
  add column if not exists kerb_loops integer not null default 0;

comment on column public.trips.called_by is
  'who released the driver to the kerb: customer or dispatch. A dispatch
   override is logged here rather than being silent.';

-- 3. The driver's own transitions -------------------------------------------
-- The whole change exists to stop a driver walking from holding to the kerb
-- on their own judgement, so that one raises.

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

  if not (
    (v_current in ('pending', 'en_route') and p_state in ('en_route', 'holding'))
    or (v_current = 'called'  and p_state = 'at_kerb')
    or (v_current = 'at_kerb' and p_state = 'on_trip')
    or (v_current = 'on_trip' and p_state = 'complete')
  ) then
    if v_current = 'holding' then
      raise exception 'wait for the bags call — dispatch can send you in';
    end if;
    raise exception 'cannot go from % to %', v_current, p_state;
  end if;

  update public.trips
    set driver_state = p_state,
        updated_at   = now(),
        holding_at   = case when p_state = 'holding'  then now() else holding_at end,
        kerb_at      = case when p_state = 'at_kerb'  then now() else kerb_at end,
        started_at   = case when p_state = 'on_trip'  then now() else started_at end,
        completed_at = case when p_state = 'complete' then now() else completed_at end,
        status       = case when p_state = 'complete'
                            then 'complete'::public.trip_status else status end
  where id = p_trip_id;
end $$;

revoke all on function public.driver_set_run_state(uuid, public.driver_run_state) from public;
grant execute on function public.driver_set_run_state(uuid, public.driver_run_state) to authenticated;

-- 4. Circling ---------------------------------------------------------------
-- A loop is a normal part of the job. Counted so dispatch can spot a pattern,
-- never held against the driver.

create or replace function public.driver_kerb_loop(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trips
    set driver_state = 'called',
        kerb_at      = null,
        kerb_loops   = kerb_loops + 1,
        updated_at   = now()
  where id = p_trip_id and driver_id = auth.uid() and driver_state = 'at_kerb';
  if not found then
    raise exception 'not your run, or you are not at the kerb';
  end if;
end $$;

revoke all on function public.driver_kerb_loop(uuid) from public;
grant execute on function public.driver_kerb_loop(uuid) to authenticated;

-- 5. The customer's one button ----------------------------------------------

create or replace function public.customer_bags_collected(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trips
    set driver_state = 'called',
        called_at    = now(),
        called_by    = 'customer',
        updated_at   = now()
  where id = p_trip_id
    and customer_id = auth.uid()
    and driver_state = 'holding';
  if not found then
    raise exception 'not your trip, or your driver is not waiting yet';
  end if;
end $$;

revoke all on function public.customer_bags_collected(uuid) from public;
grant execute on function public.customer_bags_collected(uuid) to authenticated;

-- 6. Dispatch's override ----------------------------------------------------
-- The customer may not have the app, may not tap, may be asleep after a
-- delayed flight. Dispatch is always the fallback and is never blocked.

create or replace function public.dispatch_set_run_state(
  p_trip_id uuid, p_state public.driver_run_state)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_dispatch();

  update public.trips
    set driver_state = p_state,
        updated_at   = now(),
        holding_at   = case when p_state = 'holding' then coalesce(holding_at, now())
                            else holding_at end,
        -- Sending them back to holding un-rings the bell.
        called_at    = case when p_state = 'called'  then now()
                            when p_state = 'holding' then null
                            else called_at end,
        called_by    = case when p_state = 'called'  then 'dispatch'
                            when p_state = 'holding' then null
                            else called_by end,
        kerb_at      = case when p_state = 'at_kerb' then now()
                            when p_state in ('holding', 'called') then null
                            else kerb_at end,
        started_at   = case when p_state = 'on_trip' then coalesce(started_at, now())
                            else started_at end,
        completed_at = case when p_state = 'complete' then coalesce(completed_at, now())
                            else completed_at end,
        status       = case when p_state = 'complete'
                            then 'complete'::public.trip_status else status end
  where id = p_trip_id;
  if not found then
    raise exception 'no such trip';
  end if;
end $$;

revoke all on function public.dispatch_set_run_state(uuid, public.driver_run_state) from public;
grant execute on function public.dispatch_set_run_state(uuid, public.driver_run_state) to authenticated;

-- 7. The run payload --------------------------------------------------------
-- Still no price columns. The passenger's number appears only once the driver
-- is actually heading to the terminal — it is for "can't find them", not for
-- browsing.

create view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests, suitcases,
  origin, destination, pickup_address, dropoff_address,
  pickup_at, pickup_at_was, meet_point,
  flight_number, flight_landed_at,
  adults, children, car_seats, stroller, customer_note,
  driver_state, vehicle,
  holding_at, called_at, kerb_at, kerb_loops, started_at, completed_at,
  case when driver_state in ('called', 'at_kerb', 'on_trip')
       then customer_phone end as customer_phone
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;
