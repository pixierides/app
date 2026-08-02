-- Two follow-ups to the cell-lot split.

-- 1. The driver should know a dispatch override was an override, not the
--    family tapping. Column order changes, so the view is rebuilt.
--    Still no price columns — that column list is the boundary.
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
  case when driver_state in ('called', 'at_kerb', 'on_trip')
       then customer_phone end as customer_phone
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;

-- 2. The unassign guard still named 'arrived', which is no longer an enum
--    label — it would have raised "invalid input value" instead of the
--    intended refusal. The equivalent boundary in the new states: once the
--    driver is parked at the airport for this run, reassigning is a phone
--    call, not a tap.
create or replace function public.dispatch_unassign_driver(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.trips%rowtype;
begin
  perform public.assert_dispatch();
  select * into v from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found';
  end if;
  if v.driver_id is null then
    raise exception 'no driver assigned';
  end if;
  if v.driver_state in ('holding', 'called', 'at_kerb', 'on_trip', 'complete') then
    raise exception 'this run has already started — call the driver';
  end if;

  update public.trips
    set driver_id = null,
        driver_name = null,
        vehicle = null,          -- the car belongs to the driver
        driver_state = 'pending',
        holding_at = null,
        called_at = null,
        called_by = null,
        kerb_at = null,
        kerb_loops = 0,
        -- back to where it was before the assignment: a paid trip waits for a
        -- driver; an unpaid one (68c write-off send) returns to the decision.
        status = case when paid_at is not null
                      then 'paid'::public.trip_status
                      else 'confirmed'::public.trip_status end,
        updated_at = now()
  where id = p_trip_id;
end $$;

revoke all on function public.dispatch_unassign_driver(uuid) from public;
grant execute on function public.dispatch_unassign_driver(uuid) to authenticated;
