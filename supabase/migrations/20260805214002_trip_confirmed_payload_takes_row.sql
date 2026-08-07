-- The payload builder must take the ROW, not the id.
--
-- on_trip_confirmed is a BEFORE UPDATE trigger, so the row still in the table
-- holds the OLD values while it runs. A builder that selected by id would have
-- emailed the customer the booking as it was before the very update being
-- confirmed — a stale price or address in the one email they keep. Taking the
-- rowtype means the trigger passes `new` (the post-image, in memory) and the
-- resend passes a freshly selected row, and both get exactly one definition of
-- what a confirmation contains.
drop function if exists public.trip_confirmed_payload(uuid);

create or replace function public.trip_confirmed_payload(t public.trips)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select jsonb_build_object(
    'reference', t.reference,
    'customer', jsonb_build_object(
      'name', t.customer_name,
      'email', t.customer_email,
      'phone', t.customer_phone),
    'route', jsonb_build_object(
      'origin', t.origin,
      'destination', t.destination,
      'tripType', case when t.return_at is not null then 'round trip' else 'one way' end),
    'pickup', jsonb_build_object(
      'address', t.pickup_address,
      'dropoffAddress', t.dropoff_address,
      'at', t.pickup_at),
    'returnLeg', case when t.return_at is not null
      then jsonb_build_object('at', t.return_at, 'flight', t.return_flight)
      else null end,
    'flight', t.flight_number,
    'guests', coalesce(t.guests,
      t.adults || ' adult' || case when t.adults = 1 then '' else 's' end
      || coalesce(' · ' || t.children || ' child' || case when t.children = 1 then '' else 'ren' end, '')),
    'suitcases', t.suitcases,
    'carSeats', t.car_seats,
    'stroller', t.stroller,
    'contactMethod', t.contact_method,
    'priceCents', t.price_cents,
    'paymentDueAt', t.payment_due_at,
    'cancellationDeadlineAt', t.free_cancel_until,
    'insideFortyEightHours', t.free_cancel_until is null
  );
$function$;

create or replace function public.notify_trip_confirmed()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_secret text;
begin
  begin
    if new.confirmation_email_sent_at is not null then
      return new;
    end if;
    if new.customer_email is null then
      insert into public.notification_failures (reference, reason)
      values (new.reference, 'no customer email on trip');
      return new;
    end if;

    select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'pixie_email_secret';

    -- `new`, not a re-read: this is a BEFORE trigger.
    perform net.http_post(
      url := 'https://pixierides.com/api/emails/trip-confirmed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-pixie-secret', v_secret
      ),
      body := public.trip_confirmed_payload(new),
      timeout_milliseconds := 15000
    );

    new.confirmation_email_sent_at := now();
  exception when others then
    insert into public.notification_failures (reference, reason)
    values (new.reference, 'notify_trip_confirmed: ' || sqlerrm);
  end;
  return new;
end;
$function$;

create or replace function public.dispatch_resend_confirmation(
  p_trip_id uuid,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_secret text;
  v_payload jsonb;
  v public.trips%rowtype;
begin
  perform public.assert_dispatch();

  select * into v from public.trips where id = p_trip_id;
  if not found then
    raise exception 'trip not found';
  end if;
  if v.customer_email is null then
    raise exception 'this booking has no email address to send to';
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'pixie_email_secret';

  v_payload := public.trip_confirmed_payload(v);
  if p_changes is not null and jsonb_array_length(p_changes) > 0 then
    v_payload := v_payload || jsonb_build_object('changes', p_changes);
  end if;

  perform net.http_post(
    url := 'https://pixierides.com/api/emails/trip-confirmed',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-pixie-secret', v_secret
    ),
    body := v_payload,
    timeout_milliseconds := 15000
  );

  -- Deliberately does NOT stamp confirmation_email_sent_at: that column is the
  -- trigger's fire-once guard for the FIRST confirmation, and a resend must
  -- neither suppress it nor claim to be it.
end;
$function$;

revoke all on function public.dispatch_resend_confirmation(uuid, jsonb) from public, anon;
grant execute on function public.dispatch_resend_confirmation(uuid, jsonb) to authenticated;
