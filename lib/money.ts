// Rupiah helpers — dipakai oleh bot & dashboard.

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Format angka rupiah, mis. 50000 -> "Rp50.000". */
export function formatRupiah(amount: number): string {
  return rupiah.format(amount);
}

/** Format ringkas: 50000 -> "Rp50rb", 1500000 -> "Rp1,5jt". */
export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000;
    return `Rp${trim(v)}jt`;
  }
  if (amount >= 1_000) {
    const v = amount / 1_000;
    return `Rp${trim(v)}rb`;
  }
  return `Rp${amount}`;
}

function trim(v: number): string {
  return v
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(".", ",");
}

/**
 * Normalisasi string jumlah dari bahasa natural ke bilangan bulat rupiah.
 * Contoh: "50k" -> 50000, "1.5jt" / "1,5jt" -> 1500000, "25rb" -> 25000,
 * "Rp 100.000" -> 100000. Mengembalikan null jika tidak bisa ditafsirkan.
 *
 * Catatan: parsing utama dilakukan oleh LLM; fungsi ini jadi cadangan/validasi.
 */
export function parseAmount(input: string): number | null {
  if (!input) return null;
  let s = input.toLowerCase().trim();
  s = s.replace(/rp\.?/g, "").replace(/\s/g, "");

  const match = s.match(/^([\d.,]+)(jt|juta|m|rb|ribu|k)?$/);
  if (!match) return null;

  let [, numPart, unit] = match;
  let multiplier = 1;
  if (unit === "jt" || unit === "juta" || unit === "m") multiplier = 1_000_000;
  else if (unit === "rb" || unit === "ribu" || unit === "k") multiplier = 1_000;

  let numeric: number;
  if (multiplier > 1) {
    // Dengan unit, koma/titik dianggap desimal: "1,5jt" -> 1.5
    numeric = parseFloat(numPart.replace(",", "."));
  } else {
    // Tanpa unit, titik/koma dianggap pemisah ribuan: "100.000" -> 100000
    numeric = parseFloat(numPart.replace(/[.,]/g, ""));
  }

  if (Number.isNaN(numeric)) return null;
  return Math.round(numeric * multiplier);
}
