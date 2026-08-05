import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { generateFinancialReport, ReportData } from '@/lib/excel-export';

/** Max rows for detailed transaction export (performance guard) */
const MAX_TX_ROWS = 10000;

/**
 * Export Financial Report to Excel (Professional Dashboard Edition)
 *
 * @GET /api/export?type=all|income|expense&start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk mengunduh laporan.' },
      { status: 401 }
    );
  }

  try {
    const sql = getDb();

    // Get URL parameters
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'all';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    const filterType = type === 'all' ? null : (type as 'income' | 'expense');
    const startDate = start || null;
    const endDate = end || null;

    // ----------------------------------------------------------
    // 1) Total count first (for truncation awareness)
    // ----------------------------------------------------------
    const countRows = await sql`
      SELECT COUNT(*)::INTEGER AS total_count
      FROM public.transactions t
      WHERE t.user_id = ${user.id}::uuid
        AND (${filterType}::text IS NULL OR t.type = ${filterType})
        AND (${startDate}::date IS NULL OR t.occurred_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR t.occurred_at <= ${endDate}::date)
    `;
    const totalAvailable = Number(countRows?.[0]?.total_count || 0);
    const truncated = totalAvailable > MAX_TX_ROWS;

    // ----------------------------------------------------------
    // 2) Transactions (capped for big data safety)
    // ----------------------------------------------------------
    const transactionsRaw = await sql`
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.merchant,
        t.occurred_at::TEXT AS occurred_at,
        t.source,
        c.name AS category_name,
        a.name AS account_name,
        a.type AS account_type
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      LEFT JOIN public.accounts a ON t.account_id = a.id
      WHERE t.user_id = ${user.id}::uuid
        AND (${filterType}::text IS NULL OR t.type = ${filterType})
        AND (${startDate}::date IS NULL OR t.occurred_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR t.occurred_at <= ${endDate}::date)
      ORDER BY t.occurred_at DESC, t.created_at DESC
      LIMIT ${MAX_TX_ROWS}
    `;

    const transactions = (Array.isArray(transactionsRaw) ? transactionsRaw : []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount) || 0,
      category_name: t.category_name,
      merchant: t.merchant,
      description: t.description,
      occurred_at: t.occurred_at,
      source: t.source,
      account_name: t.account_name,
      account_type: t.account_type,
    }));

    // ----------------------------------------------------------
    // 3) Daily cashflow (full range - aggregated in SQL)
    // ----------------------------------------------------------
    const dailyCashflowsRaw = await sql`
      SELECT
        occurred_at::TEXT AS date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net
      FROM public.transactions
      WHERE user_id = ${user.id}::uuid
        AND (${filterType}::text IS NULL OR type = ${filterType})
        AND (${startDate}::date IS NULL OR occurred_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR occurred_at <= ${endDate}::date)
      GROUP BY occurred_at
      ORDER BY occurred_at ASC
    `;
    const dailyCashflows = (Array.isArray(dailyCashflowsRaw) ? dailyCashflowsRaw : []).map((row: any) => ({
      date: String(row.date),
      net: Number(row.net) || 0,
      income: Number(row.income) || 0,
      expense: Number(row.expense) || 0,
    }));

    // ----------------------------------------------------------
    // 4) Category breakdown (use t.type, not c.kind - transactions without category still counted)
    // ----------------------------------------------------------
    const categoryBreakdownRaw = await sql`
      SELECT
        COALESCE(c.name, 'Lainnya') AS category_name,
        t.type AS kind,
        COUNT(*)::INTEGER AS count,
        COALESCE(SUM(t.amount), 0)::BIGINT AS total_amount
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      WHERE t.user_id = ${user.id}::uuid
        AND (${filterType}::text IS NULL OR t.type = ${filterType})
        AND (${startDate}::date IS NULL OR t.occurred_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR t.occurred_at <= ${endDate}::date)
      GROUP BY c.name, t.type
      ORDER BY total_amount DESC
    `;
    const categoryBreakdownsRaw = Array.isArray(categoryBreakdownRaw) ? categoryBreakdownRaw : [];

    // Calculate percentages per kind
    const kindTotals: Record<string, number> = {};
    for (const item of categoryBreakdownsRaw) {
      const key = String(item.kind);
      kindTotals[key] = (kindTotals[key] || 0) + (Number(item.total_amount) || 0);
    }
    const categoryBreakdowns = categoryBreakdownsRaw.map((cat: any) => ({
      category_name: cat.category_name,
      kind: cat.kind,
      count: Number(cat.count) || 0,
      total_amount: Number(cat.total_amount) || 0,
      percentage: kindTotals[cat.kind] > 0
        ? (Number(cat.total_amount) / kindTotals[cat.kind]) * 100
        : 0,
    }));

    // ----------------------------------------------------------
    // 5) Wallet summaries (initial balance + flow + tx count)
    // ----------------------------------------------------------
    const accountSummaryRaw = await sql`
      SELECT
        a.name,
        a.type,
        a.initial_balance::BIGINT AS initial_balance,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)::BIGINT AS flow,
        COUNT(t.id)::INTEGER AS transaction_count
      FROM public.accounts a
      LEFT JOIN public.transactions t
        ON t.account_id = a.id
        AND (${filterType}::text IS NULL OR t.type = ${filterType})
        AND (${startDate}::date IS NULL OR t.occurred_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR t.occurred_at <= ${endDate}::date)
      WHERE a.user_id = ${user.id}::uuid AND a.active = true
      GROUP BY a.id, a.name, a.type, a.initial_balance
      ORDER BY (a.initial_balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)) DESC
    `;
    const accountSummaries = (Array.isArray(accountSummaryRaw) ? accountSummaryRaw : []).map((acc: any) => {
      const initialBalance = Number(acc.initial_balance) || 0;
      const flow = Number(acc.flow) || 0;
      return {
        name: acc.name,
        type: acc.type,
        initial_balance: initialBalance,
        current_balance: initialBalance + flow,
        transaction_count: Number(acc.transaction_count) || 0,
      };
    });
    const totalBalance = accountSummaries.reduce((s, a) => s + a.current_balance, 0);

    // ----------------------------------------------------------
    // 6) Merchant intelligence (aggregated in SQL for big data perf)
    // ----------------------------------------------------------
    const merchantStatsRaw = await sql`
      SELECT
        t.merchant,
        COUNT(*)::INTEGER AS count,
        COALESCE(SUM(t.amount), 0)::BIGINT AS total_amount,
        MAX(t.occurred_at)::TEXT AS last_seen,
        (
          SELECT c2.name FROM public.transactions t2
          LEFT JOIN public.categories c2 ON t2.category_id = c2.id
          WHERE t2.user_id = ${user.id}::uuid AND t2.merchant = t.merchant AND t2.type = 'expense'
          GROUP BY c2.name
          ORDER BY SUM(t2.amount) DESC
          LIMIT 1
        ) AS category_name
      FROM public.transactions t
      WHERE t.user_id = ${user.id}::uuid
        AND t.merchant IS NOT NULL
        AND t.merchant <> ''
        AND (${filterType}::text IS NULL OR t.type = ${filterType})
        AND (${startDate}::date IS NULL OR t.occurred_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR t.occurred_at <= ${endDate}::date)
      GROUP BY t.merchant
      ORDER BY total_amount DESC
      LIMIT 25
    `;
    const merchantStats = (Array.isArray(merchantStatsRaw) ? merchantStatsRaw : []).map((m: any) => ({
      merchant: m.merchant,
      count: Number(m.count) || 0,
      total_amount: Number(m.total_amount) || 0,
      avg_amount: Number(m.count) > 0 ? Math.round(Number(m.total_amount) / Number(m.count)) : 0,
      last_seen: m.last_seen,
      category_name: m.category_name || null,
    }));

    // ----------------------------------------------------------
    // 7) Previous period comparison (same duration, right before)
    // ----------------------------------------------------------
    let previousPeriod: ReportData['previousPeriod'] = null;
    try {
      if (startDate && endDate) {
        // Shift both dates back by the period length using SQL date arithmetic
        const prevRows = await sql`
          WITH period AS (
            SELECT
              (${endDate}::date - ${startDate}::date + 1) AS len_days
          )
          SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::BIGINT AS total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::BIGINT AS total_expense,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::BIGINT AS net_cashflow,
            COUNT(*)::INTEGER AS total_count
          FROM public.transactions, period
          WHERE user_id = ${user.id}::uuid
            AND (${filterType}::text IS NULL OR type = ${filterType})
            AND occurred_at >= (${startDate}::date - period.len_days * INTERVAL '1 day')::date
            AND occurred_at < ${startDate}::date
        `;
        if (prevRows && prevRows.length > 0) {
          previousPeriod = {
            total_income: Number(prevRows[0].total_income) || 0,
            total_expense: Number(prevRows[0].total_expense) || 0,
            net_cashflow: Number(prevRows[0].net_cashflow) || 0,
            total_count: Number(prevRows[0].total_count) || 0,
          };
        }
      } else {
        // No date filter: compare vs previous 30 days before the earliest tx
        const prevRows = await sql`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::BIGINT AS total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::BIGINT AS total_expense,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::BIGINT AS net_cashflow,
            COUNT(*)::INTEGER AS total_count
          FROM public.transactions
          WHERE user_id = ${user.id}::uuid
            AND (${filterType}::text IS NULL OR type = ${filterType})
        `;
        // No meaningful comparison without a range - leave null
        void prevRows;
      }
    } catch (err: any) {
      console.warn('[Export Route] Previous period query failed (non-fatal):', err.message);
    }

    // ----------------------------------------------------------
    // 8) User settings
    // ----------------------------------------------------------
    const userSettingsRaw = await sql`
      SELECT display_name, email, currency
      FROM public.users
      WHERE id = ${user.id}::uuid
      LIMIT 1
    `;
    const settingsRow = Array.isArray(userSettingsRaw) && userSettingsRaw.length > 0
      ? userSettingsRaw[0]
      : null;

    // ----------------------------------------------------------
    // Build report data & generate workbook
    // ----------------------------------------------------------
    const reportData: ReportData = {
      transactions,
      dailyCashflows,
      categoryBreakdowns,
      accountSummaries,
      merchantStats,
      previousPeriod,
      totalBalance,
      userName: settingsRow?.display_name || user.name || user.email || 'User',
      userEmail: user.email,
      currency: settingsRow?.currency || 'IDR',
      startDate,
      endDate,
      filterType: (filterType || 'all') as 'all' | 'income' | 'expense',
      truncated,
      totalAvailable,
    };

    const workbook = await generateFinancialReport(reportData);
    const buffer = await workbook.xlsx.writeBuffer();

    // Filename
    const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filterSuffix = filterType ? `_${filterType}` : '';
    const filename = `Keuanganku_Laporan${filterSuffix}_${dateSuffix}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('[Export Route] Error:', err.message, err.stack);
    return NextResponse.json(
      { error: `Gagal membuat laporan. Silakan coba lagi. Detail: ${err.message}` },
      { status: 500 }
    );
  }
}
