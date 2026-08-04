-- Stripe's own receipt needs an address to send to. It supports exactly one,
-- so it goes to the booking email — the customer of record — while our receipt
-- continues to go to both that address and whatever was typed at checkout.
--
-- Server-side only: get_pay_info is SECURITY DEFINER and reached with the
-- service key. The pay page must not render this field, because the booking
-- reference is the capability and must not confirm who a booking belongs to.
--
-- Return type changes, so drop first.
drop function if exists public.get_pay_info(text);

create or replace function public.get_pay_info(p_reference text)
returns table (
  reference text, origin text, destination text, pickup_at timestamptz,
  price_cents integer, paid_at timestamptz, payment_due_at timestamptz,
  free_cancel_until timestamptz, customer_email text, status text)
language sql
stable security definer
set search_path = ''
as $function$
  select t.reference, t.origin, t.destination, t.pickup_at,
         t.price_cents, t.paid_at, t.payment_due_at, t.free_cancel_until,
         t.customer_email, t.status::text
  from public.trips t
  where t.reference = p_reference;
$function$;
