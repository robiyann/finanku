"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatRupiah, formatRupiahShort } from "@/lib/money";

export interface MonthlyPoint {
  month: string; // label, mis. "Jun 2026"
  income: number;
  expense: number;
}

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold">Tren bulanan</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatRupiah(value),
              name === "income" ? "Pemasukan" : "Pengeluaran",
            ]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="hsl(var(--income))"
            strokeWidth={2}
            dot={false}
            name="income"
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="hsl(var(--expense))"
            strokeWidth={2}
            dot={false}
            name="expense"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-income" /> Pemasukan
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-expense" /> Pengeluaran
        </span>
      </div>
    </div>
  );
}
