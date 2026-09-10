create table if not exists public.money_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  direction text not null check (direction in ('i_owe', 'owed_to_me')),
  counterparty text not null,
  title text not null,
  original_amount numeric(12, 2) not null check (original_amount > 0),
  remaining_amount numeric(12, 2) not null check (remaining_amount >= 0),
  currency text not null default 'PHP',
  schedule text not null check (schedule in ('weekly', 'monthly', 'once')),
  installment_amount numeric(12, 2) not null check (installment_amount > 0),
  next_due_on date,
  notes text,
  status text not null default 'open' check (status in ('open', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists money_debts_user_id_idx
  on public.money_debts (user_id);

create index if not exists money_debts_user_status_due_idx
  on public.money_debts (user_id, status, next_due_on);

alter table public.money_debts enable row level security;

create policy "money_debts_select_own"
  on public.money_debts
  for select
  using (auth.uid() = user_id);

create policy "money_debts_insert_own"
  on public.money_debts
  for insert
  with check (auth.uid() = user_id);

create policy "money_debts_update_own"
  on public.money_debts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "money_debts_delete_own"
  on public.money_debts
  for delete
  using (auth.uid() = user_id);

create table if not exists public.money_debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.money_debts (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null default ((timezone('utc', now()))::date),
  notes text,
  transaction_id uuid references public.money_transactions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists money_debt_payments_user_id_idx
  on public.money_debt_payments (user_id);

create index if not exists money_debt_payments_debt_id_idx
  on public.money_debt_payments (debt_id);

alter table public.money_debt_payments enable row level security;

create policy "money_debt_payments_select_own"
  on public.money_debt_payments
  for select
  using (auth.uid() = user_id);

create policy "money_debt_payments_insert_own"
  on public.money_debt_payments
  for insert
  with check (auth.uid() = user_id);

create policy "money_debt_payments_update_own"
  on public.money_debt_payments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "money_debt_payments_delete_own"
  on public.money_debt_payments
  for delete
  using (auth.uid() = user_id);
