-- The driver's own screen renders "Landed 11:22 PM" off flight_landed_at, which
-- is usually a time read off a departures board. Without the certainty flag the
-- driver believes a landing that hasn't happened and walks in early, so the view
-- has to carry it. Appended last: Postgres only allows new view columns at the
-- end, and every existing column keeps its name and position.
--
-- Still no money in this view. A boolean about a plane is not a price.
create or replace view public.driver_runs as
 select id,
    reference,
    customer_name,
    party_label,
    guests,
    suitcases,
    origin,
    destination,
    pickup_address,
    dropoff_address,
    pickup_at,
    pickup_at_was,
    meet_point,
    flight_number,
    flight_origin,
    flight_landed_at,
    flight_terminal,
    flight_status_note,
    flight_checked_at,
    flight_checked_by_role,
    international,
    adults,
    children,
    car_seats,
    stroller,
    customer_note,
    driver_state,
    vehicle,
    holding_at,
    called_at,
    called_by,
    kerb_at,
    kerb_loops,
    started_at,
    completed_at,
    case
        when driver_state = any (array['holding'::driver_run_state, 'called'::driver_run_state, 'at_kerb'::driver_run_state, 'on_trip'::driver_run_state]) then customer_phone
        else null::text
    end as customer_phone,
    flight_arrival_is_actual
   from trips
  where driver_id = auth.uid() and (status = any (array['paid'::trip_status, 'driver_assigned'::trip_status, 'complete'::trip_status]));
