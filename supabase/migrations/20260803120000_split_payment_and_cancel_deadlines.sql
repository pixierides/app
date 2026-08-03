-- payment_due_at was doing two jobs: when payment must be made, and when free
-- cancellation ends. Identical for an early booking, different for a late one.
--
-- Set unconditionally to pickup − 48h, it landed BEFORE the booking existed for
-- anything booked inside 48 hours: booked Mon 05:56 for a Mon 10:00 pickup gave
-- a deadline of Sat 10:00. isPastDeadline() was therefore true the moment the
-- trip was created, so a late booking could never be paid online — and the
-- dispatch board read "cutoff passed" on a brand-new request.

alter table public.trips
  add column if not exists free_cancel_until timestamptz;

comment on column public.trips.free_cancel_until is
  'When free cancellation ends. NULL means it never applied — the booking was made inside 48 hours. NULL is the honest value: any other forces every consumer to compute an exception.';

comment on column public.trips.payment_due_at is
  'When payment must be made. Anchored to the pickup time AT BOOKING; a flight delay must never move it. Computed only by booking_deadlines().';

create or replace function public.booking_deadlines(
  p_pickup timestamptz,
  p_booked_at timestamptz,
  out payment_due_at timestamptz,
  out free_cancel_until timestamptz)
returns record
language sql
immutable
set search_path = ''
as $$
  select
    case when p_pickup - interval '48 hours' > p_booked_at
         then p_pickup - interval '48 hours'
         else p_pickup - interval '2 hours' end,
    case when p_pickup - interval '48 hours' > p_booked_at
         then p_pickup - interval '48 hours'
         else null::timestamptz end;
$$;

comment on function public.booking_deadlines(timestamptz, timestamptz) is
  'The ONE place either deadline is computed. Early booking: both are pickup-48h. Late booking: payment due pickup-2h, no free cancellation. Not the pickup time itself — a payment landing as the driver pulls up is useless, dispatch has already committed a vehicle. 2h is where free changes already stop.';

-- ——— Backfill ———————————————————————————————————————————————
-- Broken rows: the deadline predates the booking. Recompute both.
update public.trips t
set payment_due_at    = (public.booking_deadlines(t.pickup_at, t.created_at)).payment_due_at,
    free_cancel_until = (public.booking_deadlines(t.pickup_at, t.created_at)).free_cancel_until,
    updated_at        = now()
where t.payment_due_at < t.created_at;

-- Healthy rows: free cancellation did apply, and it is the same moment as the
-- stated payment deadline. Read the stored value rather than recomputing from
-- pickup_at — a flight delay may have moved the pickup since, and the deadline
-- must not follow it.
update public.trips
set free_cancel_until = payment_due_at
where free_cancel_until is null
  and pickup_at - interval '48 hours' > created_at;
