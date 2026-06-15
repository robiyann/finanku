import OpenAI from "openai";
import { z } from "zod";
import type { TransactionType } from "@/lib/types";

// OpenAI-compatible client diarahkan ke endpoint milik user.
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Skema hasil parsing dari LLM.
const ParsedSchema = z.object({
  ok: z.boolean(),
  type: z.enum(["income", "expense"]).nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  // tanggal relatif yang sudah diresolusi LLM ke YYYY-MM-DD
  occurred_at: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type ParsedTransaction = {
  ok: true;
  type: TransactionType;
  amount: number;
  category: string | null;
  description: string | null;
  occurred_at: string; // YYYY-MM-DD
};

export type ParseFailure = {
  ok: false;
  reason: string;
};

export type ParseResult = ParsedTransaction | ParseFailure;

interface ParseOptions {
  /** Nama-nama kategori yang tersedia untuk user (income & expense). */
  categories: { name: string; kind: TransactionType }[];
  /** Tanggal "hari ini" dalam YYYY-MM-DD (zona waktu user/server). */
  today: string;
}

function buildSystemPrompt({ categories, today }: ParseOptions): string {
  const expenseCats = categories
    .filter((c) => c.kind === "expense")
    .map((c) => c.name);
  const incomeCats = categories
    .filter((c) => c.kind === "income")
    .map((c) => c.name);

  return `Kamu adalah parser transaksi keuangan untuk pengguna Indonesia.
Tugasmu: ubah satu pesan chat berbahasa Indonesia (boleh gaul/typo) menjadi data transaksi terstruktur.

Hari ini: ${today}.

Tentukan:
- "type": "income" (pemasukan: gaji, bonus, dapat uang, jualan, dll) atau "expense" (pengeluaran: beli, bayar, jajan, dll).
- "amount": nominal dalam RUPIAH sebagai bilangan bulat. Tafsirkan satuan: "50k"/"50rb"=50000, "1,5jt"/"1.5jt"=1500000, "100rb"=100000, "2 juta"=2000000.
- "category": pilih SATU nama kategori yang paling cocok PERSIS dari daftar di bawah. Jika ragu, pakai "Lainnya".
- "description": ringkasan singkat barang/sumbernya (mis. "bakso", "gaji bulanan"). Boleh null.
- "occurred_at": tanggal transaksi YYYY-MM-DD. "hari ini"=${today}. Resolusikan "kemarin", "tadi", "minggu lalu" relatif terhadap hari ini. Default ke hari ini bila tak disebut.

Kategori pengeluaran: ${expenseCats.join(", ")}.
Kategori pemasukan: ${incomeCats.join(", ")}.

Jika pesan TIDAK mengandung transaksi yang jelas (tidak ada nominal, atau hanya sapaan/pertanyaan), kembalikan {"ok": false, "reason": "<alasan singkat dalam Bahasa Indonesia>"}.

Balas HANYA dengan objek JSON valid, tanpa teks lain. Bentuk sukses:
{"ok": true, "type": "...", "amount": 0, "category": "...", "description": "...", "occurred_at": "YYYY-MM-DD"}`;
}

/**
 * Parse satu pesan chat menjadi transaksi. Mengembalikan ParseResult.
 * Tidak pernah throw untuk kasus gagal-parse biasa — selalu kembalikan ok:false.
 */
export async function parseTransaction(
  message: string,
  options: ParseOptions,
): Promise<ParseResult> {
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(options) },
        { role: "user", content: message },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, reason: "Tidak ada balasan dari model." };
    }

    const json = extractJson(content);
    if (!json) {
      return { ok: false, reason: "Format balasan model tidak valid." };
    }

    const parsed = ParsedSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, reason: "Hasil parsing tidak sesuai format." };
    }

    const data = parsed.data;
    if (!data.ok) {
      return {
        ok: false,
        reason:
          data.reason ||
          "Aku belum menemukan nominal transaksi. Coba sebutkan jumlahnya, ya.",
      };
    }

    if (!data.type || !data.amount || data.amount <= 0) {
      return {
        ok: false,
        reason:
          "Aku belum menemukan jenis atau nominal transaksi. Coba contoh: 'jajan bakso 50k'.",
      };
    }

    return {
      ok: true,
      type: data.type,
      amount: Math.round(data.amount),
      category: data.category ?? null,
      description: data.description ?? null,
      occurred_at: isValidDate(data.occurred_at)
        ? (data.occurred_at as string)
        : options.today,
    };
  } catch (err) {
    console.error("parseTransaction error:", err);
    return {
      ok: false,
      reason: "Maaf, ada gangguan saat memproses. Coba lagi sebentar lagi ya.",
    };
  }
}

// Ambil objek JSON dari teks (jaga-jaga model membungkus dengan ```json).
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isValidDate(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
