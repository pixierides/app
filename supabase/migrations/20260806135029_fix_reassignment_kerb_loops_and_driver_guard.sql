-- Two faults found by actually calling these, not by reading them.
--
-- 1. start_reassignment set kerb_loops = null, and kerb_loops is NOT NULL. Every
--    reassignment — dispatch's and the driver's — died on the constraint. It is a
--    counter of kerb circuits, so handing the run to a new driver means 0, not
--    absent.
--
-- 2. driver_cannot_run compared `v_driver <> auth.uid()`. With a null uid that
--    expression is NULL, not TRUE, so the guard fell through and the update ran.
--    `is distinct from` is the null-safe comparison and costs nothing.
create or replace function public.start_reassignment(p_trip_id uuid, p_reason text, p_by text)
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
        -- Zero, not null: NOT NULL column, and the next driver has circled the
        -- kerb no times.
        kerb_loops = 0,
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
  -- Null-safe: a null caller must be refused, not waved through.
  if v_driver is null or v_driver is distinct from auth.uid() then
    raise exception 'not your run';
  end if;
  perform public.start_reassignment(p_trip_id, p_reason, 'driver');
end;
$function$;
