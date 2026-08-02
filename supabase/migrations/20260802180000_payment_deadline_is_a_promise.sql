-- 1 · The payment deadline stops moving.
--
-- payment_due_at is stated as a fixed date in the confirmation email and it is
-- the same moment free cancellation ends. A flight delay moving it is a
-- promise change the customer never agreed to, and moving it EARLIER means
-- someone who planned to pay Tuesday has already missed it. It is anchored to
-- the pickup time at booking and left alone. Delays are our problem.
--
-- NOTE: customer_change_pickup still recomputes payment_due_at. That is the
-- customer moving their own trip rather than weather moving it, so it is left
-- as it was — but it has the same early-shift hazard and is worth a decision.
--
-- 2 · Somewhere to put the accurate signal.
--
-- The carrier is a weak proxy: DL from LHR, AA from CUN and UA from GRU all
-- look domestic and would get 45 minutes when they need 75. The departure
-- airport is the real signal, so infer_international() prefers it whenever it
-- is known and falls back to the carrier when it isn't. Nothing captures the
-- departure airport at booking yet; the column is here so that when the
-- booking form asks, nothing else has to change.

alter table public.trips
  add column if not exists flight_origin text,
  add column if not exists international_confirmed_at timestamptz;

comment on column public.trips.flight_origin is
  'Departure airport of the inbound flight (IATA). The accurate signal for the
   domestic/international buffer. Not captured at booking yet — until it is,
   inference falls back to the carrier.';

comment on column public.trips.international_confirmed_at is
  'Set when a human decided domestic vs international. While null on a domestic
   default, dispatch is shown a "Domestic?" prompt, because the carrier guess
   cannot see a US airline flying in from abroad.';

-- US origins arrive without immigration. Not exhaustive by design: an unknown
-- code reads as international, which errs toward the longer buffer, and
-- dispatch can always flip it.
create or replace function public.is_domestic_origin(p_origin text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select upper(trim(coalesce(p_origin, ''))) in (
    'ATL','JFK','LGA','EWR','BOS','PHL','DCA','IAD','BWI','CLT','ORD','MDW',
    'DTW','MSP','DEN','DFW','IAH','HOU','AUS','SAT','PHX','LAS','LAX','SFO',
    'SEA','SLC','STL','MCI','CLE','CVG','CMH','PIT','BNA','MEM','IND','MKE',
    'RDU','RIC','BUF','ROC','SYR','ALB','PVD','BDL','MHT','PWM','ORF','JAX',
    'TPA','FLL','MIA','PBI','RSW','SRQ','TLH','PNS','SAN','PDX','OAK','SJC',
    'SMF','ONT','BUR','SNA','HNL','ANC','OKC','TUL','LIT','BHM','JAN','SDF',
    'LEX','GSO','GSP','CHS','SAV','MSY','ELP','ABQ','TUS','BOI','RNO','COS',
    'OMA','DSM','ICT','MSN','GRR','DAY','TYS','CAE','MYR','ILM','PHF','ROA'
  );
$$;

/** Departure airport if we know it, carrier if we don't. */
create or replace function public.infer_international(p_flight text, p_origin text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(trim(coalesce(p_origin, '')), '') is not null
      then not public.is_domestic_origin(p_origin)
    else public.is_foreign_carrier(p_flight)
  end;
$$;

-- The payment_due_at branch is gone. Everything else is unchanged.
create or replace function public.apply_flight_update(
  p_trip_id uuid,
  p_arrival timestamptz,
  p_terminal text,
  p_note text,
  p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
      v_new_pickup := v_proposed;                    -- later: always follow
    elsif v_pickup - v_proposed <= interval '30 minutes' then
      v_new_pickup := v_proposed;                    -- earlier, but trivially so
    else
      v_new_pickup := v_pickup;                      -- early landing: hold the time
    end if;
  end if;

  update public.trips
    set flight_landed_at    = coalesce(p_arrival, flight_landed_at),
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
end $$;

revoke all on function public.apply_flight_update(uuid, timestamptz, text, text, text) from public;

-- Deciding it is what marks it decided.
create or replace function public.dispatch_set_international(p_trip_id uuid, p_intl boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  update public.trips
    set international = coalesce(p_intl, false),
        international_confirmed_at = now(),
        updated_at = now()
  where id = p_trip_id;
  if not found then
    raise exception 'no such trip';
  end if;
end $$;

revoke all on function public.dispatch_set_international(uuid, boolean) from public;
grant execute on function public.dispatch_set_international(uuid, boolean) to authenticated;

update public.trips
set international = public.infer_international(flight_number, flight_origin)
where flight_number is not null and international_confirmed_at is null;

drop view if exists public.driver_runs;

create view public.driver_runs
with (security_barrier = true) as
select
  id, reference, customer_name, party_label, guests, suitcases,
  origin, destination, pickup_address, dropoff_address,
  pickup_at, pickup_at_was, meet_point,
  flight_number, flight_origin, flight_landed_at, flight_terminal,
  flight_status_note, flight_checked_at, flight_checked_by_role, international,
  adults, children, car_seats, stroller, customer_note,
  driver_state, vehicle,
  holding_at, called_at, called_by, kerb_at, kerb_loops, started_at, completed_at,
  case when driver_state in ('holding', 'called', 'at_kerb', 'on_trip')
       then customer_phone end as customer_phone
from public.trips
where driver_id = auth.uid()
  and status in ('paid', 'driver_assigned', 'complete');

grant select on public.driver_runs to authenticated;
