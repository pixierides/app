-- Cancellation & change policy — boundaries enforced server-side.
-- Free cancel until 48h before pickup TIME (paid bookings); inside 48h
-- non-refundable. Changes free until 2h before pickup; closer, phone only.
-- Unpaid requests cancel freely — nothing has been charged.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)

create or replace function public.customer_cancel_trip(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.trips%rowtype;
begin
  select * into v from public.trips
  where id = p_trip_id and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'not your trip';
  end if;
  if v.status in ('complete','cancelled','no_show') then
    raise exception 'this trip can no longer be cancelled';
  end if;
  -- Paid bookings: the 48-hour boundary is from pickup TIME.
  if v.paid_at is not null and now() >= v.pickup_at - interval '48 hours' then
    raise exception 'inside 48 hours this booking is non-refundable';
  end if;
  update public.trips
    set status = 'cancelled', updated_at = now()
  where id = p_trip_id;
  -- Refund itself is executed by the payment provider (Stripe) when wired.
end $$;

grant execute on function public.customer_cancel_trip to authenticated;

create or replace function public.customer_change_pickup(
  p_trip_id uuid,
  p_new_pickup timestamptz
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.trips%rowtype;
begin
  select * into v from public.trips
  where id = p_trip_id and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'not your trip';
  end if;
  if v.status in ('complete','cancelled','no_show') then
    raise exception 'this trip can no longer be changed';
  end if;
  -- Free time/date changes stop 2 hours before the CURRENT pickup.
  if now() >= v.pickup_at - interval '2 hours' then
    raise exception 'inside 2 hours changes are phone only';
  end if;
  if p_new_pickup <= now() then
    raise exception 'pickup must be in the future';
  end if;
  update public.trips
    set pickup_at = p_new_pickup, updated_at = now()
  where id = p_trip_id;
end $$;

grant execute on function public.customer_change_pickup to authenticated;
