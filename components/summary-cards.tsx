import { formatRupiah } from "@/lib/money";

export function SummaryCards({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const balance = income - expense;

  const cards = [
    {
      label: "Pemasukan",
      value: income,
      className: "text-income",
      sign: "+",
    },
    {
      label: "Pengeluaran",
      value: expense,
      className: "text-expense",
      sign: "-",
    },
    {
      label: "Saldo bersih",
      value: balance,
      className: balance >= 0 ? "text-income" : "text-expense",
      sign: balance >= 0 ? "" : "-",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-5"
        >
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${card.className}`}>
            {card.sign}
            {formatRupiah(Math.abs(card.value))}
          </p>
        </div>
      ))}
    </div>
  );
}
