-- Mirror of the applied migration `driver_runs_addresses_and_details`.
--
-- The driver app was showing the short route labels ("MCO", "Disney area")
-- because that is all the run payload carried. A driver needs the actual
-- street address to navigate, the booking reference to quote to dispatch, and
-- the suitcase count to know what will fit. All of it already lives on trips;
-- the view was just not passing it through.
--
-- Money stays out: the column list here is the security boundary.

create or replace view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests, suitcases,
  origin, destination, pickup_address, dropoff_address,
  pickup_at, pickup_at_was, meet_point,
  flight_number, flight_landed_at,
  adults, children, car_seats, stroller,
  driver_state, vehicle, arrived_at, started_at, completed_at
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;
