alter table public.health_workouts
  add column if not exists status text not null default 'done';

alter table public.health_workouts
  drop constraint if exists health_workouts_status_check;

alter table public.health_workouts
  add constraint health_workouts_status_check
  check (status in ('planned', 'done'));

alter table public.health_workouts
  alter column status set default 'planned';

create index if not exists health_workouts_user_status_idx
  on public.health_workouts (user_id, status);
