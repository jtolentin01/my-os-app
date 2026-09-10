alter table public.money_debts
  drop constraint if exists money_debts_schedule_check;

alter table public.money_debts
  add constraint money_debts_schedule_check
  check (schedule in ('weekly', 'monthly', 'once', 'custom'));

create table if not exists public.money_debt_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.money_debts (id) on delete cascade,
  due_on date not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  status text not null default 'open' check (status in ('open', 'paid')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists money_debt_installments_user_id_idx
  on public.money_debt_installments (user_id);

create index if not exists money_debt_installments_debt_due_idx
  on public.money_debt_installments (debt_id, due_on, status);

alter table public.money_debt_installments enable row level security;

create policy "money_debt_installments_select_own"
  on public.money_debt_installments
  for select
  using (auth.uid() = user_id);

create policy "money_debt_installments_insert_own"
  on public.money_debt_installments
  for insert
  with check (auth.uid() = user_id);

create policy "money_debt_installments_update_own"
  on public.money_debt_installments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "money_debt_installments_delete_own"
  on public.money_debt_installments
  for delete
  using (auth.uid() = user_id);
