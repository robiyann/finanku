-- =============================================================
-- Finance Tracker v2 — Database Schema, RLS, & Default Data
-- =============================================================

-- ---------- Enums ----------
create type public.transaction_type as enum ('income', 'expense');
create type public.account_type as enum ('bank', 'ewallet', 'cash');
create type public.transaction_source as enum ('scan', 'manual');
create type public.receipt_status as enum ('pending', 'parsed', 'confirmed', 'failed');
create type public.recap_period as enum ('week', 'month');

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  language text not null default 'id' check (language in ('id', 'en', 'ms')),
  country text not null default 'ID',
  currency text not null default 'IDR',
  settings jsonb not null default '{"payday_day": 1, "auto_approve": false, "notifications": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- accounts (sumber dana) ----------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type public.account_type not null,
  mask text, -- e.g. "····6821"
  initial_balance bigint not null default 0,
  is_default boolean not null default false,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_id_idx on public.accounts (user_id);

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- null = global category
  name text not null,
  kind public.transaction_type not null,
  created_at timestamptz not null default now()
);
create index categories_user_id_idx on public.categories (user_id);

-- ---------- receipts ----------
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null, -- R2 key or bucket path
  status public.receipt_status not null default 'pending',
  ocr_json jsonb,
  error text,
  created_at timestamptz not null default now(),
  parsed_at timestamptz
);
create index receipts_user_id_idx on public.receipts (user_id);

-- ---------- transactions ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  amount bigint not null check (amount > 0), -- unit terkecil (e.g. Rupiah bulat, sen untuk SGD)
  category_id uuid references public.categories (id) on delete set null,
  description text,
  merchant text,
  occurred_at date not null default current_date,
  source public.transaction_source not null default 'manual',
  account_id uuid not null references public.accounts (id) on delete cascade,
  receipt_id uuid references public.receipts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_receipt_id_idx on public.transactions (receipt_id);
create index transactions_occurred_at_idx on public.transactions (user_id, occurred_at);

-- ---------- transfers (pindah dana antar akun) ----------
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_account_id uuid not null references public.accounts (id) on delete cascade,
  to_account_id uuid not null references public.accounts (id) on delete cascade,
  amount bigint not null check (amount > 0),
  occurred_at date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_different_accounts check (from_account_id <> to_account_id)
);
create index transfers_user_id_idx on public.transfers (user_id);
create index transfers_from_account_idx on public.transfers (from_account_id);
create index transfers_to_account_idx on public.transfers (to_account_id);

-- ---------- receipt_items (item belanja detail dari OCR) ----------
create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  name text not null,
  qty int not null default 1 check (qty > 0),
  price bigint not null check (price >= 0)
);
create index receipt_items_receipt_id_idx on public.receipt_items (receipt_id);

-- ---------- recaps (mingguan / bulanan naratif) ----------
create table public.recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period public.recap_period not null,
  period_start date not null,
  period_end date not null,
  narrative text not null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index recaps_user_id_idx on public.recaps (user_id);

-- ---------- installments (cicilan) ----------
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  lender text,
  amount bigint not null check (amount > 0),
  due_day int not null check (due_day >= 1 and due_day <= 31),
  months_total int, -- null = cicilan tidak berbatas waktu
  months_paid int not null default 0 check (months_paid >= 0),
  start_month date not null,
  remind_days int[] not null default '{3,0}'::int[], -- H-3 dan Hari-H
  remind_time time not null default '08:00:00',
  auto_log boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index installments_user_id_idx on public.installments (user_id);

-- ---------- installment_payments (pelacak cicilan yang lunas per bulan) ----------
create table public.installment_payments (
  id uuid primary key default gen_random_uuid(),
  installment_id uuid not null references public.installments (id) on delete cascade,
  period_month date not null, -- tanggal 1 di bulan cicilan bersangkutan
  paid_at timestamptz not null default now(),
  transaction_id uuid references public.transactions (id) on delete set null
);
create index installment_payments_installment_id_idx on public.installment_payments (installment_id);
create unique index installment_payments_unique_month_idx on public.installment_payments (installment_id, period_month);

-- ---------- push_tokens ----------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null unique,
  device text,
  created_at timestamptz not null default now()
);
create index push_tokens_user_id_idx on public.push_tokens (user_id);


-- =============================================================
-- Profile Auto-creation Trigger
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_display_name text;
begin
  default_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name)
  values (new.id, default_display_name);

  -- Create a default 'Cash' account for convenience
  insert into public.accounts (user_id, name, type, is_default, color)
  values (new.id, 'Cash', 'cash', true, '#4b5563');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================
-- Row Level Security (RLS) Configuration
-- =============================================================
alter table public.profiles            enable row level security;
alter table public.accounts            enable row level security;
alter table public.categories          enable row level security;
alter table public.receipts            enable row level security;
alter table public.transactions        enable row level security;
alter table public.transfers           enable row level security;
alter table public.receipt_items       enable row level security;
alter table public.recaps              enable row level security;
alter table public.installments        enable row level security;
alter table public.installment_payments enable row level security;
alter table public.push_tokens         enable row level security;

-- Profiles: User only access their own
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Accounts: CRUD only for own accounts
create policy "accounts_all_own" on public.accounts for all using (auth.uid() = user_id);

-- Categories: Select global (user_id is null) + own; insert/update/delete only own
create policy "categories_select" on public.categories for select using (user_id is null or auth.uid() = user_id);
create policy "categories_all_own" on public.categories for all using (auth.uid() = user_id);

-- Receipts: CRUD only for own receipts
create policy "receipts_all_own" on public.receipts for all using (auth.uid() = user_id);

-- Transactions: CRUD only for own transactions
create policy "transactions_all_own" on public.transactions for all using (auth.uid() = user_id);

-- Transfers: CRUD only for own transfers
create policy "transfers_all_own" on public.transfers for all using (auth.uid() = user_id);

-- Receipt items: Accessible if parent receipt is owned by user
create policy "receipt_items_all_own" on public.receipt_items for all
  using (exists (select 1 from public.receipts where receipts.id = receipt_items.receipt_id and receipts.user_id = auth.uid()));

-- Recaps: CRUD only for own recaps
create policy "recaps_all_own" on public.recaps for all using (auth.uid() = user_id);

-- Installments: CRUD only for own installments
create policy "installments_all_own" on public.installments for all using (auth.uid() = user_id);

-- Installment payments: CRUD if parent installment is owned
create policy "installment_payments_all_own" on public.installment_payments for all
  using (exists (select 1 from public.installments where installments.id = installment_payments.installment_id and installments.user_id = auth.uid()));

-- Push tokens: CRUD only for own push tokens
create policy "push_tokens_all_own" on public.push_tokens for all using (auth.uid() = user_id);


-- =============================================================
-- Global Default Categories Seed (user_id = NULL)
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
