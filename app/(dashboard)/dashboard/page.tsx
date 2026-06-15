import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/summary-cards";
import {
  MonthlyTrendChart,
  type MonthlyPoint,
} from "@/components/monthly-trend-chart";
import type { TransactionType } from "@/lib/types";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default async function DashboardPage() {
  const supabase = createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // Awal jendela tren: 6 bulan termasuk bulan ini.
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: rows } = await supabase
    .from("transactions")
    .select("type, amount, occurred_at")
    .gte("occurred_at", toDateStr(trendStart))
    .order("occurred_at", { ascending: true });

  const transactions = (rows ?? []) as {
    type: TransactionType;
    amount: number;
    occurred_at: string;
  }[];

  // Ringkasan bulan ini.
  const monthStartStr = toDateStr(monthStart);
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.occurred_at < monthStartStr) continue;
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }

  // Agregasi tren 6 bulan.
  const buckets = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    buckets.set(monthKey(d), { income: 0, expense: 0 });
  }
  for (const t of transactions) {
    const key = t.occurred_at.slice(0, 7); // YYYY-MM
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expense += t.amount;
  }
  const trend: MonthlyPoint[] = Array.from(buckets.entries()).map(
    ([key, v]) => ({
      month: monthLabel(key),
      income: v.income,
      expense: v.expense,
    }),
  );

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabelFull(now)} · bulan berjalan
          </p>
        </div>
        <Link
          href="/transactions"
          className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
        >
          Lihat transaksi
        </Link>
      </div>

      <SummaryCards income={income} expense={expense} />

      <MonthlyTrendChart data={trend} />

      {!hasData && (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Belum ada transaksi. Tautkan Telegram di{" "}
          <Link href="/settings" className="font-medium text-primary">
            Pengaturan
          </Link>{" "}
          lalu kirim chat seperti <i>&ldquo;jajan bakso 50k&rdquo;</i> ke bot.
        </div>
      )}
    </div>
  );
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function monthLabelFull(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}
