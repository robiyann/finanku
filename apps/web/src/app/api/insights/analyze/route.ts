import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import OpenAI from 'openai';

async function ensureAiInsightsTableExists(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.ai_insights (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
        insight text NOT NULL,
        score int NOT NULL DEFAULT 85 CHECK (score >= 0 AND score <= 100),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS ai_insights_user_id_idx ON public.ai_insights (user_id, created_at DESC);
    `;
  } catch (err: any) {
    console.warn('[Insights Table Auto-Create] Warning:', err.message);
  }
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi login diperlukan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const sql = getDb();

  try {
    const rows = await sql`
      SELECT id, insight, score, created_at
      FROM public.ai_insights
      WHERE user_id = ${user.id}::uuid
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        ok: true,
        insight: null,
        message: 'Belum ada analisis AI. Klik tombol "Jalankan Analisis AI" untuk menganalisis keuangan kamu.',
      });
    }

    return NextResponse.json({ ok: true, insight: rows[0] });
  } catch (err: any) {
    if (err.message?.includes('does not exist') || err.message?.includes('ai_insights')) {
      // Auto create table if missing
      await ensureAiInsightsTableExists(sql);
      return NextResponse.json({
        ok: true,
        insight: null,
        message: 'Tabel dikonfigurasi. Klik tombol "Jalankan Analisis AI" untuk memulai.',
      });
    }

    console.error('[Insights GET] Error:', err.message);
    return NextResponse.json({ ok: true, insight: null });
  }
}

export async function POST() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi login diperlukan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const sql = getDb();
  await ensureAiInsightsTableExists(sql);

  // Rate Limit: Maks 1x analisis per 30 menit per user
  // Mencegah penyalahgunaan API key AI yang mahal
  try {
    const lastInsight = await sql`
      SELECT created_at FROM public.ai_insights
      WHERE user_id = ${user.id}::uuid
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    if (lastInsight && lastInsight.length > 0) {
      const elapsed = Date.now() - new Date(lastInsight[0].created_at).getTime();
      const cooldownMs = 30 * 60 * 1000; // 30 menit
      if (elapsed < cooldownMs) {
        const remainingMin = Math.ceil((cooldownMs - elapsed) / 60000);
        return NextResponse.json(
          {
            error: `Terlalu sering. Tunggu ${remainingMin} menit lagi sebelum analisis berikutnya.`,
            code: 'RATE_LIMITED',
            retry_after_minutes: remainingMin,
          },
          { status: 429 }
        );
      }
    }
  } catch { /* Lanjut jika tabel belum ada */ }

  try {
    let currency = 'IDR';
    try {
      const uRows = await sql`SELECT currency FROM public.users WHERE id = ${user.id}::uuid LIMIT 1;`;
      if (uRows?.length > 0) currency = uRows[0].currency || 'IDR';
    } catch {}

    const summaryRows = await sql`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
        COUNT(*) AS total_count
      FROM public.transactions
      WHERE user_id = ${user.id}::uuid
        AND occurred_at >= (CURRENT_DATE - INTERVAL '30 days');
    `;

    let topCategories: any[] = [];
    try {
      topCategories = await sql`
        SELECT c.name, SUM(t.amount) AS total
        FROM public.transactions t
        LEFT JOIN public.categories c ON t.category_id = c.id
        WHERE t.user_id = ${user.id}::uuid AND t.type = 'expense'
          AND t.occurred_at >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY c.name
        ORDER BY total DESC
        LIMIT 3;
      `;
    } catch {}

    const summary = summaryRows[0] || { total_income: 0, total_expense: 0, total_count: 0 };
    const totalIncome = Number(summary.total_income) || 0;
    const totalExpense = Number(summary.total_expense) || 0;
    const netCashflow = totalIncome - totalExpense;

    const baseUrl = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'ag/gemini-3.6-flash-medium';

    let insightText = '';
    let healthScore = 85;

    if (apiKey) {
      try {
        const openai = new OpenAI({ baseURL: baseUrl || undefined, apiKey });

        const prompt = `Kamu adalah penasihat keuangan AI (financial advisor) pribadi yang ramah, analitis, dan solutif.
Mata uang: ${currency}.

Data Keuangan 30 Hari Terakhir Pengguna:
- Total Pemasukan: ${totalIncome}
- Total Pengeluaran: ${totalExpense}
- Net Cashflow: ${netCashflow}
- Jumlah Transaksi: ${summary.total_count}
- Top Kategori Pengeluaran:
${(topCategories || []).map((c: any) => `  * ${c.name || 'Lainnya'}: ${c.total}`).join('\n') || '  (Belum ada pengeluaran)'}

Tugas:
1. Berikan 2-3 poin evaluasi kesehatan keuangan yang sangat ringkas, padat, dan berguna.
2. Tentukan skor kesehatan keuangan (Health Score 0-100).

Format Output JSON persis seperti berikut (hanya JSON):
{
  "score": 88,
  "insight": "1. Arus kasmu positif sebesar ${netCashflow}. Pertahankan rasio tabungan ini.\\n2. Pengeluaran terbanyak ada di kategori ${(topCategories?.[0]?.name) || 'Kebutuhan'}. Pertimbangkan untuk menetapkan batas anggaran bulanan."
}`;

        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.7,
        });

        const rawContent = completion.choices[0]?.message?.content || '';
        try {
          const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          insightText = parsed.insight || rawContent;
          healthScore = Math.min(Math.max(Number(parsed.score) || 85, 0), 100);
        } catch {
          insightText = rawContent;
          healthScore = netCashflow >= 0 ? 85 : 60;
        }
      } catch (aiErr: any) {
        insightText = `Arus kas bulananmu mencatatkan net cashflow ${netCashflow >= 0 ? '+' : ''}${netCashflow}. Tetap jaga pola pengeluaran harianmu secara teratur.`;
        healthScore = netCashflow >= 0 ? 80 : 55;
      }
    } else {
      insightText = `Arus kas bulananmu mencatatkan net cashflow ${netCashflow >= 0 ? '+' : ''}${netCashflow}. Tetap jaga pola pengeluaran harianmu secara teratur.`;
      healthScore = netCashflow >= 0 ? 80 : 55;
    }

    const rows = await sql`
      INSERT INTO public.ai_insights (user_id, insight, score)
      VALUES (${user.id}::uuid, ${insightText}, ${healthScore})
      RETURNING id, insight, score, created_at;
    `;

    return NextResponse.json({ ok: true, insight: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[Insights POST] Error:', err.message);
    return NextResponse.json({ error: 'Gagal menganalisis keuangan. Silakan coba lagi.' }, { status: 500 });
  }
}
