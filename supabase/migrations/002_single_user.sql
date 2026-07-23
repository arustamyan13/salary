-- Single-user mode: remove auth.users FK and allow anon access via app login gate
-- Run in Supabase SQL Editor AFTER 001_employees.sql

-- Drop foreign keys to auth.users (if present)
do $$
declare
  r record;
begin
  for r in
    select conname, conrelid::regclass as tbl
    from pg_constraint
    where contype = 'f'
      and confrelid = 'auth.users'::regclass
      and conrelid in ('public.employees'::regclass, 'public.push_subscriptions'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.employees
  alter column user_id set default '00000000-0000-4000-8000-000000000001'::uuid;

alter table public.push_subscriptions
  alter column user_id set default '00000000-0000-4000-8000-000000000001'::uuid;

update public.employees
set user_id = '00000000-0000-4000-8000-000000000001'::uuid
where user_id is distinct from '00000000-0000-4000-8000-000000000001'::uuid;

update public.push_subscriptions
set user_id = '00000000-0000-4000-8000-000000000001'::uuid
where user_id is distinct from '00000000-0000-4000-8000-000000000001'::uuid;

-- Replace RLS: single-tenant app (UI password protects access)
alter table public.employees enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "employees_select_own" on public.employees;
drop policy if exists "employees_insert_own" on public.employees;
drop policy if exists "employees_update_own" on public.employees;
drop policy if exists "employees_delete_own" on public.employees;

drop policy if exists "employees_anon_all" on public.employees;
create policy "employees_anon_all"
  on public.employees for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "push_select_own" on public.push_subscriptions;
drop policy if exists "push_insert_own" on public.push_subscriptions;
drop policy if exists "push_update_own" on public.push_subscriptions;
drop policy if exists "push_delete_own" on public.push_subscriptions;

drop policy if exists "push_anon_all" on public.push_subscriptions;
create policy "push_anon_all"
  on public.push_subscriptions for all
  to anon, authenticated
  using (true)
  with check (true);
