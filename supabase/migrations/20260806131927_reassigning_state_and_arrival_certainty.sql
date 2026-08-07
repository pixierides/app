-- Two gaps where the three roles disagreed about the same trip.
--
-- 1. Nothing said a trip failed on OUR side. `no_show` covers the customer not
--    appearing; a driver who breaks down left the customer on the holding block
--    being reassured indefinitely, which also contradicts Terms §7.
-- 2. flight_landed_at was written from whatever dispatch or the driver typed,
--    with no way to know whether that was a real landing or a scheduled time. The
--    customer screen rendered both as "Landed 11:22 PM".

-- `reassigning` was added to trip_status separately (ALTER TYPE cannot share a
-- transaction with its own use).

alter table public.trips
  -- When the reassignment started. Doubles as the urgency marker: a trip in this
  -- state sorts to the top of the unassigned queue, oldest first.
  add column if not exists reassigning_at timestamptz,
  add column if not exists reassign_reason text,
  -- FALSE means the time in flight_landed_at is expected, not observed.
  --
  -- Default false on purpose, including for every existing row: an arrival nobody
  -- has confirmed should read "due 11:22 PM", never "landed 11:22 PM". Claiming a
  -- plane is on the ground when it is not is the kind of confident wrongness that
  -- sends a customer to a kerb to stand in the dark.
  add column if not exists flight_arrival_is_actual boolean not null default false;

comment on column public.trips.flight_arrival_is_actual is
  'True only when someone confirmed the flight is on the ground. False = the time in flight_landed_at is an estimate, and must render as "due", not "landed".';

-- ─────────────────────────────────────────────────────────────────────────────
-- The car has failed. Puts the trip back in the queue and tells the truth on the
-- customer's screen. Nothing here cancels, refunds or reassigns by itself — the
-- next driver is a human decision, and so is a refund.
create or replace function public.start_reassignment(
  p_trip_id uuid,
  p_reason text,
  p_by text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v public.trips%rowtype;
begin
  select * into v from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found';
  end if;
  if v.status in ('complete', 'cancelled', 'no_show') then
    raise exception 'this trip is % — nothing to reassign', v.status;
  end if;

  update public.trips
    set status = 'reassigning',
        reassigning_at = coalesce(reassigning_at, now()),
        reassign_reason = nullif(trim(coalesce(p_reason, '')), ''),
        -- The driver is off this run. Their stamps go with them, or the next
        -- driver inherits a run that looks half-done.
        driver_id = null,
        driver_name = null,
        driver_phone = null,
        vehicle = null,
        driver_state = 'pending',
        holding_at = null,
        called_at = null,
        called_by = null,
        kerb_at = null,
        kerb_loops = null,
        started_at = null,
        updated_at = now()
  where id = p_trip_id;

  insert into public.trip_edits
    (trip_id, reference, field, old_value, new_value, changed_by, changed_by_name)
  values
    (p_trip_id, v.reference, 'status', v.status::text, 'reassigning',
     auth.uid(), p_by || coalesce(': ' || nullif(trim(coalesce(p_reason, '')), ''), ''));
end;
$function$;

revoke all on function public.start_reassignment(uuid, text, text) from public, anon, authenticated;

-- Dispatch's route in.
create or replace function public.dispatch_reassign_trip(p_trip_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform public.assert_dispatch();
  perform public.start_reassignment(p_trip_id, p_reason, 'dispatch');
end;
$function$;

revoke all on function public.dispatch_reassign_trip(uuid, text) from public, anon;
grant execute on function public.dispatch_reassign_trip(uuid, text) to authenticated;

-- The driver's route in. A driver who has broken down should not have to find a
-- phone number, so this is one control on the run screen — but it only works on
-- a run that is actually theirs.
create or replace function public.driver_cannot_run(p_trip_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_driver uuid;
begin
  select driver_id into v_driver from public.trips where id = p_trip_id;
  if v_driver is null or v_driver <> auth.uid() then
    raise exception 'not your run';
  end if;
  perform public.start_reassignment(p_trip_id, p_reason, 'driver');
end;
$function$;

revoke all on function public.driver_cannot_run(uuid, text) from public, anon;
grant execute on function public.driver_cannot_run(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Flight updates now record whether the arrival was observed or expected.
create or replace function public.apply_flight_update(
  p_trip_id uuid,
  p_arrival timestamptz,
  p_terminal text,
  p_note text,
  p_role text,
  p_is_actual boolean default false
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
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
      v_new_pickup := v_proposed;
    elsif v_pickup - v_proposed <= interval '30 minutes' then
      v_new_pickup := v_proposed;
    else
      v_new_pickup := v_pickup;
    end if;
  end if;

  update public.trips
    set flight_landed_at    = coalesce(p_arrival, flight_landed_at),
        -- Only claim an actual landing when told so, and never let a later
        -- estimate downgrade a confirmed one back to a guess.
        flight_arrival_is_actual = case
          when p_arrival is null then flight_arrival_is_actual
          else coalesce(p_is_actual, false) or flight_arrival_is_actual
        end,
        flight_terminal     = coalesce(p_terminal, flight_terminal),
        flight_status_note  = nullif(trim(coalesce(p_note, '')), ''),
        flight_checked_at   = now(),
        flight_checked_by   = auth.uid(),
        flight_checked_by_role = p_role,
        pickup_at_was       = case when v_new_pickup <> pickup_at
                                   then pickup_at else pickup_at_was end,
        pickup_at           = v_new_pickup,
        -- payment_due_at deliberately NOT touched: it is a stated promise
        -- anchored to the pickup time at booking.
        updated_at          = now()
  where id = p_trip_id;
end;
$function$;

create or replace function public.dispatch_update_flight(
  p_trip_id uuid,
  p_arrival timestamptz,
  p_terminal text,
  p_note text,
  p_is_actual boolean default false
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform public.assert_dispatch();
  if not exists (select 1 from public.trips where id = p_trip_id) then
    raise exception 'no such trip';
  end if;
  perform public.apply_flight_update(p_trip_id, p_arrival, p_terminal, p_note, 'dispatch', p_is_actual);
end;
$function$;

revoke all on function public.dispatch_update_flight(uuid, timestamptz, text, text, boolean) from public, anon;
grant execute on function public.dispatch_update_flight(uuid, timestamptz, text, text, boolean) to authenticated;
