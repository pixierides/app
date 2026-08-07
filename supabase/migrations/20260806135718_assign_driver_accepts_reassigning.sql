-- The reassignment queue was a dead end.
--
-- dispatch_assign_driver matched `status = 'paid'`, so once a car failed and the
-- trip moved to 'reassigning' there was no way to put another driver on it: the
-- board offered the trip, the picker offered drivers, and the RPC answered "trip
-- is not paid yet". The one path the whole feature exists to enable was closed.
--
-- Assigning is also how a reassignment ENDS, so the urgent marker is cleared here.
-- The durable record is the trip_edits row start_reassignment wrote; the columns
-- only exist to drive the board, and a trip with a driver is no longer waiting.
create or replace function public.dispatch_assign_driver(p_trip_id uuid, p_driver_id uuid, p_vehicle text, p_meet_point text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_name text;
  v_vehicle text;
  v_phone text;
  v_status public.trip_status;
begin
  perform public.assert_dispatch();
  select full_name, public.vehicle_label(vehicle_id), phone
    into v_name, v_vehicle, v_phone
  from public.profiles
  where id = p_driver_id and role = 'driver';
  if v_name is null then
    raise exception 'not a driver';
  end if;

  select status into v_status from public.trips where id = p_trip_id;
  if v_status is null then
    raise exception 'trip not found';
  end if;
  if v_status not in ('paid', 'reassigning') then
    raise exception 'this trip is % — it can''t take a driver yet', v_status;
  end if;

  update public.trips
    set driver_id = p_driver_id,
        driver_name = split_part(v_name, ' ', 1),
        driver_phone = v_phone,
        vehicle = coalesce(nullif(trim(p_vehicle), ''), v_vehicle),
        meet_point = nullif(trim(p_meet_point), ''),
        status = 'driver_assigned',
        driver_state = 'pending',
        -- The replacement IS the resolution.
        reassigning_at = null,
        reassign_reason = null,
        updated_at = now()
  where id = p_trip_id;
end $function$;
