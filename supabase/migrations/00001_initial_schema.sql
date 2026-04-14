-- =============================================================
-- Financial Tracker for Couples — Initial Schema
-- Tables: profiles, couples, accounts, transactions, budgets, goals, bills
-- Row Level Security: couple-scoped isolation
-- Real-time: enabled on transactions, budgets, goals, bills
-- =============================================================

-- ---------- helper ----------
create extension if not exists "uuid-ossp";

-- =============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- =============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  couple_id uuid,                       -- set after joining a couple
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profile, linked 1-1 to auth.users';

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- =============================================================
-- 2. COUPLES
-- =============================================================
create table public.couples (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Our Finances',
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.couples is 'A couple unit — two partners sharing finances';

create trigger couples_updated_at
  before update on public.couples
  for each row execute procedure public.set_updated_at();

-- FK from profiles → couples (deferred so couple + profile can be set up together)
alter table public.profiles
  add constraint profiles_couple_id_fk
  foreign key (couple_id) references public.couples(id) on delete set null;

-- =============================================================
-- 3. ACCOUNTS (bank / credit / cash accounts)
-- =============================================================
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit', 'cash', 'investment', 'other')),
  currency text not null default 'USD',
  balance numeric(12,2) not null default 0,
  icon text,
  is_shared boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_updated_at
  before update on public.accounts
  for each row execute procedure public.set_updated_at();

create index idx_accounts_couple on public.accounts(couple_id);

-- =============================================================
-- 4. TRANSACTIONS
-- =============================================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  category text not null default 'other',
  description text,
  date date not null default current_date,
  is_split boolean not null default false,
  split_ratio numeric(5,2) default 50.00,    -- partner A's share %
  paid_by uuid references auth.users(id),
  receipt_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

create index idx_transactions_couple on public.transactions(couple_id);
create index idx_transactions_date on public.transactions(couple_id, date desc);
create index idx_transactions_category on public.transactions(couple_id, category);

-- =============================================================
-- 5. BUDGETS
-- =============================================================
create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null,
  spent numeric(12,2) not null default 0,
  period text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  start_date date not null default date_trunc('month', current_date)::date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute procedure public.set_updated_at();

create index idx_budgets_couple on public.budgets(couple_id);
create index idx_budgets_active on public.budgets(couple_id, is_active) where is_active = true;

-- =============================================================
-- 6. GOALS (shared savings goals)
-- =============================================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  target_date date,
  icon text,
  color text,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.set_updated_at();

create index idx_goals_couple on public.goals(couple_id);

-- =============================================================
-- 7. BILLS (recurring bills with due dates)
-- =============================================================
create table public.bills (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  category text not null default 'other',
  due_day integer not null check (due_day between 1 and 31),
  frequency text not null default 'monthly' check (frequency in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  is_auto_pay boolean not null default false,
  is_active boolean not null default true,
  last_paid_date date,
  next_due_date date,
  assigned_to uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bills_updated_at
  before update on public.bills
  for each row execute procedure public.set_updated_at();

create index idx_bills_couple on public.bills(couple_id);
create index idx_bills_due on public.bills(couple_id, next_due_date) where is_active = true;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Helper: get the current user's couple_id
create or replace function public.get_my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- ---- profiles ----
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can view partner profile"
  on public.profiles for select
  using (couple_id is not null and couple_id = public.get_my_couple_id());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- couples ----
alter table public.couples enable row level security;

create policy "Members can view own couple"
  on public.couples for select
  using (id = public.get_my_couple_id());

create policy "Members can update own couple"
  on public.couples for update
  using (id = public.get_my_couple_id())
  with check (id = public.get_my_couple_id());

create policy "Authenticated users can create couple"
  on public.couples for insert
  with check (auth.uid() is not null);

-- ---- accounts ----
alter table public.accounts enable row level security;

create policy "Couple members can view accounts"
  on public.accounts for select
  using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert accounts"
  on public.accounts for insert
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can update accounts"
  on public.accounts for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete accounts"
  on public.accounts for delete
  using (couple_id = public.get_my_couple_id());

-- ---- transactions ----
alter table public.transactions enable row level security;

create policy "Couple members can view transactions"
  on public.transactions for select
  using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert transactions"
  on public.transactions for insert
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can update transactions"
  on public.transactions for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete transactions"
  on public.transactions for delete
  using (couple_id = public.get_my_couple_id());

-- ---- budgets ----
alter table public.budgets enable row level security;

create policy "Couple members can view budgets"
  on public.budgets for select
  using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert budgets"
  on public.budgets for insert
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can update budgets"
  on public.budgets for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete budgets"
  on public.budgets for delete
  using (couple_id = public.get_my_couple_id());

-- ---- goals ----
alter table public.goals enable row level security;

create policy "Couple members can view goals"
  on public.goals for select
  using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert goals"
  on public.goals for insert
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can update goals"
  on public.goals for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete goals"
  on public.goals for delete
  using (couple_id = public.get_my_couple_id());

-- ---- bills ----
alter table public.bills enable row level security;

create policy "Couple members can view bills"
  on public.bills for select
  using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert bills"
  on public.bills for insert
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can update bills"
  on public.bills for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete bills"
  on public.bills for delete
  using (couple_id = public.get_my_couple_id());

-- =============================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================
-- Enable realtime on tables that need live sync between partners

alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.budgets;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.bills;
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.profiles;

-- =============================================================
-- COUPLE JOINING LOGIC
-- =============================================================

-- Create a couple and assign the creator
create or replace function public.create_couple(couple_name text default 'Our Finances')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  new_couple_id uuid;
begin
  insert into public.couples (name)
  values (couple_name)
  returning id into new_couple_id;

  update public.profiles
  set couple_id = new_couple_id
  where id = auth.uid();

  return new_couple_id;
end;
$$;

-- Join a couple via invite code
create or replace function public.join_couple(code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  target_couple_id uuid;
  member_count int;
begin
  select id into target_couple_id
  from public.couples
  where invite_code = code;

  if target_couple_id is null then
    raise exception 'Invalid invite code';
  end if;

  select count(*) into member_count
  from public.profiles
  where couple_id = target_couple_id;

  if member_count >= 2 then
    raise exception 'This couple already has two members';
  end if;

  update public.profiles
  set couple_id = target_couple_id
  where id = auth.uid();

  return target_couple_id;
end;
$$;

-- Regenerate invite code
create or replace function public.regenerate_invite_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  new_code text;
  my_couple uuid;
begin
  my_couple := public.get_my_couple_id();
  if my_couple is null then
    raise exception 'You are not in a couple';
  end if;

  new_code := encode(gen_random_bytes(6), 'hex');

  update public.couples
  set invite_code = new_code
  where id = my_couple;

  return new_code;
end;
$$;
