-- Stripe payments + the single deadline.
-- ONE customer-facing deadline, three jobs: pickup − 48h = free cancellation
-- ends, payment due, dispatch decides if still unpaid. The 6pm-day-before
-- roster lock is retired as policy.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-31; mirrored
-- here for the record. The rpc_shared_secret value is REDACTED in this copy —
-- the live value exists only in the database and the website's server env.)

alter table public.trips
  add column stripe_session_id text,
  add column payment_due_at timestamptz,
  add column payment_reminder_sent_at timestamptz;

update public.trips set payment_due_at = pickup_at - interval '48 hours';
alter table public.trips alter column payment_due_at set not null;

create or replace function public.payment_cutoff(p_pickup timestamptz)
returns timestamptz
language sql immutable
set search_path = ''
as $$
  select p_pickup - interval '48 hours';
$$;

create table public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- insert into public.app_config (key, value) values ('rpc_shared_secret', '<REDACTED>');

create or replace function public.assert_rpc_secret(p_secret text)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_secret is distinct from
     (select value from public.app_config where key = 'rpc_shared_secret') then
    raise exception 'unauthorized';
  end if;
end $$;

create or replace function public.get_pay_info(p_reference text)
returns table (
  reference text, origin text, destination text, pickup_at timestamptz,
  price_cents int, paid_at timestamptz, payment_due_at timestamptz, status text
)
language sql stable security definer
set search_path = ''
as $$
  select t.reference, t.origin, t.destination, t.pickup_at,
         t.price_cents, t.paid_at, t.payment_due_at, t.status::text
  from public.trips t
  where t.reference = p_reference;
$$;
grant execute on function public.get_pay_info to anon, authenticated;

create or replace function public.record_stripe_payment(
  p_secret text,
  p_reference text,
  p_session_id text,
  p_amount_cents int
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v public.trips%rowtype;
begin
  perform public.assert_rpc_secret(p_secret);
  select * into v from public.trips where reference = p_reference for update;
  if not found then
    raise exception 'unknown reference';
  end if;
  if v.paid_at is not null then
    return 'already_paid';
  end if;
  update public.trips
    set paid_at = now(),
        stripe_session_id = p_session_id,
        status = case when status in ('requested','confirmed')
                      then 'paid'::public.trip_status else status end,
        updated_at = now()
  where reference = p_reference;
  return 'recorded';
end $$;
revoke execute on function public.record_stripe_payment from anon, authenticated;
grant execute on function public.record_stripe_payment to anon; -- called with the shared secret

create or replace function public.due_payment_reminders(p_secret text)
returns table (
  reference text, customer_name text, customer_email text,
  origin text, destination text, pickup_at timestamptz,
  price_cents int, payment_due_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_rpc_secret(p_secret);
  return query
    select t.reference, t.customer_name, t.customer_email,
           t.origin, t.destination, t.pickup_at, t.price_cents, t.payment_due_at
    from public.trips t
    where t.paid_at is null
      and t.payment_reminder_sent_at is null
      and t.customer_email is not null
      and t.status in ('requested','confirmed')
      and t.payment_due_at > now()
      and t.payment_due_at <= now() + interval '24 hours';
end $$;
grant execute on function public.due_payment_reminders to anon;

create or replace function public.mark_payment_reminder_sent(
  p_secret text,
  p_reference text
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_rpc_secret(p_secret);
  update public.trips set payment_reminder_sent_at = now()
  where reference = p_reference;
end $$;
grant execute on function public.mark_payment_reminder_sent to anon;

-- customer_change_pickup now recomputes payment_due_at with the pickup;
-- submit_ride_request and ingest_web_booking stamp it at creation.
-- (Full function bodies as applied — see the live database; identical to the
-- prior versions plus the payment_due_at column.)
