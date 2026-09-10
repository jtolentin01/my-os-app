alter table public.report_preferences
  add column if not exists notify_push boolean not null default true;
