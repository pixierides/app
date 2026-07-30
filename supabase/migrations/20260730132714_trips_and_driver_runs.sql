-- Pixie Rides trips: one record, two surfaces (web + app), matched by phone.
-- Status spine (exact wording in UI): Requested → Confirmed → Paid → Driver assigned → Complete
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)
create type public.trip_status as enum
  ('requested','confirmed','paid','driver_assigned','complete','cancelled','no_show');

create type public.driver_run_state as enum
  ('pending','en_route','arrived','on_trip','complete');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- who
  customer_id uuid references public.profiles(id),  -- null for web bookings until claimed by phone
  customer_phone text not null,                     -- E.164 · the matching key
  customer_name text not null,                      -- booker's first+last · goes on the sign
  party_label text,                                 -- 'The Reyes family · 2+1 · booster' (run lists, never the sign)

  -- route
  origin text not null,
  destination text not null,
  pickup_at timestamptz not null,
  pickup_at_was timestamptz,                        -- was → now pair when flight watching moves it
  meet_point text,                                  -- 'Baggage claim 4 · door A'

  -- flight
  flight_number text,
  flight_landed_at timestamptz,

  -- party
  adults int not null default 1,
  children int not null default 0,
  car_seats text,                                   -- '1 booster · free'
  notes text,

  -- money — never present in any driver payload (see driver_runs view)
  price_cents int,
  paid_at timestamptz,

  -- lifecycle
  status public.trip_status not null default 'requested',
  driver_id uuid references public.profiles(id),
  driver_state public.driver_run_state not null default 'pending',
  vehicle text,                                     -- 'White Chevy Suburban · FL 8XK-221'
  passenger_rating int check (passenger_rating between 1 and 5)
);

create index trips_driver_idx on public.trips (driver_id, pickup_at);
create index trips_customer_idx on public.trips (customer_id, pickup_at);
create index trips_phone_idx on public.trips (customer_phone);

alter table public.trips enable row level security;

-- Customers read their own trips (price included — it's their price).
create policy "customer reads own trips"
  on public.trips for select
  using (customer_id = auth.uid());

-- Dispatch reads and updates everything (money is correct here).
create policy "dispatch reads all trips"
  on public.trips for select
  using ((select role from public.profiles where id = auth.uid()) = 'dispatch');

create policy "dispatch updates trips"
  on public.trips for update
  using ((select role from public.profiles where id = auth.uid()) = 'dispatch');

-- Drivers have NO policy on trips: they cannot read the base table at all.
-- Their only surface is this security-definer view, which cannot leak money
-- because the columns are simply absent. This is deliberate (spec: a driver's
-- run list must not CONTAIN fares) — the advisor warning on the definer view
-- is accepted and documented.
create view public.driver_runs
with (security_barrier, security_invoker = off) as
  select
    id, customer_name, party_label,
    origin, destination, pickup_at, pickup_at_was, meet_point,
    flight_number, flight_landed_at,
    adults, children, car_seats, notes,
    driver_state, vehicle
  from public.trips
  where driver_id = auth.uid()
    and status in ('paid','driver_assigned','complete');

grant select on public.driver_runs to authenticated;

-- Driver state changes go through one narrow function.
create or replace function public.driver_set_run_state(
  p_trip_id uuid,
  p_state public.driver_run_state
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.trips
    set driver_state = p_state,
        updated_at = now(),
        status = case when p_state = 'complete' then 'complete'::public.trip_status else status end
  where id = p_trip_id and driver_id = auth.uid();
  if not found then
    raise exception 'not your run';
  end if;
end $$;

create or replace function public.driver_rate_passenger(
  p_trip_id uuid,
  p_rating int
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_rating not between 1 and 5 then
    raise exception 'rating out of range';
  end if;
  update public.trips
    set passenger_rating = p_rating, updated_at = now()
  where id = p_trip_id and driver_id = auth.uid();
  if not found then
    raise exception 'not your run';
  end if;
end $$;

revoke execute on function public.driver_set_run_state from anon;
revoke execute on function public.driver_rate_passenger from anon;
