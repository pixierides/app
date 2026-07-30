-- Dispatch console: confirm, assign, attempt log (68b), send-anyway (68c).
-- Dispatch payloads carry money — correct and intentional.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)

alter table public.trips add column written_off boolean not null default false;

-- Attempt log: so a second dispatcher never re-dials a stranger.
create table public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  dispatcher_id uuid not null references public.profiles(id),
  method text not null,           -- 'called number' · 'called hotel' · ...
  note text,
  created_at timestamptz not null default now()
);
alter table public.contact_attempts enable row level security;

create policy "dispatch reads attempts"
  on public.contact_attempts for select
  using ((select role from public.profiles where id = auth.uid()) = 'dispatch');

-- Payment cutoff: 6pm (America/New_York) the day before pickup —
-- the hour dispatch locks the next night's roster.
create or replace function public.payment_cutoff(p_pickup timestamptz)
returns timestamptz
language sql immutable
set search_path = ''
as $$
  select ((p_pickup at time zone 'America/New_York')::date - 1
          + time '18:00') at time zone 'America/New_York';
$$;

create or replace function public.assert_dispatch()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'dispatch' then
    raise exception 'dispatch only';
  end if;
end $$;

-- Confirm a request (within the hour; the customer then pays).
create or replace function public.dispatch_confirm_trip(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  update public.trips
    set status = 'confirmed', updated_at = now()
  where id = p_trip_id and status = 'requested';
  if not found then
    raise exception 'trip is not awaiting confirmation';
  end if;
end $$;

-- Assign a driver to a paid trip.
create or replace function public.dispatch_assign_driver(
  p_trip_id uuid,
  p_driver_id uuid,
  p_vehicle text,
  p_meet_point text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
begin
  perform public.assert_dispatch();
  select full_name into v_name from public.profiles
  where id = p_driver_id and role = 'driver';
  if v_name is null then
    raise exception 'not a driver';
  end if;
  update public.trips
    set driver_id = p_driver_id,
        driver_name = split_part(v_name, ' ', 1),
        vehicle = nullif(trim(p_vehicle), ''),
        meet_point = nullif(trim(p_meet_point), ''),
        status = 'driver_assigned',
        driver_state = 'pending',
        updated_at = now()
  where id = p_trip_id and status = 'paid';
  if not found then
    raise exception 'trip is not paid yet';
  end if;
end $$;

-- 68c · Send the car anyway: past cutoff the trip can never be paid.
-- Deliberate, logged, costed — never automatic. The driver sees a normal
-- pickup; no fare, no mention of money.
create or replace function public.dispatch_writeoff_send(
  p_trip_id uuid,
  p_driver_id uuid,
  p_vehicle text,
  p_meet_point text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v public.trips%rowtype;
begin
  perform public.assert_dispatch();
  select * into v from public.trips where id = p_trip_id for update;
  if not found or v.paid_at is not null then
    raise exception 'not an unpaid trip';
  end if;
  if now() < public.payment_cutoff(v.pickup_at) then
    raise exception 'cutoff has not passed';
  end if;
  select full_name into v_name from public.profiles
  where id = p_driver_id and role = 'driver';
  if v_name is null then
    raise exception 'not a driver';
  end if;
  update public.trips
    set written_off = true,
        driver_id = p_driver_id,
        driver_name = split_part(v_name, ' ', 1),
        vehicle = nullif(trim(p_vehicle), ''),
        meet_point = nullif(trim(p_meet_point), ''),
        status = 'driver_assigned',
        driver_state = 'pending',
        updated_at = now()
  where id = p_trip_id;
end $$;

-- 68c · the quiet alternative: release the driver; the trip does not run.
create or replace function public.dispatch_release_trip(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.trips%rowtype;
begin
  perform public.assert_dispatch();
  select * into v from public.trips where id = p_trip_id for update;
  if not found or v.paid_at is not null then
    raise exception 'not an unpaid trip';
  end if;
  update public.trips
    set status = 'cancelled', updated_at = now()
  where id = p_trip_id;
end $$;

create or replace function public.dispatch_log_attempt(
  p_trip_id uuid,
  p_method text,
  p_note text
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  insert into public.contact_attempts (trip_id, dispatcher_id, method, note)
  values (p_trip_id, auth.uid(), trim(p_method), nullif(trim(p_note), ''));
end $$;

-- Driver roster for the assignment picker.
create or replace function public.dispatch_list_drivers()
returns table (id uuid, full_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_dispatch();
  return query select p.id, p.full_name from public.profiles p where p.role = 'driver';
end $$;

revoke execute on function public.dispatch_confirm_trip from anon;
revoke execute on function public.dispatch_assign_driver from anon;
revoke execute on function public.dispatch_writeoff_send from anon;
revoke execute on function public.dispatch_release_trip from anon;
revoke execute on function public.dispatch_log_attempt from anon;
revoke execute on function public.dispatch_list_drivers from anon;
