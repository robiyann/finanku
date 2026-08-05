-- =============================================================
-- Finance Tracker v2 — Neon Postgres Database Schema
-- =============================================================

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id text UNIQUE,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  language text NOT NULL DEFAULT 'id' CHECK (language IN ('id', 'en', 'ms')),
  country text NOT NULL DEFAULT 'ID',
  currency text NOT NULL DEFAULT 'IDR',
  settings jsonb NOT NULL DEFAULT '{"payday_day": 1, "auto_approve": false, "notifications": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_google_id_idx ON public.users (google_id);

-- ---------- accounts (sumber dana) ----------
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('bank', 'ewallet', 'cash')),
  mask text,
  initial_balance bigint NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);

-- ---------- categories ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON public.categories (user_id);

-- ---------- receipts ----------
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'confirmed', 'failed')),
  ocr_json jsonb,
  error text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  parsed_at timestamptz
);
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON public.receipts (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS receipts_user_idempotency_idx ON public.receipts (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ---------- transactions ----------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount bigint NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  description text,
  merchant text,
  occurred_at date NOT NULL DEFAULT current_date,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('scan', 'manual')),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES public.receipts (id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_receipt_id_idx ON public.transactions (receipt_id);
CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON public.transactions (user_id, occurred_at DESC, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_idx ON public.transactions (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS accounts_user_active_idx ON public.accounts (user_id, active);

-- ---------- transfers ----------
CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  occurred_at date NOT NULL DEFAULT current_date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_different_accounts CHECK (from_account_id <> to_account_id)
);
CREATE INDEX IF NOT EXISTS transfers_user_id_idx ON public.transfers (user_id);

-- ---------- receipt_items ----------
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.receipts (id) ON DELETE CASCADE,
  name text NOT NULL,
  qty int NOT NULL DEFAULT 1 CHECK (qty > 0),
  price bigint NOT NULL CHECK (price >= 0)
);
CREATE INDEX IF NOT EXISTS receipt_items_receipt_id_idx ON public.receipt_items (receipt_id);

-- ---------- ai_insights ----------
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  insight text NOT NULL,
  score int NOT NULL DEFAULT 85 CHECK (score >= 0 AND score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_insights_user_id_idx ON public.ai_insights (user_id, created_at DESC);

-- ---------- recaps ----------
CREATE TABLE IF NOT EXISTS public.recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('week', 'month')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  narrative text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recaps_user_id_idx ON public.recaps (user_id);

-- ---------- installments ----------
CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  lender text,
  amount bigint NOT NULL CHECK (amount > 0),
  due_day int NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  months_total int,
  months_paid int NOT NULL DEFAULT 0 CHECK (months_paid >= 0),
  start_month date NOT NULL,
  remind_days int[] NOT NULL DEFAULT '{3,0}'::int[],
  remind_time time NOT NULL DEFAULT '08:00:00',
  auto_log boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installments_user_id_idx ON public.installments (user_id);

-- ---------- Global Default Categories Seed ----------
INSERT INTO public.categories (user_id, name, kind)
SELECT NULL, 'Makanan & Minuman', 'expense' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Makanan & Minuman');
INSERT INTO public.categories (user_id, name, kind)
SELECT NULL, 'Transportasi', 'expense' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Transportasi');
INSERT INTO public.categories (user_id, name, kind)
SELECT NULL, 'Belanja', 'expense' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Belanja');
INSERT INTO public.categories (user_id, name, kind)
SELECT NULL, 'Tagihan', 'expense' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Tagihan');
INSERT INTO public.categories (user_id, name, kind)
SELECT NULL, 'Hiburan', 'expense' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Hiburan');
INSERT INTO public.categories (user_id, name, kind)
SELECT NULL, 'Gaji', 'income' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Gaji');
