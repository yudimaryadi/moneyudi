
-- ✅ Supabase schema (fixed): no "IF NOT EXISTS" on CREATE POLICY
--    Use DROP POLICY IF EXISTS + CREATE POLICY instead.
--    Also ensures pgcrypto for gen_random_uuid().

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text default '🧾',
  type_scope text not null check (type_scope in ('expense','income','both')) default 'expense',
  created_at timestamp with time zone default now()
);
create index if not exists idx_categories_user on public.categories(user_id);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date timestamp with time zone not null default now(),
  amount numeric not null check (amount >= 0),
  type text not null check (type in ('expense','income')),
  category_id uuid references public.categories(id) on delete set null,
  note text,
  created_at timestamp with time zone default now()
);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);

-- User Settings
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  monthly_cutoff_day integer not null default 1 check (monthly_cutoff_day >= 1 and monthly_cutoff_day <= 31),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_user_settings_user on public.user_settings(user_id);

-- Budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  period text not null default 'monthly',
  start_date date not null default date_trunc('month', now()),
  rollover boolean not null default false,
  created_at timestamp with time zone default now()
);
create index if not exists idx_budgets_user_cat on public.budgets(user_id, category_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.user_settings enable row level security;

-- Policies (owner-only). Use DROP + CREATE pattern.

-- profiles
drop policy if exists "Profiles are self" on public.profiles;
create policy "Profiles are self" on public.profiles
  for select
  using ( auth.uid() = id );

-- categories
drop policy if exists "Categories select own" on public.categories;
drop policy if exists "Categories insert own" on public.categories;
drop policy if exists "Categories update own" on public.categories;
drop policy if exists "Categories delete own" on public.categories;

create policy "Categories select own" on public.categories
  for select
  using ( auth.uid() = user_id );

create policy "Categories insert own" on public.categories
  for insert
  with check ( auth.uid() = user_id );

create policy "Categories update own" on public.categories
  for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Categories delete own" on public.categories
  for delete
  using ( auth.uid() = user_id );

-- transactions
drop policy if exists "Transactions select own" on public.transactions;
drop policy if exists "Transactions insert own" on public.transactions;
drop policy if exists "Transactions update own" on public.transactions;
drop policy if exists "Transactions delete own" on public.transactions;

create policy "Transactions select own" on public.transactions
  for select
  using ( auth.uid() = user_id );

create policy "Transactions insert own" on public.transactions
  for insert
  with check ( auth.uid() = user_id );

create policy "Transactions update own" on public.transactions
  for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Transactions delete own" on public.transactions
  for delete
  using ( auth.uid() = user_id );

-- budgets
drop policy if exists "Budgets select own" on public.budgets;
drop policy if exists "Budgets insert own" on public.budgets;
drop policy if exists "Budgets update own" on public.budgets;
drop policy if exists "Budgets delete own" on public.budgets;

create policy "Budgets select own" on public.budgets
  for select
  using ( auth.uid() = user_id );

create policy "Budgets insert own" on public.budgets
  for insert
  with check ( auth.uid() = user_id );

create policy "Budgets update own" on public.budgets
  for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Budgets delete own" on public.budgets
  for delete
  using ( auth.uid() = user_id );

-- user_settings
drop policy if exists "User settings select own" on public.user_settings;
drop policy if exists "User settings insert own" on public.user_settings;
drop policy if exists "User settings update own" on public.user_settings;
drop policy if exists "User settings delete own" on public.user_settings;

create policy "User settings select own" on public.user_settings
  for select
  using ( auth.uid() = user_id );

create policy "User settings insert own" on public.user_settings
  for insert
  with check ( auth.uid() = user_id );

create policy "User settings update own" on public.user_settings
  for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "User settings delete own" on public.user_settings
  for delete
  using ( auth.uid() = user_id );

-- Trigger to auto-create profile and settings when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
