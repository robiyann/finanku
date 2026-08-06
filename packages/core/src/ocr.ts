import OpenAI from 'openai';
import { z } from 'zod';

export const OcrReceiptItemSchema = z.object({
  name: z.string(),
  qty: z.number().int().positive().default(1),
  price: z.number().int().nonnegative(),
});

export const OcrResultSchema = z.object({
  is_receipt: z.boolean().default(true),
  merchant: z.string().nullable().optional(),
  total: z.number().int().positive(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  kategori_saran: z.string(),
  items: z.array(OcrReceiptItemSchema),
});

export type OcrResult = z.infer<typeof OcrResultSchema>;

export interface OcrOptions {
  categories: string[];
  today?: string; // YYYY-MM-DD
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxRetries?: number;
}

export async function extractReceipt(
  imageBuffer: Buffer,
  mimeType: string,
  options: OcrOptions
): Promise<OcrResult> {
  const baseUrl = options.baseUrl || process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
  const apiKey = options.apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const model = options.model || process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gemini-2.5-flash';
  const today = options.today || new Date().toISOString().split('T')[0];
  const maxRetries = options.maxRetries ?? 2;

  if (!apiKey) {
    throw new Error('API key untuk AI router tidak ditemukan. Setel AI_API_KEY atau OPENAI_API_KEY.');
  }

  const client = new OpenAI({
    baseURL: baseUrl || undefined,
    apiKey: apiKey,
  });

  const base64Image = imageBuffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64Image}`;

  const prompt = `Kamu adalah OCR parser struk belanja (receipt scanner) otomatis untuk pencatatan keuangan.
Tugasmu: Analisis foto ini dan ekstrak data transaksi belanja ke format JSON.

Aturan Penting:
1. Anggap gambar sebagai NOTA/STRUK BELANJA jika terdapat nama toko, daftar barang, atau nominal total pembayaran.
2. "merchant": Nama toko/merchant (misal: Indomaret, Alfamart, Tokopedia, Warung). Jika tidak jelas, gunakan "Struk Belanja".
3. "total": Total belanja akhir dalam angka bulat (misal: 45000). Jika tidak tertera, hitung dari jumlah harga barang.
4. "tanggal": Tanggal transaksi YYYY-MM-DD. Gunakan ${today} jika tidak tertera di nota.
5. "kategori_saran": Pilih SATU dari daftar kategori: ${options.categories.join(', ')}.
6. "items": Array item belanja: [{ "name": "Nama Barang", "qty": 1, "price": 15000 }]. Jika tidak ada rincian item, isi array kosong [].

Format output JSON valid (tanpa pembungkus markdown):
{
  "is_receipt": true,
  "merchant": "Nama Toko",
  "total": 50000,
  "tanggal": "YYYY-MM-DD",
  "kategori_saran": "Belanja",
  "items": [{ "name": "Item A", "qty": 1, "price": 50000 }]
}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('AI Vision mengembalikan respon kosong.');
      }

      let json: any;
      try {
        json = JSON.parse(content);
      } catch {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
          try {
            json = JSON.parse(codeBlockMatch[1].trim());
          } catch {}
        }
        if (!json) {
          const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            try {
              json = JSON.parse(jsonObjectMatch[0].trim());
            } catch {}
          }
        }
      }

      if (!json) {
        throw new Error('Gambar yang diunggah tidak dapat diekstraksi. Mohon pastikan foto nota terlihat jelas dan dapat dibaca.');
      }

      // Check if AI explicitly marked it as non-receipt AND total is missing
      if (json.is_receipt === false && !json.total && (!json.items || json.items.length === 0)) {
        throw new Error('Gambar yang diunggah bukan merupakan foto nota atau struk belanja yang valid. Mohon scan nota fisik asli.');
      }

      // Default values if missing
      if (!json.total && json.items && json.items.length > 0) {
        json.total = json.items.reduce((acc: number, item: any) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
      }
      if (!json.is_receipt) json.is_receipt = true;
      if (!json.tanggal) json.tanggal = today;
      if (!json.kategori_saran) json.kategori_saran = options.categories[0] || 'Belanja';

      // Validate schema
      return OcrResultSchema.parse(json);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        lastError = new Error('Format data nota dari AI tidak valid. Mohon pastikan foto nota terlihat jelas.');
      } else if (error.message?.includes('402') || error.message?.includes('MONTHLY_REQUEST_COUNT') || error.message?.includes('limit')) {
        // Quota/limit errors shouldn't retry needlessly, fail immediately
        throw new Error('Kuota bulanan API AI Router gratisan telah terlampaui (MONTHLY_REQUEST_COUNT Limit). Silakan gunakan API Key OpenAI/Gemini milik Anda di .env.local.');
      } else if (error.message?.includes('401') || error.message?.includes('API key')) {
        // Auth errors shouldn't retry
        throw new Error('API Key AI Router tidak valid atau memerlukan otorisasi.');
      } else {
        lastError = error;
      }

      console.warn(`[OCR] Percobaan ke-${attempt} dari ${maxRetries} gagal: ${lastError?.message}`);

      if (attempt < maxRetries) {
        // Wait 500ms backoff before retrying next attempt
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error(`Gagal mengekstrak data nota setelah ${maxRetries}x percobaan. Mohon pastikan foto nota terlihat jelas dan coba lagi.`);
}
