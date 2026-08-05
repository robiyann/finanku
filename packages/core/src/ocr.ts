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

  if (!apiKey) {
    throw new Error('API key untuk AI router tidak ditemukan. Setel AI_API_KEY atau OPENAI_API_KEY.');
  }

  const client = new OpenAI({
    baseURL: baseUrl || undefined,
    apiKey: apiKey,
  });

  const base64Image = imageBuffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64Image}`;

  const prompt = `Kamu adalah parser struk belanja (receipt scanner) untuk asisten keuangan pribadi.
Tugasmu: analisis gambar yang diunggah.

Langkah 1: Periksa apakah gambar ini ADALAH STRUK/NOTA BELANJA YANG VALID (terdapat rincian transaksi/pembelian/toko).
- Jika BUKAN struk/nota belanja (misal: foto orang, hewan, barang acak, pemandangan, dokumen lain):
  Kembalikan JSON persis seperti berikut:
  {
    "is_receipt": false,
    "error_reason": "Gambar yang diunggah bukan merupakan foto nota atau struk belanja."
  }

- Jika BENAR merupakan struk/nota belanja:
  Set "is_receipt": true dan ekstrak data berikut:
  1. "merchant": Nama toko/merchant (misal: Indomaret, Alfamart, Tokopedia). Jika tidak jelas, kembalikan null.
  2. "total": Total belanja akhir setelah diskon/pajak dalam angka bulat positif (misal: 150000).
  3. "tanggal": Tanggal transaksi YYYY-MM-DD. Gunakan ${today} jika tidak tertera.
  4. "kategori_saran": Pilih SATU dari daftar kategori: ${options.categories.join(', ')}.
  5. "items": Array item belanja: [{ "name": "Susu", "qty": 1, "price": 15000 }].

Format output JSON valid (tanpa pembungkus markdown):
{
  "is_receipt": true,
  "merchant": "Nama Toko",
  "total": 50000,
  "tanggal": "YYYY-MM-DD",
  "kategori_saran": "Belanja",
  "items": [{ "name": "Item A", "qty": 1, "price": 50000 }]
}`;

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
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('AI Vision mengembalikan respon kosong.');
    }

    const cleanedContent = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const json = JSON.parse(cleanedContent);

    // Check if AI explicitly marked it as non-receipt
    if (json.is_receipt === false) {
      throw new Error('Gambar yang diunggah bukan merupakan foto nota atau struk belanja yang valid. Mohon scan nota fisik asli.');
    }

    // Validate schema
    return OcrResultSchema.parse(json);

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error('Gambar yang diunggah tidak terdeteksi sebagai nota/struk belanja. Mohon pastikan foto nota terlihat jelas dan dapat dibaca.');
    }
    throw error;
  }
}
