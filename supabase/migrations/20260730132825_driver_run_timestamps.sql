-- Real timestamps for the run lifecycle (63b shows arrived time, 30a shows
-- trip time) — honest data instead of fabricated numbers.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)
alter table public.trips
  add column arrived_at timestamptz,
  add column started_at timestamptz,
  add column completed_at timestamptz;

create or replace function public.driver_set_run_state(
  p_trip_id uuid,
  p_state public.driver_run_state
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.trips
    set driver_state = p_state,
        updated_at = now(),
        arrived_at = case when p_state = 'arrived' then now() else arrived_at end,
        started_at = case when p_state = 'on_trip' then now() else started_at end,
        completed_at = case when p_state = 'complete' then now() else completed_at end,
        status = case when p_state = 'complete' then 'complete'::public.trip_status else status end
  where id = p_trip_id and driver_id = auth.uid();
  if not found then
    raise exception 'not your run';
  end if;
end $$;

drop view public.driver_runs;
create view public.driver_runs
with (security_barrier, security_invoker = off) as
  select
    id, customer_name, party_label,
    origin, destination, pickup_at, pickup_at_was, meet_point,
    flight_number, flight_landed_at,
    adults, children, car_seats, notes,
    driver_state, vehicle,
    arrived_at, started_at, completed_at
  from public.trips
  where driver_id = auth.uid()
    and status in ('paid','driver_assigned','complete');

grant select on public.driver_runs to authenticated;
