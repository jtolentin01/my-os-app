create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'other',
  key text not null,
  value text not null,
  source text not null default 'chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists user_memories_user_id_idx
  on public.user_memories (user_id);

create index if not exists user_memories_user_updated_idx
  on public.user_memories (user_id, updated_at desc);

alter table public.user_memories enable row level security;

create policy "user_memories_select_own"
  on public.user_memories
  for select
  using (auth.uid() = user_id);

create policy "user_memories_insert_own"
  on public.user_memories
  for insert
  with check (auth.uid() = user_id);

create policy "user_memories_update_own"
  on public.user_memories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_memories_delete_own"
  on public.user_memories
  for delete
  using (auth.uid() = user_id);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (user_id, updated_at desc);

alter table public.chat_threads enable row level security;

create policy "chat_threads_select_own"
  on public.chat_threads
  for select
  using (auth.uid() = user_id);

create policy "chat_threads_insert_own"
  on public.chat_threads
  for insert
  with check (auth.uid() = user_id);

create policy "chat_threads_update_own"
  on public.chat_threads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "chat_threads_delete_own"
  on public.chat_threads
  for delete
  using (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null default '',
  tool_name text,
  tool_call_id text,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at asc);

create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  using (auth.uid() = user_id);

create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  with check (auth.uid() = user_id);

create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  using (auth.uid() = user_id);
