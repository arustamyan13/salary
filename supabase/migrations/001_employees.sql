-- Salary Tracker schema + RLS
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  salary numeric(12, 2) not null check (salary >= 0),
  pay_day date not null,
  official boolean not null default true,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_user_id_idx on public.employees (user_id);
create index if not exists employees_pay_day_idx on public.employees (pay_day);

-- Push subscriptions (Web Push / iOS PWA)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.employees enable row level security;
alter table public.push_subscriptions enable row level security;

-- employees policies
drop policy if exists "employees_select_own" on public.employees;
create policy "employees_select_own"
  on public.employees for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "employees_insert_own" on public.employees;
create policy "employees_insert_own"
  on public.employees for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "employees_update_own" on public.employees;
create policy "employees_update_own"
  on public.employees for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "employees_delete_own" on public.employees;
create policy "employees_delete_own"
  on public.employees for delete
  to authenticated
  using (auth.uid() = user_id);

-- push_subscriptions policies
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Service role (Edge Functions / GitHub Actions) bypasses RLS by default.
-- Optional helper view for reminders (used by backend with service role):
create or replace view public.pay_reminders_today as
select
  e.id as employee_id,
  e.user_id,
  e.name,
  e.salary,
  e.pay_day,
  case
    when e.pay_day = current_date then 'today'
    when e.pay_day = current_date + 1 then 'tomorrow'
    else null
  end as reminder_type
from public.employees e
where e.pay_day in (current_date, current_date + 1);
