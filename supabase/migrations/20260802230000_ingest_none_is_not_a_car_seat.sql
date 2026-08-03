-- "Car seats (free): none" in a message body was being stored as the literal
-- car seat "none", which then rendered to the driver as an included item —
-- "none — fitted & checked". Absence has to read as absence, the same way the
-- stroller field already treats 'None'.
--
-- Only the v_car_seats assignment changes; the body is restated because the
-- function has to be replaced wholesale.

create or replace function public.ingest_web_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_phone text;
  v_digits text;
  v_pickup timestamptz;
  v_ref text;
  v_origin text;
  v_dest text;
  v_flight text;
  v_party text;
  v_guests text;
  v_adults int;
  v_price_cents int;
  v_trip_type text;
  v_car_seats text;
  v_note text;
  v_notes text;
  v_return_line text;
begin
  -- One bad row must never cost us the enquiry, so everything is wrapped and
  -- failures are parked in ingest_failures for a human to look at.
  begin
    if new.pickup is null or new."date" is null
       or coalesce(new.message, '') like '[Contact:%' then
      return new;
    end if;

    v_digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
    if length(v_digits) = 11 and v_digits like '1%' then
      v_digits := substr(v_digits, 2);
    end if;
    if length(v_digits) <> 10 then
      raise exception 'phone will not normalise: %', coalesce(new.phone, '(null)');
    end if;
    v_phone := '+1' || v_digits;

    v_pickup := (new."date")::timestamp at time zone 'America/New_York';

    v_ref := coalesce(
      nullif(trim(new.booking_reference), ''),
      nullif(trim(new.reference), ''),
      public.make_trip_reference());

    v_origin := coalesce(
      nullif(trim(new.booking_origin), ''),
      nullif(trim(substring(new.message from 'Route: ([^→\n]+) →')), ''),
      left(new.pickup, 60));
    v_dest := coalesce(
      nullif(trim(new.booking_destination), ''),
      nullif(trim(substring(new.message from '→ ([^(\n]+)')), ''),
      left(coalesce(new.dropoff, ''), 60));
    v_trip_type := coalesce(
      nullif(trim(new.booking_trip_type), ''),
      substring(new.message from '\((one way|round trip)\)'));
    v_flight := coalesce(
      nullif(trim(new.booking_flight), ''),
      nullif(trim(substring(new.message from 'Flight: ([^\n]+)')), ''));
    v_guests := coalesce(
      nullif(trim(new.booking_guests), ''),
      nullif(trim(substring(new.message from 'Guests: ([^·\n]+)')), ''));
    v_party := case
      when v_guests is not null then
        'Guests: ' || v_guests
        || coalesce(' · Suitcases: ' || nullif(trim(new.booking_suitcases), ''), '')
      else nullif(trim(substring(new.message from '(Guests: [^\n]+)')), '')
    end;
    v_adults := coalesce(nullif(substring(coalesce(new.passengers, ''), '^\d+'), '')::int, 1);
    v_price_cents := coalesce(
      new.booking_price_cents,
      (nullif(regexp_replace(coalesce(new.price, ''), '[^0-9.]', '', 'g'), '')::numeric * 100)::int);

    v_car_seats := coalesce(
      (select string_agg((e->>'count') || '× ' || (e->>'type'), ', ') || ' · free'
       from jsonb_array_elements(new.booking_car_seats) e
       where coalesce((e->>'count')::int, 0) > 0),
      nullif(trim(substring(new.message from 'Car seats \(free\):? ?([^\n]*)')), ''));
    -- Absence reads as absence: 'none', 'n/a' and a dash are not car seats.
    if lower(coalesce(v_car_seats, '')) in ('none', 'n/a', 'na', '-', '—', '0') then
      v_car_seats := null;
    end if;

    v_note := coalesce(
      nullif(trim(coalesce(new.booking_notes, '')), ''),
      nullif(trim(substring(new.message from 'Notes: ([^\n]+)')), ''));

    -- The return leg gets a date, not a pointer to somewhere else in the text.
    v_return_line := case
      when v_trip_type = 'round trip' and new.booking_return_at is not null then
        e'\n⚠ ROUND TRIP — schedule the return leg: ' || v_dest || ' → ' || v_origin || ', '
        || to_char(new.booking_return_at at time zone 'America/New_York', 'FMDy DD FMMon')
        || ' at ' || trim(to_char(new.booking_return_at at time zone 'America/New_York', 'FMHH12:MI AM'))
        || '.'
      when v_trip_type = 'round trip' then
        e'\n⚠ ROUND TRIP — schedule the return leg. No return time was given.'
      else '' end;

    v_notes := trim(both e'\n' from
      coalesce(new.message, '')
      || e'\nPickup address: ' || new.pickup
      || coalesce(e'\nDrop-off address: ' || new.dropoff, '')
      || v_return_line);

    insert into public.trips
      (reference, source, customer_id, customer_phone, customer_name, customer_email,
       party_label, guests, contact_method, customer_note,
       origin, destination, pickup_at, payment_due_at, flight_number,
       adults, children, car_seats, stroller, suitcases,
       pickup_address, dropoff_address, return_at, return_flight,
       price_cents, status, notes, international)
    values
      (v_ref, 'web',
       (select id from public.profiles where phone = v_phone),
       v_phone,
       coalesce(nullif(trim(new.name), ''), 'Guest'),
       nullif(trim(coalesce(new.email, '')), ''),
       v_party, v_guests,
       nullif(trim(coalesce(new.booking_contact_method, '')), ''),
       v_note,
       v_origin, v_dest, v_pickup, v_pickup - interval '48 hours', v_flight,
       v_adults, null, v_car_seats,
       nullif(nullif(trim(coalesce(new.booking_stroller, '')), ''), 'None'),
       nullif(trim(coalesce(new.booking_suitcases, '')), ''),
       new.pickup, new.dropoff, new.booking_return_at,
       nullif(trim(coalesce(new.booking_return_flight, '')), ''),
       v_price_cents, 'requested', v_notes,
       public.infer_international(v_flight, null))
    on conflict (reference) do nothing;

  exception when others then
    begin
      insert into public.ingest_failures (reason, payload)
      values (SQLERRM, to_jsonb(new));
    exception when others then
      null;
    end;
  end;
  return new;
end $function$;

-- Fix the rows already written.
update public.trips
set car_seats = null
where lower(coalesce(car_seats, '')) in ('none', 'n/a', 'na', '-', '—', '0');
