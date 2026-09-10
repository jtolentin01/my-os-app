alter table public.health_workouts
  add column if not exists remind_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

create index if not exists health_workouts_remind_at_idx
  on public.health_workouts (remind_at)
  where remind_at is not null
    and reminder_sent_at is null
    and status = 'planned';
