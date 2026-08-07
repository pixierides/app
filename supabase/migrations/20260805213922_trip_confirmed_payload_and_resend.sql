-- One payload builder, used by both the confirmation trigger and dispatch's
-- resend.
--
-- The trigger built this inline. A resend that built its own copy would be a
-- second definition of what a confirmation contains, and the two would drift —
-- the customer would eventually get a corrected email missing a field the
-- original had. So the shape moves here and the trigger is rewritten to call it.
create or replace function public.trip_confirmed_payload(p_trip_id uuid)
returns jsonb
language sql
security definer
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
    -- Read from the column, never recomputed: the email and the pay page must
    -- select the same variant.
    'insideFortyEightHours', t.free_cancel_until is null
  )
  from public.trips t where t.id = p_trip_id;
$function$;

-- Resend after an edit. Dispatch presses this deliberately; nothing here fires
-- on its own, because a dispatcher fixing three typos in a row would otherwise
-- email the customer three times and they would stop reading confirmations.
--
-- The diff is passed in and merged into the same payload, so the email leads with
-- what changed and continues with the ordinary confirmation. One template.
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
  v_email text;
  v_reference text;
begin
  perform public.assert_dispatch();

  select customer_email, reference into v_email, v_reference
  from public.trips where id = p_trip_id;
  if v_reference is null then
    raise exception 'trip not found';
  end if;
  if v_email is null then
    raise exception 'this booking has no email address to send to';
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'pixie_email_secret';

  v_payload := public.trip_confirmed_payload(p_trip_id);
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
  -- trigger's fire-once guard for the FIRST confirmation, and a resend must not
  -- be able to suppress it or claim to be it.
end;
$function$;

revoke all on function public.dispatch_resend_confirmation(uuid, jsonb) from public, anon;
grant execute on function public.dispatch_resend_confirmation(uuid, jsonb) to authenticated;

-- Rewrite the trigger to use the shared builder. Same payload, same fire-once
-- guard, same failure logging — only the construction moves.
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

    perform net.http_post(
      url := 'https://pixierides.com/api/emails/trip-confirmed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-pixie-secret', v_secret
      ),
      body := public.trip_confirmed_payload(new.id),
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
