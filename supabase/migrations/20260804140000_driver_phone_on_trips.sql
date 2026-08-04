-- Day-of contact is the driver's job, but the customer had no way to reach
-- them: profiles is readable only by its owner, so the driver's number was
-- unreachable from the customer side.
--
-- Denormalised onto the trip at assignment, exactly as driver_name and vehicle
-- already are, and cleared on unassign so a released driver's number does not
-- linger on someone else's booking.
--
-- NOTE: RLS gives the customer their whole trip row, so this is visible to them
-- from assignment onward rather than only on the day. The UI shows it only in
-- the day-of states. Tightening it properly would need a customer-facing view
-- with a gated column, the way driver_runs gates customer_phone.

alter table public.trips
  add column if not exists driver_phone text;

comment on column public.trips.driver_phone is
  'The assigned driver''s number, copied at assignment so the customer can reach them on the day. Cleared on unassign.';

create or replace function public.dispatch_assign_driver(
  p_trip_id uuid, p_driver_id uuid, p_vehicle text, p_meet_point text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_name text;
  v_vehicle text;
  v_phone text;
begin
  perform public.assert_dispatch();
  select full_name, public.vehicle_label(vehicle_id), phone
    into v_name, v_vehicle, v_phone
  from public.profiles
  where id = p_driver_id and role = 'driver';
  if v_name is null then
    raise exception 'not a driver';
  end if;
  update public.trips
    set driver_id = p_driver_id,
        driver_name = split_part(v_name, ' ', 1),
        driver_phone = v_phone,
        vehicle = coalesce(nullif(trim(p_vehicle), ''), v_vehicle),
        meet_point = nullif(trim(p_meet_point), ''),
        status = 'driver_assigned',
        driver_state = 'pending',
        updated_at = now()
  where id = p_trip_id and status = 'paid';
  if not found then
    raise exception 'trip is not paid yet';
  end if;
end $function$;

create or replace function public.dispatch_writeoff_send(
  p_trip_id uuid, p_driver_id uuid, p_vehicle text, p_meet_point text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_name text;
  v_vehicle text;
  v_phone text;
  v public.trips%rowtype;
begin
  perform public.assert_dispatch();
  select * into v from public.trips where id = p_trip_id for update;
  if not found or v.paid_at is not null then
    raise exception 'not an unpaid trip';
  end if;
  if now() < v.payment_due_at then
    raise exception 'cutoff has not passed';
  end if;
  select full_name, public.vehicle_label(vehicle_id), phone
    into v_name, v_vehicle, v_phone
  from public.profiles
  where id = p_driver_id and role = 'driver';
  if v_name is null then
    raise exception 'not a driver';
  end if;
  update public.trips
    set written_off = true,
        driver_id = p_driver_id,
        driver_name = split_part(v_name, ' ', 1),
        driver_phone = v_phone,
        vehicle = coalesce(nullif(trim(p_vehicle), ''), v_vehicle),
        meet_point = nullif(trim(p_meet_point), ''),
        status = 'driver_assigned',
        driver_state = 'pending',
        updated_at = now()
  where id = p_trip_id;
end $function$;

create or replace function public.dispatch_unassign_driver(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
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
        driver_phone = null,
        vehicle = null,
        driver_state = 'pending',
        holding_at = null,
        called_at = null,
        called_by = null,
        kerb_at = null,
        kerb_loops = 0,
        status = case when paid_at is not null
                      then 'paid'::public.trip_status
                      else 'confirmed'::public.trip_status end,
        updated_at = now()
  where id = p_trip_id;
end $function$;
