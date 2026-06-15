-- =============================================================
-- Finance Tracker — initial schema, RLS, and default categories
-- =============================================================

-- ---------- Enums ----------
create type transaction_type as enum ('income', 'expense');
create type transaction_source as enum ('telegram', 'manual');

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------- categories ----------
-- user_id NULL  => kategori default global (dipakai semua user, read-only)
-- user_id set   => kategori milik user
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  kind transaction_type not null,
  created_at timestamptz not null default now()
);
create index categories_user_id_idx on public.categories (user_id);

-- ---------- telegram_links (user_id <-> telegram chat) ----------
create table public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  telegram_chat_id bigint not null unique,
  linked_at timestamptz not null default now()
);

-- ---------- telegram_link_codes (kode connect sekali pakai) ----------
create table public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index telegram_link_codes_user_id_idx on public.telegram_link_codes (user_id);

-- ---------- transactions ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type transaction_type not null,
  amount bigint not null check (amount > 0),       -- rupiah, bilangan bulat
  category_id uuid references public.categories (id) on delete set null,
  description text,
  occurred_at date not null default current_date,
  source transaction_source not null default 'manual',
  raw_text text,                                   -- chat asli (audit)
  created_at timestamptz not null default now()
);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at);

-- =============================================================
-- Auto-create profile saat user baru daftar
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.telegram_links      enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.transactions        enable row level security;

-- profiles: user hanya akses miliknya
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- categories: lihat milik sendiri + default global; tulis hanya milik sendiri
create policy "categories_select" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- telegram_links: user hanya akses miliknya (insert/hapus dilakukan
-- via service role di webhook bot, yang melewati RLS)
create policy "telegram_links_select_own" on public.telegram_links
  for select using (auth.uid() = user_id);
create policy "telegram_links_delete_own" on public.telegram_links
  for delete using (auth.uid() = user_id);

-- telegram_link_codes: user hanya akses miliknya (validasi kode oleh
-- service role di webhook)
create policy "telegram_link_codes_select_own" on public.telegram_link_codes
  for select using (auth.uid() = user_id);
create policy "telegram_link_codes_insert_own" on public.telegram_link_codes
  for insert with check (auth.uid() = user_id);

-- transactions: full CRUD hanya untuk data milik user
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- =============================================================
-- Seed kategori default global (user_id = NULL)
-- =============================================================
insert into public.categories (user_id, name, kind) values
  (null, 'Makanan & Minuman', 'expense'),
  (null, 'Transportasi',      'expense'),
  (null, 'Belanja',           'expense'),
  (null, 'Tagihan',           'expense'),
  (null, 'Hiburan',           'expense'),
  (null, 'Kesehatan',         'expense'),
  (null, 'Pendidikan',        'expense'),
  (null, 'Lainnya',           'expense'),
  (null, 'Gaji',              'income'),
  (null, 'Bonus',             'income'),
  (null, 'Hadiah',            'income'),
  (null, 'Penjualan',         'income'),
  (null, 'Lainnya',           'income');
