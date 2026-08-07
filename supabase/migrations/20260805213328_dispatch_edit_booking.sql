-- Dispatch edits a booking.
--
-- Until now a wrong address or a moved pickup meant a phone call and no
-- corrected record. This makes every field editable, keeps an audit trail, and
-- flags a price change on a paid trip for a human rather than moving money.

-- The return leg had a time and a flight but nowhere to put its addresses; a
-- return is not always a straight reversal, so it needs its own pair.
alter table public.trips
  add column if not exists return_pickup_address text,
  add column if not exists return_dropoff_address text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit. One row per changed FIELD, not per save: "I told you it was the
-- Polynesian" is answered by a field-level history, not by a blob of before and
-- after.
create table if not exists public.trip_edits (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  reference text not null,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text,
  changed_at timestamptz not null default now(),
  email_resent boolean not null default false
);
create index if not exists trip_edits_trip_idx on public.trip_edits (trip_id, changed_at desc);

-- Price changed on a trip that was already paid. A record of a decision a human
-- still has to make, NOT an instruction to charge anything.
create table if not exists public.price_adjustments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  reference text not null,
  old_price_cents integer,
  new_price_cents integer,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text
);
create index if not exists price_adjustments_open_idx
  on public.price_adjustments (changed_at desc) where resolved_at is null;

alter table public.trip_edits enable row level security;
alter table public.price_adjustments enable row level security;

-- Readable by dispatch only. Writes go exclusively through the RPCs below, so
-- there is deliberately no insert or update policy for anyone.
drop policy if exists "dispatch reads trip edits" on public.trip_edits;
create policy "dispatch reads trip edits" on public.trip_edits
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'dispatch'
  ));

drop policy if exists "dispatch reads price adjustments" on public.price_adjustments;
create policy "dispatch reads price adjustments" on public.price_adjustments
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'dispatch'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- The edit itself.
--
-- Takes a jsonb of only the fields being changed, so an untouched field can
-- never be blanked by omission, and the audit loop stays generic.
--
-- Returns the diff, because the "what changed" block in the resent email must be
-- computed from what actually changed rather than from what the form submitted —
-- a dispatcher who retypes the same address has changed nothing and the customer
-- should not be told otherwise.
create or replace function public.dispatch_update_trip(
  p_trip_id uuid,
  p_expected_updated_at timestamptz,
  p_changes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v public.trips%rowtype;
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_field text;
  v_new_text text;
  v_old_text text;
  v_changes jsonb := '[]'::jsonb;
  v_adjustment_id uuid;
  v_new_pickup timestamptz;
  v_new_return timestamptz;
  v_origin text;
  v_dest text;
  v_new_price integer;
  -- Every field dispatch may edit, with the type it is applied as. Anything not
  -- named here is silently ignored rather than trusted: this function runs as
  -- definer, so the whitelist IS the security boundary.
  v_text_fields text[] := array[
    'origin','destination','guests','pickup_address','dropoff_address',
    'return_pickup_address','return_dropoff_address','flight_number',
    'flight_terminal','return_flight','suitcases','car_seats','stroller',
    'customer_name','customer_phone','customer_email','contact_method',
    'notes','customer_note','meet_point'
  ];
  v_int_fields text[] := array['price_cents','adults','children'];
  v_ts_fields text[] := array['pickup_at','return_at'];
  -- Cleared to empty would leave a trip nobody can run.
  v_required text[] := array['origin','destination','customer_name','customer_phone'];
begin
  perform public.assert_dispatch();

  select * into v from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found';
  end if;

  -- Editing a finished trip is never a correction, it is a mistake.
  if v.status in ('complete', 'cancelled') then
    raise exception 'this trip is % and cannot be edited', v.status;
  end if;

  -- Two dispatchers on one busy night is real. Refuse rather than overwrite:
  -- the loser reloads and sees what the other one did.
  if p_expected_updated_at is not null
     and v.updated_at is not null
     and v.updated_at <> p_expected_updated_at then
    raise exception 'stale_edit: this booking changed while you were editing it. Reload and try again.';
  end if;

  select full_name into v_actor_name from public.profiles where id = v_actor;

  -- ── validate before touching anything ──
  v_origin := coalesce(p_changes->>'origin', v.origin);
  v_dest := coalesce(p_changes->>'destination', v.destination);
  if v_origin = v_dest then
    raise exception 'pickup and destination cannot be the same place';
  end if;

  foreach v_field in array v_required loop
    if p_changes ? v_field and coalesce(trim(p_changes->>v_field), '') = '' then
      raise exception '% cannot be empty', v_field;
    end if;
  end loop;

  if p_changes ? 'pickup_at' then
    if coalesce(p_changes->>'pickup_at', '') = '' then
      raise exception 'pickup time cannot be empty';
    end if;
    v_new_pickup := (p_changes->>'pickup_at')::timestamptz;
  else
    v_new_pickup := v.pickup_at;
  end if;

  if p_changes ? 'return_at' then
    v_new_return := nullif(p_changes->>'return_at', '')::timestamptz;
  else
    v_new_return := v.return_at;
  end if;

  if v_new_return is not null and v_new_return <= v_new_pickup then
    raise exception 'the return cannot be before the outbound pickup';
  end if;

  if p_changes ? 'price_cents' then
    v_new_price := nullif(p_changes->>'price_cents', '')::integer;
    if v_new_price is not null and v_new_price < 0 then
      raise exception 'price cannot be negative';
    end if;
  end if;

  -- ── audit every genuine change, and apply it ──
  foreach v_field in array (v_text_fields || v_int_fields || v_ts_fields) loop
    if not (p_changes ? v_field) then
      continue;
    end if;

    execute format('select ($1.%I)::text', v_field) into v_old_text using v;
    v_new_text := nullif(p_changes->>v_field, '');

    -- Normalise timestamps before comparing, or an identical instant written in
    -- a different offset would read as a change and reach the customer as one.
    if v_field = any(v_ts_fields) then
      v_old_text := (case when v_old_text is null then null else v_old_text::timestamptz::text end);
      v_new_text := (case when v_new_text is null then null else v_new_text::timestamptz::text end);
    end if;

    if coalesce(v_old_text, '') = coalesce(v_new_text, '') then
      continue;
    end if;

    if v_field = any(v_text_fields) then
      execute format('update public.trips set %I = $1 where id = $2', v_field)
        using nullif(p_changes->>v_field, ''), p_trip_id;
    elsif v_field = any(v_int_fields) then
      execute format('update public.trips set %I = $1 where id = $2', v_field)
        using nullif(p_changes->>v_field, '')::integer, p_trip_id;
    else
      execute format('update public.trips set %I = $1 where id = $2', v_field)
        using nullif(p_changes->>v_field, '')::timestamptz, p_trip_id;
    end if;

    v_changes := v_changes || jsonb_build_object(
      'field', v_field, 'old', v_old_text, 'new', v_new_text);

    insert into public.trip_edits
      (trip_id, reference, field, old_value, new_value, changed_by, changed_by_name)
    values
      (p_trip_id, v.reference, v_field, v_old_text, v_new_text, v_actor, v_actor_name);
  end loop;

  if jsonb_array_length(v_changes) = 0 then
    return jsonb_build_object('changes', v_changes, 'updated_at', v.updated_at);
  end if;

  -- A moved pickup keeps the ORIGINAL time in pickup_at_was, so the was → now
  -- pair still tells the customer what they were originally given. Only stamped
  -- the first time it moves.
  if v_new_pickup <> v.pickup_at and v.pickup_at_was is null then
    update public.trips set pickup_at_was = v.pickup_at where id = p_trip_id;
  end if;

  -- payment_due_at and free_cancel_until are deliberately NOT recomputed here.
  -- Both are frozen at booking; moving a stated deadline is a change to a promise
  -- the customer never agreed to.

  -- Price changed on a trip already paid for. Recorded for a human, never acted
  -- on: someone who agreed to $129 has not agreed to $179, and taking the
  -- difference without asking is a chargeback. Nothing here touches Stripe.
  if p_changes ? 'price_cents'
     and v.paid_at is not null
     and coalesce(v_new_price, -1) <> coalesce(v.price_cents, -1) then
    insert into public.price_adjustments
      (trip_id, reference, old_price_cents, new_price_cents, changed_by)
    values
      (p_trip_id, v.reference, v.price_cents, v_new_price, v_actor)
    returning id into v_adjustment_id;
  end if;

  update public.trips set updated_at = now() where id = p_trip_id;

  return jsonb_build_object(
    'changes', v_changes,
    'adjustment_id', v_adjustment_id,
    'updated_at', (select updated_at from public.trips where id = p_trip_id)
  );
end;
$function$;

revoke all on function public.dispatch_update_trip(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.dispatch_update_trip(uuid, timestamptz, jsonb) to authenticated;

-- Marks the edits from one save as having been emailed, so the history shows
-- which corrections the customer was actually told about.
create or replace function public.dispatch_mark_edits_resent(
  p_trip_id uuid,
  p_since timestamptz
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform public.assert_dispatch();
  update public.trip_edits
    set email_resent = true
    where trip_id = p_trip_id and changed_at >= p_since;
end;
$function$;

revoke all on function public.dispatch_mark_edits_resent(uuid, timestamptz) from public, anon;
grant execute on function public.dispatch_mark_edits_resent(uuid, timestamptz) to authenticated;

-- Dispatch handled the difference in Stripe and says so. The app records the
-- decision; it never moves the money.
create or replace function public.dispatch_resolve_price_adjustment(
  p_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform public.assert_dispatch();
  if coalesce(trim(p_note), '') = '' then
    raise exception 'say what you did — a resolution with no note is not a record';
  end if;
  update public.price_adjustments
    set resolved_at = now(),
        resolved_by = auth.uid(),
        resolution_note = trim(p_note)
    where id = p_id and resolved_at is null;
  if not found then
    raise exception 'adjustment not found, or already resolved';
  end if;
end;
$function$;

revoke all on function public.dispatch_resolve_price_adjustment(uuid, text) from public, anon;
grant execute on function public.dispatch_resolve_price_adjustment(uuid, text) to authenticated;
