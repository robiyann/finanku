import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/transactions-table";
import type { Category, TransactionWithCategory } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = createClient();

  const [{ data: txRows }, { data: catRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, category:categories(name)")
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .order("kind", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const transactions = (txRows ?? []) as unknown as TransactionWithCategory[];
  const categories = (catRows ?? []) as Category[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          Tambah, ubah, atau hapus catatan transaksimu.
        </p>
      </div>
      <TransactionsTable transactions={transactions} categories={categories} />
    </div>
  );
}
