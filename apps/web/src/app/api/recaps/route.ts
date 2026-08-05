import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Sesi login tidak ditemukan.' }, { status: 401 });
  }

  const sql = getDb();

  // 2. Fetch user profile for language and currency from Neon DB
  let lang = 'id';
  let currency = 'IDR';

  try {
    const profiles = await sql`
      SELECT language, currency FROM public.users WHERE id = ${user.id}::uuid LIMIT 1;
    `;
    if (profiles && profiles.length > 0) {
      lang = profiles[0].language || 'id';
      currency = profiles[0].currency || 'IDR';
    }
  } catch {}

  // 3. Parse request parameters
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { period, period_start } = body;
  const targetPeriod = period || 'month';
  const targetStart = period_start || new Date().toISOString().split('T')[0];

  const startDate = new Date(targetStart);
  const endDate = new Date(startDate);
  if (targetPeriod === 'week') {
    endDate.setDate(startDate.getDate() + 6);
  } else {
    endDate.setMonth(startDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
  }

  const period_end = endDate.toISOString().split('T')[0];

  // 4. Query transactions within the period from Neon DB
  let transactions: any[] = [];
  try {
    transactions = await sql`
      SELECT t.type, t.amount, c.name as category_name
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      WHERE t.user_id = ${user.id}::uuid
        AND t.occurred_at >= ${targetStart}::date
        AND t.occurred_at <= ${period_end}::date;
    `;
  } catch {}

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap: Record<string, number> = {};

  (transactions || []).forEach((t: any) => {
    const amount = Number(t.amount);
    const catName = t.category_name || 'Lainnya';

    if (t.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      categoryMap[catName] = (categoryMap[catName] || 0) + amount;
    }
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([name, total]) => ({
    name,
    total,
  }));

  const netCashflow = totalIncome - totalExpense;

  // 5. Generate LLM Narrative using OpenAI Client pointing to AI Router
  const baseUrl = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'ag/gemini-3.6-flash-medium';

  let narrative = '';
  if (apiKey) {
    try {
      const openai = new OpenAI({ baseURL: baseUrl || undefined, apiKey });
      const promptLang = lang === 'en' ? 'English' : lang === 'ms' ? 'Malay' : 'Bahasa Indonesia';

      const systemPrompt = `Kamu adalah perencana keuangan AI (financial advisor) pribadi yang ramah dan cerdas.
Bahasa laporan: ${promptLang}. Mata uang: ${currency}.

Statistik Pengguna:
- Total Pemasukan: ${totalIncome}
- Total Pengeluaran: ${totalExpense}
- Aliran Kas Bersih (Net Cashflow): ${netCashflow}
- Detail Pengeluaran per Kategori:
${categoryBreakdown.map(c => `  * ${c.name}: ${c.total}`).join('\n')}

Format Laporan yang Diinginkan:
1. **Analisis Singkat**: Tinjauan performa kas dan pengeluaran terbesar (maksimal 3 kalimat).
2. **Saran Keuangan**: Berikan 2 saran singkat yang bisa langsung dilakukan pengguna.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
      });

      narrative = completion.choices[0]?.message?.content || 'Gagal menghasilkan rekap naratif.';
    } catch (aiError: any) {
      narrative = `Arus kasmu berada pada net cashflow ${netCashflow >= 0 ? '+' : ''}${netCashflow}. Terus pantau pengeluaran bulananmu!`;
    }
  } else {
    narrative = `Arus kasmu berada pada net cashflow ${netCashflow >= 0 ? '+' : ''}${netCashflow}. Terus pantau pengeluaran bulananmu!`;
  }

  // 6. Save recap to Neon Postgres
  const statsPayload = {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_cashflow: netCashflow,
    categories: categoryBreakdown,
    currency,
  };

  let recapId = 'recap-001';
  try {
    const recapRows = await sql`
      INSERT INTO public.recaps (user_id, period, period_start, period_end, narrative, stats)
      VALUES (${user.id}::uuid, ${targetPeriod}::public.recap_period, ${targetStart}::date, ${period_end}::date, ${narrative}, ${JSON.stringify(statsPayload)}::jsonb)
      RETURNING id, period, period_start, period_end, narrative, stats, created_at;
    `;
    if (recapRows && recapRows.length > 0) {
      recapId = recapRows[0].id;
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    recap: {
      id: recapId,
      period: targetPeriod,
      period_start: targetStart,
      period_end,
      narrative,
      stats: statsPayload,
    },
  });
}
