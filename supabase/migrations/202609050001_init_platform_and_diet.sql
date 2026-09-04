-- My OS V1: platform profiles + diet weekly meal planner

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  title text not null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_meal_plan_id_idx on public.meals (meal_plan_id);
create index if not exists meals_user_id_idx on public.meals (user_id);
create index if not exists meal_plans_user_id_idx on public.meal_plans (user_id);

alter table public.meal_plans enable row level security;
alter table public.meals enable row level security;

create policy "meal_plans_select_own"
  on public.meal_plans
  for select
  using (auth.uid() = user_id);

create policy "meal_plans_insert_own"
  on public.meal_plans
  for insert
  with check (auth.uid() = user_id);

create policy "meal_plans_update_own"
  on public.meal_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_plans_delete_own"
  on public.meal_plans
  for delete
  using (auth.uid() = user_id);

create policy "meals_select_own"
  on public.meals
  for select
  using (auth.uid() = user_id);

create policy "meals_insert_own"
  on public.meals
  for insert
  with check (auth.uid() = user_id);

create policy "meals_update_own"
  on public.meals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meals_delete_own"
  on public.meals
  for delete
  using (auth.uid() = user_id);
