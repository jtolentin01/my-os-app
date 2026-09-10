create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(6, 2) check (
    weight_kg is null or (weight_kg > 0 and weight_kg <= 500)
  ),
  height_cm numeric(5, 1) check (
    height_cm is null or (height_cm > 0 and height_cm <= 300)
  ),
  notes text,
  logged_on date not null default ((timezone('utc', now()))::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_metrics_has_value check (
    weight_kg is not null or height_cm is not null
  )
);

create index if not exists body_metrics_user_id_idx
  on public.body_metrics (user_id);

create index if not exists body_metrics_user_logged_idx
  on public.body_metrics (user_id, logged_on desc);

alter table public.body_metrics enable row level security;

create policy "body_metrics_select_own"
  on public.body_metrics
  for select
  using (auth.uid() = user_id);

create policy "body_metrics_insert_own"
  on public.body_metrics
  for insert
  with check (auth.uid() = user_id);

create policy "body_metrics_update_own"
  on public.body_metrics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "body_metrics_delete_own"
  on public.body_metrics
  for delete
  using (auth.uid() = user_id);

create table if not exists public.health_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_type text not null check (
    workout_type in (
      'run',
      'walk',
      'strength',
      'cycling',
      'swimming',
      'yoga',
      'hiit',
      'sports',
      'other'
    )
  ),
  title text not null,
  duration_minutes integer not null check (
    duration_minutes > 0 and duration_minutes <= 1440
  ),
  notes text,
  occurred_on date not null default ((timezone('utc', now()))::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_workouts_user_id_idx
  on public.health_workouts (user_id);

create index if not exists health_workouts_user_occurred_idx
  on public.health_workouts (user_id, occurred_on desc);

alter table public.health_workouts enable row level security;

create policy "health_workouts_select_own"
  on public.health_workouts
  for select
  using (auth.uid() = user_id);

create policy "health_workouts_insert_own"
  on public.health_workouts
  for insert
  with check (auth.uid() = user_id);

create policy "health_workouts_update_own"
  on public.health_workouts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "health_workouts_delete_own"
  on public.health_workouts
  for delete
  using (auth.uid() = user_id);
