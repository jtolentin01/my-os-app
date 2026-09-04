create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null default '',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_user_pinned_updated_idx
  on public.notes (user_id, is_pinned desc, updated_at desc);

alter table public.notes enable row level security;

create policy "notes_select_own"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes
  for delete
  using (auth.uid() = user_id);
