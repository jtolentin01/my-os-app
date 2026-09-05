create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text,
  serving_label text not null default '1 serving',
  calories numeric(8, 1) not null default 0 check (calories >= 0),
  carbs_g numeric(8, 1) not null default 0 check (carbs_g >= 0),
  protein_g numeric(8, 1) not null default 0 check (protein_g >= 0),
  fat_g numeric(8, 1) not null default 0 check (fat_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_items_user_id_idx on public.menu_items (user_id);
create index if not exists menu_items_user_name_idx on public.menu_items (user_id, name);

alter table public.meals
  add column if not exists menu_item_id uuid references public.menu_items (id) on delete set null,
  add column if not exists servings numeric(6, 2) not null default 1 check (servings > 0);

create index if not exists meals_menu_item_id_idx on public.meals (menu_item_id);

alter table public.menu_items enable row level security;

create policy "menu_items_select_own"
  on public.menu_items
  for select
  using (auth.uid() = user_id);

create policy "menu_items_insert_own"
  on public.menu_items
  for insert
  with check (auth.uid() = user_id);

create policy "menu_items_update_own"
  on public.menu_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "menu_items_delete_own"
  on public.menu_items
  for delete
  using (auth.uid() = user_id);
