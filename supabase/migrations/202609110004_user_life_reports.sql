create table if not exists public.report_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly')),
  timezone text not null default 'Asia/Manila',
  preferred_hour smallint not null default 7 check (
    preferred_hour >= 0 and preferred_hour <= 23
  ),
  apps text[] not null default array['health', 'diet', 'money', 'notes']::text[],
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_preferences enable row level security;

create policy "report_preferences_select_own"
  on public.report_preferences
  for select
  using (auth.uid() = user_id);

create policy "report_preferences_insert_own"
  on public.report_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "report_preferences_update_own"
  on public.report_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "report_preferences_delete_own"
  on public.report_preferences
  for delete
  using (auth.uid() = user_id);

create table if not exists public.user_life_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  generated_at timestamptz not null default now(),
  window_days integer not null default 30 check (window_days > 0 and window_days <= 365),
  confidence text not null default 'low' check (
    confidence in ('low', 'medium', 'high')
  ),
  portrait_summary text not null default '',
  priorities jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  health jsonb not null default '{}'::jsonb,
  diet jsonb not null default '{}'::jsonb,
  money jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  stats_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_life_profile_generated_idx
  on public.user_life_profile (generated_at desc);

alter table public.user_life_profile enable row level security;

create policy "user_life_profile_select_own"
  on public.user_life_profile
  for select
  using (auth.uid() = user_id);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cadence text not null check (cadence in ('daily', 'weekly')),
  period_start date not null,
  period_end date not null,
  apps_included text[] not null default array[]::text[],
  stats jsonb not null default '{}'::jsonb,
  content text not null default '',
  domain_deltas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint user_reports_period_check check (period_end >= period_start),
  unique (user_id, cadence, period_start)
);

create index if not exists user_reports_user_created_idx
  on public.user_reports (user_id, created_at desc);

alter table public.user_reports enable row level security;

create policy "user_reports_select_own"
  on public.user_reports
  for select
  using (auth.uid() = user_id);
