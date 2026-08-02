-- An airport pickup's pickup time is computed from the arrival time. Assigning
-- a driver before anyone has looked the flight up means the whole evening's
-- schedule rests on a guess, so the database refuses it. The UI gate that
-- opens the flight sheet instead of an error is a convenience; this is the
-- guarantee.
--
-- Decided by the ORIGIN, never by the flight number: a trip out of MCO with an
-- empty flight field is exactly the case this exists to catch.
--
-- Non-airport pickups are not gated. A resort-to-resort transfer has no flight
-- and no delay to absorb — the customer names the time they want, and if that
-- time is unwise that is their business.

create or replace function public.is_airport_pickup(p_origin text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_origin, '') ~* '\mmco\M|\msfb\M|airport|orlando international';
$$;

create or replace function public.assert_arrival_before_assign()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only the moment of assignment. An already-assigned run being updated for
  -- any other reason is none of this trigger's business, and a trip that
  -- becomes an airport pickup later is dispatch's decision to make, not an
  -- automatic undo — the job screen flags it instead.
  if new.driver_id is not null
     and (tg_op = 'INSERT' or old.driver_id is distinct from new.driver_id)
     and public.is_airport_pickup(new.origin)
     and new.flight_landed_at is null then
    raise exception
      'arrival time first: % is an airport pickup and the pickup time is calculated from the arrival',
      coalesce(new.reference, 'this trip');
  end if;
  return new;
end $$;

drop trigger if exists trips_arrival_before_assign on public.trips;
create trigger trips_arrival_before_assign
  before insert or update on public.trips
  for each row execute function public.assert_arrival_before_assign();
