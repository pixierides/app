-- Undo a mis-assignment. Only before the run is in motion: once the driver
-- has arrived or started, pulling the trip out from under them is an
-- operational problem, not a data fix — dispatch has to phone that through.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-08-01; mirrored.)
create or replace function public.dispatch_unassign_driver(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
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
  if v.driver_state in ('arrived', 'on_trip', 'complete') then
    raise exception 'this run has already started — call the driver';
  end if;

  update public.trips
    set driver_id = null,
        driver_name = null,
        vehicle = null,          -- the car belongs to the driver
        driver_state = 'pending',
        -- back to where it was before the assignment: a paid trip waits for a
        -- driver; an unpaid one (68c write-off send) returns to the decision.
        status = case when paid_at is not null
                      then 'paid'::public.trip_status
                      else 'confirmed'::public.trip_status end,
        updated_at = now()
  where id = p_trip_id;
end $$;

revoke execute on function public.dispatch_unassign_driver from anon;
