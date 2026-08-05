import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';

async function ensureTransactionColumns(sql: any) {
  try {
    await sql`ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key text;`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_idx ON public.transactions (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`;
  } catch {}
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk melihat transaksi.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type'); // 'income' | 'expense' | null
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  const sql = getDb();
  await ensureTransactionColumns(sql);

  try {
    const filterType = type || null;
    const filterStart = startDate || null;
    const filterEnd = endDate || null;

    const transactions = await sql`
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.merchant,
        t.occurred_at,
        t.source,
        t.created_at,
        c.name AS category_name,
        a.name AS account_name,
        a.type AS account_type,
        a.color AS account_color
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      LEFT JOIN public.accounts a ON t.account_id = a.id
      WHERE t.user_id = ${user.id}::uuid
        AND (${filterType}::text IS NULL OR t.type = ${filterType})
        AND (${filterStart}::date IS NULL OR t.occurred_at >= ${filterStart}::date)
        AND (${filterEnd}::date IS NULL OR t.occurred_at <= ${filterEnd}::date)
      ORDER BY t.occurred_at DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const totals = await sql`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
        COUNT(*) AS total_count
      FROM public.transactions
      WHERE user_id = ${user.id}::uuid
        AND (${filterStart}::date IS NULL OR occurred_at >= ${filterStart}::date)
        AND (${filterEnd}::date IS NULL OR occurred_at <= ${filterEnd}::date);
    `;

    const summary = totals[0] || { total_income: 0, total_expense: 0, total_count: 0 };

    // Fetch 30-day daily cashflows for dynamic sparkline
    const dailyCashflows = await sql`
      SELECT
        occurred_at::text AS date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net_cashflow
      FROM public.transactions
      WHERE user_id = ${user.id}::uuid
        AND occurred_at >= current_date - INTERVAL '30 days'
      GROUP BY occurred_at
      ORDER BY occurred_at ASC;
    `;

    const cashflowMap = new Map<string, number>();
    (dailyCashflows || []).forEach((row: any) => {
      cashflowMap.set(row.date, Number(row.net_cashflow || 0));
    });

    return NextResponse.json({
      ok: true,
      transactions: transactions || [],
      summary: {
        total_income: Number(summary.total_income) || 0,
        total_expense: Number(summary.total_expense) || 0,
        net_cashflow: (Number(summary.total_income) || 0) - (Number(summary.total_expense) || 0),
        total_count: Number(summary.total_count) || 0,
        daily_cashflows: Array.from(cashflowMap.entries()).map(([date, net]) => ({ date, net })),
      },
      pagination: { limit, offset },
    });
  } catch (err: any) {
    console.error('[Transactions GET] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal mengambil data transaksi. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk membuat transaksi.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  let body: {
    type?: string;
    amount?: number;
    account_id?: string;
    category_id?: string;
    description?: string;
    merchant?: string;
    occurred_at?: string;
    source?: string;
    receipt_id?: string;
    idempotency_key?: string;
    request_id?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body harus berupa JSON.' }, { status: 400 });
  }

  const headerIdempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('x-request-id');
  const idempotencyKey = headerIdempotencyKey || body.idempotency_key || body.request_id || null;

  const { type, amount, account_id, category_id, description, merchant, occurred_at, source = 'manual', receipt_id } = body;

  if (!type || !amount || !account_id) {
    return NextResponse.json({ error: 'type, amount, dan account_id wajib diisi.' }, { status: 400 });
  }

  if (!['income', 'expense'].includes(type)) {
    return NextResponse.json({ error: 'type harus "income" atau "expense".' }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'amount harus lebih dari 0.' }, { status: 400 });
  }

  // Validasi tambahan — panjang & format
  if (!Number.isFinite(amount) || amount > 999_999_999_999) {
    return NextResponse.json({ error: 'Jumlah transaksi tidak valid.' }, { status: 400 });
  }
  if (description && description.length > 500) {
    return NextResponse.json({ error: 'Deskripsi terlalu panjang. Maks 500 karakter.' }, { status: 400 });
  }
  if (merchant && merchant.length > 200) {
    return NextResponse.json({ error: 'Nama merchant terlalu panjang. Maks 200 karakter.' }, { status: 400 });
  }
  if (occurred_at && !/^\d{4}-\d{2}-\d{2}$/.test(occurred_at)) {
    return NextResponse.json({ error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD.' }, { status: 400 });
  }

  const sql = getDb();
  await ensureTransactionColumns(sql);

  // Deduplication check
  if (idempotencyKey) {
    try {
      const existing = await sql`
        SELECT id, type, amount, occurred_at, merchant, description, source, created_at
        FROM public.transactions
        WHERE user_id = ${user.id}::uuid AND idempotency_key = ${idempotencyKey}
        LIMIT 1;
      `;
      if (existing && existing.length > 0) {
        return NextResponse.json({ ok: true, transaction: existing[0], duplicate: true }, { status: 200 });
      }
    } catch {}
  }

  // Verify account belongs to this user before inserting
  try {
    const accountCheck = await sql`
      SELECT id FROM public.accounts
      WHERE id = ${account_id}::uuid AND user_id = ${user.id}::uuid AND active = true
      LIMIT 1;
    `;

    if (!accountCheck || accountCheck.length === 0) {
      return NextResponse.json(
        { error: 'Akun dompet tidak ditemukan atau bukan milik akun kamu.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
  } catch (err: any) {
    console.error('[Transactions POST] Account check error:', err.message);
    return NextResponse.json({ error: 'Gagal memvalidasi akun. Silakan coba lagi.' }, { status: 500 });
  }

  try {
    const txId = randomUUID();
    let rows: any[] = [];

    const cleanCategoryId = category_id || null;
    const cleanReceiptId = receipt_id || null;
    const cleanOccurredAt = occurred_at || new Date().toISOString().split('T')[0];

    try {
      rows = await sql`
        INSERT INTO public.transactions (
          id, user_id, type, amount, account_id, category_id,
          description, merchant, occurred_at, source, receipt_id, idempotency_key
        ) VALUES (
          ${txId}::uuid,
          ${user.id}::uuid,
          ${type},
          ${amount},
          ${account_id}::uuid,
          ${cleanCategoryId}::uuid,
          ${description || null},
          ${merchant || null},
          ${cleanOccurredAt}::date,
          ${source},
          ${cleanReceiptId}::uuid,
          ${idempotencyKey}
        )
        ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id, type, amount, occurred_at, merchant, description, source, created_at;
      `;
    } catch {
      // Fallback if idempotency_key column does not exist
      rows = await sql`
        INSERT INTO public.transactions (
          id, user_id, type, amount, account_id, category_id,
          description, merchant, occurred_at, source, receipt_id
        ) VALUES (
          ${txId}::uuid,
          ${user.id}::uuid,
          ${type},
          ${amount},
          ${account_id}::uuid,
          ${cleanCategoryId}::uuid,
          ${description || null},
          ${merchant || null},
          ${cleanOccurredAt}::date,
          ${source},
          ${cleanReceiptId}::uuid
        )
        RETURNING id, type, amount, occurred_at, merchant, description, source, created_at;
      `;
    }

    const tx = rows && rows.length > 0 ? rows[0] : null;

    return NextResponse.json({ ok: true, transaction: tx || { id: txId } }, { status: 201 });
  } catch (err: any) {
    console.error('[Transactions POST] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal membuat transaksi. Silakan coba lagi.' }, { status: 500 });
  }
}
