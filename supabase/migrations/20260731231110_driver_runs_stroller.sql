-- Mirror of the applied migration `driver_runs_stroller`.
-- The stroller is a physical thing the driver has to fit in the boot, so it
-- belongs on the run payload. Still no money in this view.

alter table public.trips add column if not exists stroller text;

create or replace view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests,
  origin, destination, pickup_at, pickup_at_was, meet_point,
  flight_number, flight_landed_at,
  adults, children, car_seats, stroller,
  driver_state, vehicle, arrived_at, started_at, completed_at
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;
