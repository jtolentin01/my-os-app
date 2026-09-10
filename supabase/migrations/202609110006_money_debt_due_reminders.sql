alter table public.money_debts
  add column if not exists due_reminder_7d_for date,
  add column if not exists due_reminder_3d_for date,
  add column if not exists due_reminder_1d_for date,
  add column if not exists due_reminder_due_for date;

create index if not exists money_debts_open_due_reminder_idx
  on public.money_debts (next_due_on)
  where status = 'open' and next_due_on is not null;
