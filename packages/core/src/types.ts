export type TransactionType = 'income' | 'expense';
export type AccountType = 'bank' | 'ewallet' | 'cash';
export type TransactionSource = 'scan' | 'manual';
export type ReceiptStatus = 'pending' | 'parsed' | 'confirmed' | 'failed';
export type RecapPeriod = 'week' | 'month';

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  language: 'id' | 'en' | 'ms';
  country: string;
  currency: string;
  settings: {
    payday_day: number;
    auto_approve: boolean;
    notifications: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  mask: string | null;
  initial_balance: number;
  is_default: boolean;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  kind: TransactionType;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  storage_path: string;
  status: ReceiptStatus;
  ocr_json: Record<string, any> | null;
  error: string | null;
  created_at: string;
  parsed_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  description: string | null;
  merchant: string | null;
  occurred_at: string; // YYYY-MM-DD
  source: TransactionSource;
  account_id: string;
  receipt_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  occurred_at: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  name: string;
  qty: number;
  price: number;
}

export interface Recap {
  id: string;
  user_id: string;
  period: RecapPeriod;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  narrative: string;
  stats: Record<string, any>;
  created_at: string;
}

export interface Installment {
  id: string;
  user_id: string;
  name: string;
  lender: string | null;
  amount: number;
  due_day: number;
  months_total: number | null;
  months_paid: number;
  start_month: string; // YYYY-MM-DD
  remind_days: number[];
  remind_time: string; // HH:MM:SS
  auto_log: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstallmentPayment {
  id: string;
  installment_id: string;
  period_month: string; // YYYY-MM-DD
  paid_at: string;
  transaction_id: string | null;
}

export interface PushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device: string | null;
  created_at: string;
}
