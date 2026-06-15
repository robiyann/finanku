"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/money";
import type { Category, TransactionWithCategory } from "@/lib/types";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/app/(dashboard)/transactions/actions";

interface Props {
  transactions: TransactionWithCategory[];
  categories: Category[];
}

const emptyForm = {
  id: null as string | null,
  type: "expense" as "income" | "expense",
  amount: "",
  category_id: "",
  description: "",
  occurred_at: todayStr(),
};

export function TransactionsTable({ transactions, categories }: Props) {
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const catsForType = categories.filter((c) => c.kind === form.type);

  function resetForm() {
    setForm({ ...emptyForm, occurred_at: todayStr() });
    setEditingId(null);
    setError(null);
  }

  function startEdit(t: TransactionWithCategory) {
    setEditingId(t.id);
    setForm({
      id: t.id,
      type: t.type,
      amount: String(t.amount),
      category_id: t.category_id ?? "",
      description: t.description ?? "",
      occurred_at: t.occurred_at,
    });
    setError(null);
  }

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("type", form.type);
    fd.set("amount", form.amount);
    fd.set("category_id", form.category_id);
    fd.set("description", form.description);
    fd.set("occurred_at", form.occurred_at);

    startTransition(async () => {
      const result = editingId
        ? await updateTransaction(editingId, fd)
        : await createTransaction(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        resetForm();
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    startTransition(async () => {
      await deleteTransaction(id);
      if (editingId === id) resetForm();
    });
  }

  return (
    <div className="space-y-6">
      {/* Form tambah/edit */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold">
          {editingId ? "Edit transaksi" : "Tambah transaksi"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Jenis</label>
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, type: t, category_id: "" }))
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    form.type === t
                      ? t === "income"
                        ? "border-income bg-income/10 text-income"
                        : "border-expense bg-expense/10 text-expense"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {t === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="amount" className="text-sm font-medium">
              Nominal (Rp)
            </label>
            <input
              id="amount"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              placeholder="50000"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category" className="text-sm font-medium">
              Kategori
            </label>
            <select
              id="category"
              value={form.category_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, category_id: e.target.value }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Tanpa kategori —</option>
              {catsForType.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="date" className="text-sm font-medium">
              Tanggal
            </label>
            <input
              id="date"
              type="date"
              value={form.occurred_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, occurred_at: e.target.value }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="desc" className="text-sm font-medium">
              Keterangan
            </label>
            <input
              id="desc"
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              placeholder="mis. bakso"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Tambah"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-muted"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* Tabel transaksi */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {transactions.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Belum ada transaksi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 text-right font-medium">Nominal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(t.occurred_at)}
                    </td>
                    <td className="px-4 py-3">
                      {t.description || (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {t.source === "telegram" && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          TG
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.category?.name || "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                        t.type === "income" ? "text-income" : "text-expense"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatRupiah(t.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        className="rounded px-2 py-1 text-xs text-expense transition hover:bg-expense/10"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
