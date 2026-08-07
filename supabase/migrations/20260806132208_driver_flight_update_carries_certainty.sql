-- The driver is the person most likely to know a plane is actually on the ground —
-- they are standing in the terminal. Give them the same certainty flag dispatch
-- has, rather than defaulting their observation to "estimated".
drop function if exists public.driver_update_flight(uuid, timestamptz, text, text);

create or replace function public.driver_update_flight(
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
  if not exists (
    select 1 from public.trips
    where id = p_trip_id and driver_id = auth.uid()
  ) then
    raise exception 'not your run';
  end if;
  perform public.apply_flight_update(p_trip_id, p_arrival, p_terminal, p_note, 'driver', p_is_actual);
end;
$function$;

revoke all on function public.driver_update_flight(uuid, timestamptz, text, text, boolean) from public, anon;
grant execute on function public.driver_update_flight(uuid, timestamptz, text, text, boolean) to authenticated;
