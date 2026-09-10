create table if not exists public.money_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'PHP',
  category text not null,
  title text not null,
  notes text,
  occurred_on date not null default ((timezone('utc', now()))::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists money_transactions_user_id_idx
  on public.money_transactions (user_id);

create index if not exists money_transactions_user_occurred_idx
  on public.money_transactions (user_id, occurred_on desc);

alter table public.money_transactions enable row level security;

create policy "money_transactions_select_own"
  on public.money_transactions
  for select
  using (auth.uid() = user_id);

create policy "money_transactions_insert_own"
  on public.money_transactions
  for insert
  with check (auth.uid() = user_id);

create policy "money_transactions_update_own"
  on public.money_transactions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "money_transactions_delete_own"
  on public.money_transactions
  for delete
  using (auth.uid() = user_id);
