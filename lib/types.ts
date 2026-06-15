// Shared database row types (manual — keep in sync with supabase/migrations).

export type TransactionType = "income" | "expense";
export type TransactionSource = "telegram" | "manual";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  kind: TransactionType;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  description: string | null;
  occurred_at: string; // YYYY-MM-DD
  source: TransactionSource;
  raw_text: string | null;
  created_at: string;
}

// Transaction joined with its category name (used in dashboard tables).
export interface TransactionWithCategory extends Transaction {
  category: { name: string } | null;
}

export interface TelegramLink {
  id: string;
  user_id: string;
  telegram_chat_id: number;
  linked_at: string;
}
