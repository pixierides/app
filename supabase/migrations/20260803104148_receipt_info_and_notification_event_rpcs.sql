-- Minimal, secret-gated receipt lookup for a single booking. Deliberately
-- narrow: reference, name, email, route, pickup/return, price, paid_at — no
-- payment_due_at / stripe_session_id, so it can't be reused as a full-record reader.
create or replace function public.get_receipt_info(p_secret text, p_reference text)
returns table(
  reference text, customer_name text, customer_email text,
  origin text, destination text, pickup_at timestamptz, return_at timestamptz,
  price_cents integer, paid_at timestamptz
)
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.assert_rpc_secret(p_secret);
  return query
    select t.reference, t.customer_name, t.customer_email,
           t.origin, t.destination, t.pickup_at, t.return_at,
           t.price_cents, t.paid_at
    from public.trips t
    where t.reference = p_reference;
end
$$;

grant execute on function public.get_receipt_info(text, text) to anon, authenticated, service_role;

-- Append-only notification log. Writes into notification_failures (the same
-- table the confirmation-email path uses) for BOTH receipt successes (which
-- addresses it reached) and failures, so delivery is auditable after the fact.
create or replace function public.log_notification_event(p_secret text, p_reference text, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.assert_rpc_secret(p_secret);
  insert into public.notification_failures (reference, reason)
  values (p_reference, p_reason);
end
$$;

grant execute on function public.log_notification_event(text, text, text) to anon, authenticated, service_role;
