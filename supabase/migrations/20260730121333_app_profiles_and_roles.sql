-- Pixie Rides app: one app, three roles. Role resolves server-side.
-- (Applied to project wbslrmxwbwzswydwdxyi via MCP on 2026-07-30; mirrored here for the record.)
create type public.app_role as enum ('customer', 'driver', 'dispatch');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text,
  email text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read their own profile (this is how the client learns its role).
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users may update their own contact fields...
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ...but never their role: column-level privilege beats any client update.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, email) on public.profiles to authenticated;

-- Every new sign-up is a customer. Driver/dispatch are assigned manually
-- by the operator (SQL/dashboard), never self-service.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
