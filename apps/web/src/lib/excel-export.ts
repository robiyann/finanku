/**
 * Professional Financial Report Generator - Financial AI Engine
 *
 * Generates a CFO-level Excel workbook with 6 sheets:
 * 1. Executive Dashboard  - KPI cards, trends, saving rate
 * 2. Cashflow & Trends    - Daily/weekly breakdown + auto insights
 * 3. Category Deep-Dive   - Ranking, %, averages, highlights
 * 4. Wallet Health        - Balance tracking, distribution, warnings
 * 5. Merchant Intelligence - Top merchants analysis
 * 6. Transaksi Lengkap    - Raw data as filterable Excel table
 */

import Excel from 'exceljs';

// ============================================================
// TYPES
// ============================================================

export interface TransactionItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_name: string | null;
  merchant: string | null;
  description: string | null;
  occurred_at: string;
  source: string;
  account_name: string | null;
  account_type: string | null;
}

export interface DailyCashflow {
  date: string;
  net: number;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  category_name: string;
  kind: 'income' | 'expense';
  count: number;
  total_amount: number;
  percentage: number;
}

export interface AccountSummary {
  name: string;
  type: string;
  current_balance: number;
  initial_balance: number;
  transaction_count: number;
}

export interface MerchantStat {
  merchant: string;
  count: number;
  total_amount: number;
  avg_amount: number;
  last_seen: string;
  category_name: string | null;
}

export interface PeriodComparison {
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  total_count: number;
}

export interface ReportData {
  transactions: TransactionItem[];
  dailyCashflows: DailyCashflow[];
  categoryBreakdowns: CategoryBreakdown[];
  accountSummaries: AccountSummary[];
  merchantStats: MerchantStat[];
  previousPeriod: PeriodComparison | null;
  totalBalance: number;
  userName: string;
  userEmail: string;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  filterType: 'all' | 'income' | 'expense';
  truncated: boolean;
  totalAvailable: number;
}

// ============================================================
// THEME (Dark professional palette matching the app)
// ============================================================

const C = {
  navyDark: 'FF0F172A',
  navy: 'FF1E293B',
  navyLight: 'FF334155',
  cyan: 'FF06B6D4',
  blue: 'FF3B82F6',
  indigo: 'FF6366F1',
  emerald: 'FF10B981',
  emeraldBg: 'FFD1FAE5',
  rose: 'FFEF4444',
  roseBg: 'FFFEE2E2',
  amber: 'FFF59E0B',
  amberBg: 'FFFEF3C7',
  white: 'FFFFFFFF',
  gray100: 'FFF1F5F9',
  gray200: 'FFE2E8F0',
  gray400: 'FF94A3B8',
  gray600: 'FF475569',
};

const FONT = { name: 'Calibri' };

// ============================================================
// HELPERS
// ============================================================

function money(amount: number, currency: string): string {
  const c = (currency || 'IDR').toUpperCase();
  if (c === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  if (c === 'MYR') {
    return `RM ${(amount / 100).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${c}`;
}

function percent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function shortMoney(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return money(amount / 1_000_000_000, currency) + ' M';
  if (abs >= 1_000_000) return money(amount / 1_000_000, currency) + ' jt';
  if (abs >= 1_000) return money(amount / 1_000, currency) + ' rb';
  return money(amount, currency);
}

function fmtDateID(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function fmtDayID(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

function numFmt(currency: string): string {
  const c = (currency || 'IDR').toUpperCase();
  if (c === 'IDR') return '#,##0';
  return '#,##0.00';
}

/** Solid fill helper */
function fill(argb: string): Excel.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } } as Excel.Fill;
}

/** Thin border helper */
function thinBorder(argb: string = C.gray200): Excel.Borders {
  const style: Partial<Excel.Border> = { style: 'thin', color: { argb } };
  return { top: style, bottom: style, left: style, right: style } as Excel.Borders;
}

/** Set a cell with value + style in one call */
function setCell(
  ws: Excel.Worksheet,
  ref: string,
  value: string | number | null,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    bg?: string;
    align?: 'left' | 'center' | 'right';
    italic?: boolean;
    border?: boolean;
    numFmt?: string;
  } = {}
) {
  const cell = ws.getCell(ref);
  cell.value = value;
  cell.font = {
    name: FONT.name,
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    size: opts.size ?? 10,
    color: { argb: opts.color || C.navyDark },
  };
  if (opts.bg) cell.fill = fill(opts.bg);
  cell.alignment = {
    horizontal: opts.align ?? 'left',
    vertical: 'middle',
    wrapText: false,
  };
  if (opts.border) cell.border = thinBorder();
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  return cell;
}

/** Section header bar */
function sectionHeader(ws: Excel.Worksheet, row: number, text: string, icon = ''): number {
  setCell(ws, `A${row}`, `${icon} ${text}`.trim(), {
    bold: true,
    size: 12,
    color: C.white,
    bg: C.blue,
    align: 'left',
  });
  ws.getRow(row).height = 24;
  return row + 1;
}

/** Big title banner */
function titleBanner(ws: Excel.Worksheet, row: number, title: string, subtitle: string): number {
  ws.mergeCells(`A${row}:H${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = title;
  cell.font = { name: FONT.name, bold: true, size: 18, color: { argb: C.white } };
  cell.fill = fill(C.navyDark);
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 40;

  ws.mergeCells(`A${row + 1}:H${row + 1}`);
  const sub = ws.getCell(`A${row + 1}`);
  sub.value = subtitle;
  sub.font = { name: FONT.name, size: 10, color: { argb: C.gray400 }, italic: true };
  sub.fill = fill(C.navyDark);
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row + 1).height = 20;

  return row + 3;
}

/** KPI card block (3 rows: label, value, trend) */
function kpiCard(
  ws: Excel.Worksheet,
  startRow: number,
  colStart: string,
  colEnd: string,
  label: string,
  value: string,
  trend: string,
  opts: { valueColor?: string; bg?: string; trendColor?: string } = {}
) {
  ws.mergeCells(`${colStart}${startRow}:${colEnd}${startRow}`);
  setCell(ws, `${colStart}${startRow}`, label, {
    bold: true,
    size: 9,
    color: C.gray400,
    bg: opts.bg || C.gray100,
    align: 'center',
    border: true,
  });

  ws.mergeCells(`${colStart}${startRow + 1}:${colEnd}${startRow + 1}`);
  setCell(ws, `${colStart}${startRow + 1}`, value, {
    bold: true,
    size: 15,
    color: opts.valueColor || C.navyDark,
    bg: opts.bg || C.gray100,
    align: 'center',
    border: true,
  });
  ws.getRow(startRow + 1).height = 26;

  ws.mergeCells(`${colStart}${startRow + 2}:${colEnd}${startRow + 2}`);
  setCell(ws, `${colStart}${startRow + 2}`, trend, {
    size: 9,
    color: opts.trendColor || C.gray600,
    bg: opts.bg || C.gray100,
    align: 'center',
    border: true,
  });
}

// ============================================================
// MAIN GENERATOR
// ============================================================

export async function generateFinancialReport(data: ReportData): Promise<Excel.Workbook> {
  const workbook = new Excel.Workbook();
  workbook.creator = 'Financial AI Engine';
  workbook.created = new Date();

  const cur = data.currency || 'IDR';

  // Compute core stats
  const totalIncome = data.transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = data.transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;
  const totalCount = data.transactions.length;
  const avgPerTx = totalCount > 0 ? (totalIncome + totalExpense) / totalCount : 0;
  const savingRate = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;

  const largestTx = data.transactions.reduce<TransactionItem | null>(
    (max, t) => (!max || t.amount > max.amount ? t : max),
    null
  );

  const prev = data.previousPeriod;
  const incomeChange =
    prev && prev.total_income > 0
      ? ((totalIncome - prev.total_income) / prev.total_income) * 100
      : null;
  const expenseChange =
    prev && prev.total_expense > 0
      ? ((totalExpense - prev.total_expense) / prev.total_expense) * 100
      : null;

  // ============================================================
  // SHEET 1: EXECUTIVE DASHBOARD
  // ============================================================
  const dash = workbook.addWorksheet('Executive Dashboard', {
    properties: { tabColor: { argb: C.blue } },
    views: [{ showGridLines: false }],
  });

  dash.columns = [
    { width: 4 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 4 },
  ];

  let r = titleBanner(
    dash,
    2,
    'KEUANGANKU v2 - LAPORAN KEUANGAN',
    'Financial AI Engine - Professional Financial Report'
  );

  // Meta info block
  setCell(dash, `B${r}`, 'Disiapkan untuk', { size: 9, color: C.gray600, bold: true });
  setCell(dash, `C${r}`, `: ${data.userName}`, { size: 10 });
  setCell(dash, `E${r}`, 'Mata Uang', { size: 9, color: C.gray600, bold: true });
  setCell(dash, `F${r}`, `: ${cur}`, { size: 10 });
  r++;
  setCell(dash, `B${r}`, 'Periode', { size: 9, color: C.gray600, bold: true });
  setCell(
    dash,
    `C${r}`,
    `: ${data.startDate ? fmtDateID(data.startDate) : 'Awal'} s/d ${data.endDate ? fmtDateID(data.endDate) : 'Sekarang'}`,
    { size: 10 }
  );
  setCell(dash, `E${r}`, 'Generated', { size: 9, color: C.gray600, bold: true });
  setCell(dash, `F${r}`, `: ${new Date().toLocaleString('id-ID')}`, { size: 10 });
  r += 2;

  // ---- KPI CARDS ROW 1 (4 cards) ----
  r = sectionHeader(dash, r, 'RINGKASAN KEUANGAN UTAMA', '1.');

  const kpiRow1 = r + 1;
  kpiCard(dash, kpiRow1, 'B', 'C', 'TOTAL PEMASUKAN', money(totalIncome, cur),
    incomeChange !== null ? `${percent(incomeChange)} vs periode lalu` : 'Tidak ada data pembanding',
    { valueColor: C.emerald, bg: C.emeraldBg, trendColor: incomeChange !== null && incomeChange < 0 ? C.rose : C.gray600 }
  );
  kpiCard(dash, kpiRow1, 'D', 'E', 'TOTAL PENGELUARAN', money(totalExpense, cur),
    expenseChange !== null ? `${percent(expenseChange)} vs periode lalu` : 'Tidak ada data pembanding',
    { valueColor: C.rose, bg: C.roseBg, trendColor: expenseChange !== null && expenseChange > 0 ? C.rose : C.gray600 }
  );
  kpiCard(dash, kpiRow1, 'F', 'G', 'NET CASHFLOW', money(netCashflow, cur),
    netCashflow >= 0 ? 'POSITIVE - Pertahankan!' : 'NEGATIVE - Perlu perhatian',
    { valueColor: netCashflow >= 0 ? C.blue : C.rose, bg: netCashflow >= 0 ? 'FFDBEAFE' : C.roseBg }
  );
  r = kpiRow1 + 4;

  // ---- KPI CARDS ROW 2 ----
  const kpiRow2 = r + 1;
  kpiCard(dash, kpiRow2, 'B', 'C', 'SAVING RATE', `${savingRate.toFixed(1)}%`,
    savingRate >= 20 ? 'Target >= 20% tercapai' : 'Target ideal: 20%',
    { valueColor: savingRate >= 20 ? C.emerald : C.amber, bg: savingRate >= 20 ? C.emeraldBg : C.amberBg }
  );
  kpiCard(dash, kpiRow2, 'D', 'E', 'TOTAL TRANSAKSI', `${totalCount.toLocaleString('id-ID')} transaksi`,
    `Rata-rata ${money(avgPerTx, cur)} / transaksi`,
    { valueColor: C.indigo, bg: 'FFE0E7FF' }
  );
  kpiCard(dash, kpiRow2, 'F', 'G', 'TOTAL SALDO SEMUA DOMPET', money(data.totalBalance, cur),
    `${data.accountSummaries.length} dompet aktif`,
    { valueColor: C.navy, bg: C.gray100 }
  );
  r = kpiRow2 + 4;

  // ---- HIGHLIGHTS ----
  r = sectionHeader(dash, r, 'HIGHLIGHTS PERIODE INI', '2.');

  if (largestTx) {
    setCell(dash, `B${r}`, 'Transaksi Terbesar', { size: 10, bold: true, color: C.gray600, bg: C.gray100, border: true });
    dash.mergeCells(`C${r}:F${r}`);
    setCell(dash, `C${r}`,
      `${largestTx.merchant || largestTx.description || 'Transaksi'} - ${money(largestTx.amount, cur)} (${fmtDateID(largestTx.occurred_at)})`,
      { size: 10, bg: C.gray100, border: true });
    setCell(dash, `G${r}`, largestTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran', {
      size: 10, bold: true, align: 'center', border: true,
      color: largestTx.type === 'income' ? C.emerald : C.rose,
      bg: largestTx.type === 'income' ? C.emeraldBg : C.roseBg,
    });
    r++;
  }

  const topExpenseCat = data.categoryBreakdowns
    .filter((c) => c.kind === 'expense')
    .sort((a, b) => b.total_amount - a.total_amount)[0];
  if (topExpenseCat) {
    setCell(dash, `B${r}`, 'Kategori Terboros', { size: 10, bold: true, color: C.gray600, bg: C.gray100, border: true });
    dash.mergeCells(`C${r}:F${r}`);
    setCell(dash, `C${r}`,
      `${topExpenseCat.category_name} - ${money(topExpenseCat.total_amount, cur)} (${topExpenseCat.percentage.toFixed(1)}% dari total)`,
      { size: 10, bg: C.gray100, border: true });
    setCell(dash, `G${r}`, `${topExpenseCat.count}x`, { size: 10, align: 'center', border: true, bg: C.gray100 });
    r++;
  }

  const topIncomeCat = data.categoryBreakdowns
    .filter((c) => c.kind === 'income')
    .sort((a, b) => b.total_amount - a.total_amount)[0];
  if (topIncomeCat) {
    setCell(dash, `B${r}`, 'Sumber Pemasukan Utama', { size: 10, bold: true, color: C.gray600, bg: C.gray100, border: true });
    dash.mergeCells(`C${r}:F${r}`);
    setCell(dash, `C${r}`,
      `${topIncomeCat.category_name} - ${money(topIncomeCat.total_amount, cur)}`,
      { size: 10, bg: C.gray100, border: true });
    setCell(dash, `G${r}`, `${topIncomeCat.count}x`, { size: 10, align: 'center', border: true, bg: C.gray100 });
    r++;
  }

  const negativeDays = data.dailyCashflows.filter((d) => d.net < 0).length;
  const avgDailyExpense = data.dailyCashflows.length > 0
    ? totalExpense / Math.max(data.dailyCashflows.length, 1)
    : 0;
  setCell(dash, `B${r}`, 'Rata-rata Pengeluaran Harian', { size: 10, bold: true, color: C.gray600, bg: C.gray100, border: true });
  dash.mergeCells(`C${r}:F${r}`);
  setCell(dash, `C${r}`, `${money(avgDailyExpense, cur)} / hari`, { size: 10, bg: C.gray100, border: true });
  setCell(dash, `G${r}`, `${negativeDays} hari defisit`, {
    size: 10, align: 'center', border: true,
    color: negativeDays > 0 ? C.rose : C.emerald,
    bg: negativeDays > 0 ? C.roseBg : C.emeraldBg,
  });
  r += 2;

  // ---- PERIOD COMPARISON ----
  if (prev) {
    r = sectionHeader(dash, r, 'PERBANDINGAN DENGAN PERIODE SEBELUMNYA', '3.');

    setCell(dash, `B${r}`, 'Metrik', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
    setCell(dash, `C${r}`, 'Periode Ini', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
    setCell(dash, `D${r}`, 'Periode Lalu', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
    setCell(dash, `E${r}`, 'Selisih', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
    setCell(dash, `F${r}`, '% Perubahan', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
    r++;

    const cmpRows = [
      { label: 'Pemasukan', now: totalIncome, before: prev.total_income, goodWhenUp: true },
      { label: 'Pengeluaran', now: totalExpense, before: prev.total_expense, goodWhenUp: false },
      { label: 'Net Cashflow', now: netCashflow, before: prev.net_cashflow, goodWhenUp: true },
    ];

    for (const row of cmpRows) {
      const diff = row.now - row.before;
      const change = row.before !== 0 ? (diff / Math.abs(row.before)) * 100 : null;
      const goodDirection = row.goodWhenUp ? diff >= 0 : diff <= 0;

      setCell(dash, `B${r}`, row.label, { bold: true, size: 10, border: true });
      setCell(dash, `C${r}`, row.now, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
      setCell(dash, `D${r}`, row.before, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
      setCell(dash, `E${r}`, diff, {
        size: 10, align: 'right', border: true, numFmt: numFmt(cur),
        color: goodDirection ? C.emerald : C.rose,
      });
      setCell(dash, `F${r}`, change !== null ? percent(change) : '-', {
        size: 10, align: 'center', border: true, bold: true,
        color: goodDirection ? C.emerald : C.rose,
        bg: goodDirection ? C.emeraldBg : C.roseBg,
      });
      r++;
    }
    r += 2;
  }

  // Footer
  r += 1;
  dash.mergeCells(`B${r}:G${r}`);
  setCell(dash, `B${r}`,
    'Generated by Financial AI Engine - Keuanganku v2. Data bersifat rahasia dan hanya untuk penggunaan pribadi.',
    { size: 8, italic: true, color: C.gray400, align: 'center' });

  // ============================================================
  // SHEET 2: CASHFLOW & TRENDS
  // ============================================================
  const cf = workbook.addWorksheet('Cashflow & Trends', {
    properties: { tabColor: { argb: C.cyan } },
    views: [{ showGridLines: false }],
  });

  cf.columns = [
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 30 },
  ];

  r = titleBanner(cf, 1, 'CASHFLOW & TRENDS', 'Analisis arus kas harian dan pola pengeluaran');
  r += 1;

  // Auto insights
  r = sectionHeader(cf, r, 'AUTO INSIGHTS', '1.');

  const insights: string[] = [];

  const peakDay = data.dailyCashflows.reduce<DailyCashflow | null>(
    (max, d) => (!max || d.expense > max.expense ? d : max),
    null
  );
  if (peakDay && peakDay.expense > 0) {
    insights.push(`Pengeluaran tertinggi terjadi pada ${fmtDayID(peakDay.date)} sebesar ${money(peakDay.expense, cur)}`);
  }
  if (avgDailyExpense > 0) {
    insights.push(`Rata-rata pengeluaran harian: ${money(avgDailyExpense, cur)}`);
  }
  if (negativeDays > 0) {
    insights.push(`Terdapat ${negativeDays} hari dengan arus kas negatif (lebih besar pasak daripada tiang)`);
  } else if (data.dailyCashflows.length > 0) {
    insights.push('Arus kas harian selalu positif selama periode ini - excellent!');
  }
  if (largestTx) {
    insights.push(`Transaksi tunggal terbesar: ${money(largestTx.amount, cur)} (${largestTx.merchant || largestTx.description || 'tanpa nama'})`);
  }
  if (savingRate >= 20) {
    insights.push(`Saving rate ${savingRate.toFixed(1)}% sudah di atas target ideal 20%`);
  } else if (totalIncome > 0) {
    insights.push(`Saving rate ${savingRate.toFixed(1)}% masih di bawah target ideal 20% - coba kurangi pengeluaran diskresioner`);
  }

  insights.forEach((insight) => {
    setCell(cf, `A${r}`, '', {});
    cf.mergeCells(`B${r}:F${r}`);
    setCell(cf, `B${r}`, `- ${insight}`, { size: 10, bg: 'FFEFF6FF', border: true });
    r++;
  });
  r += 1;

  // Daily cashflow table
  r = sectionHeader(cf, r, 'ARUS KAS HARIAN', '2.');

  const headerRow = r;
  ['Tanggal', 'Pemasukan', 'Pengeluaran', 'Net Cashflow', 'Status', 'Catatan'].forEach((h, i) => {
    setCell(cf, `${String.fromCharCode(65 + i)}${headerRow}`, h, {
      bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true,
    });
  });
  r++;

  const dailyDataStart = r;
  const sortedDaily = [...data.dailyCashflows].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sortedDaily) {
    setCell(cf, `A${r}`, fmtDateID(day.date), { size: 10, border: true });
    setCell(cf, `B${r}`, day.income, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(cf, `C${r}`, day.expense, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(cf, `D${r}`, day.net, {
      size: 10, align: 'right', border: true, numFmt: numFmt(cur),
      color: day.net >= 0 ? C.emerald : C.rose, bold: true,
    });
    setCell(cf, `E${r}`, day.net >= 0 ? 'SURPLUS' : 'DEFISIT', {
      size: 9, align: 'center', border: true, bold: true,
      color: day.net >= 0 ? C.emerald : C.rose,
      bg: day.net >= 0 ? C.emeraldBg : C.roseBg,
    });
    setCell(cf, `F${r}`, day.net >= 0 ? '' : 'Pengeluaran melebihi pemasukan', {
      size: 9, italic: true, color: C.gray600, border: true,
    });
    r++;
  }

  // Total row
  setCell(cf, `A${r}`, 'TOTAL', { bold: true, size: 10, color: C.white, bg: C.blue, border: true });
  setCell(cf, `B${r}`, totalIncome, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
  setCell(cf, `C${r}`, totalExpense, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
  setCell(cf, `D${r}`, netCashflow, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
  setCell(cf, `E${r}`, '', { bg: C.blue, border: true });
  setCell(cf, `F${r}`, '', { bg: C.blue, border: true });
  r += 2;

  // Weekly rollup
  r = sectionHeader(cf, r, 'RINGKASAN MINGGUAN', '3.');

  const weekly: Record<string, { income: number; expense: number; net: number }> = {};
  for (const day of sortedDaily) {
    const d = new Date(day.date);
    const dayNum = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dayNum);
    const weekKey = d.toISOString().split('T')[0];
    if (!weekly[weekKey]) weekly[weekKey] = { income: 0, expense: 0, net: 0 };
    weekly[weekKey].income += day.income;
    weekly[weekKey].expense += day.expense;
    weekly[weekKey].net += day.net;
  }

  setCell(cf, `A${r}`, 'Minggu', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
  setCell(cf, `B${r}`, 'Pemasukan', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
  setCell(cf, `C${r}`, 'Pengeluaran', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
  setCell(cf, `D${r}`, 'Net', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
  setCell(cf, `E${r}`, 'Status', { bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true });
  r++;

  Object.keys(weekly).sort().forEach((weekKey) => {
    const w = weekly[weekKey];
    setCell(cf, `A${r}`, `Minggu ${fmtDateID(weekKey)}`, { size: 10, border: true });
    setCell(cf, `B${r}`, w.income, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(cf, `C${r}`, w.expense, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(cf, `D${r}`, w.net, {
      size: 10, align: 'right', border: true, numFmt: numFmt(cur), bold: true,
      color: w.net >= 0 ? C.emerald : C.rose,
    });
    setCell(cf, `E${r}`, w.net >= 0 ? 'SURPLUS' : 'DEFISIT', {
      size: 9, align: 'center', border: true, bold: true,
      color: w.net >= 0 ? C.emerald : C.rose,
      bg: w.net >= 0 ? C.emeraldBg : C.roseBg,
    });
    r++;
  });

  r += 2;
  cf.mergeCells(`A${r}:F${r}`);
  setCell(cf, `A${r}`, 'Generated by Financial AI Engine - Keuanganku v2', {
    size: 8, italic: true, color: C.gray400, align: 'center',
  });

  // ============================================================
  // SHEET 3: CATEGORY DEEP-DIVE
  // ============================================================
  const cat = workbook.addWorksheet('Category Deep-Dive', {
    properties: { tabColor: { argb: C.indigo } },
    views: [{ showGridLines: false }],
  });

  cat.columns = [
    { width: 6 },
    { width: 28 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 22 },
  ];

  r = titleBanner(cat, 1, 'ANALISIS PER KATEGORI', 'Ranking, kontribusi, dan rata-rata pengeluaran per kategori');
  r += 1;

  const catSection = (kind: 'expense' | 'income', title: string, icon: string) => {
    r = sectionHeader(cat, r, title, icon);

    const items = data.categoryBreakdowns
      .filter((c) => c.kind === kind)
      .sort((a, b) => b.total_amount - a.total_amount);

    if (items.length === 0) {
      setCell(cat, `B${r}`, `Tidak ada data ${kind === 'expense' ? 'pengeluaran' : 'pemasukan'} untuk periode ini.`, {
        size: 10, italic: true, color: C.gray600,
      });
      r += 2;
      return;
    }

    ['Rank', 'Kategori', 'Jml Trans', 'Total', '% Kontribusi', 'Rata-rata', 'Visual'].forEach((h, i) => {
      setCell(cat, `${String.fromCharCode(65 + i)}${r}`, h, {
        bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true,
      });
    });
    r++;

    items.forEach((item, idx) => {
      const isTop3 = idx < 3;
      const rankLabel = idx === 0 ? '1' : idx === 1 ? '2' : idx === 2 ? '3' : `${idx + 1}`;

      setCell(cat, `A${r}`, rankLabel, {
        bold: isTop3, size: 11, align: 'center', border: true,
        color: isTop3 ? C.white : C.gray600,
        bg: isTop3 ? (kind === 'expense' ? C.rose : C.emerald) : C.gray100,
      });
      setCell(cat, `B${r}`, item.category_name, {
        bold: isTop3, size: 10, border: true,
        bg: isTop3 ? (kind === 'expense' ? C.roseBg : C.emeraldBg) : undefined,
      });
      setCell(cat, `C${r}`, item.count, { size: 10, align: 'center', border: true });
      setCell(cat, `D${r}`, item.total_amount, {
        size: 10, align: 'right', border: true, numFmt: numFmt(cur), bold: isTop3,
        bg: isTop3 ? (kind === 'expense' ? C.roseBg : C.emeraldBg) : undefined,
      });
      setCell(cat, `E${r}`, item.percentage, {
        size: 10, align: 'center', border: true, bold: isTop3, numFmt: '0.0"%"',
        bg: isTop3 ? (kind === 'expense' ? C.roseBg : C.emeraldBg) : undefined,
      });
      setCell(cat, `F${r}`, item.count > 0 ? item.total_amount / item.count : 0, {
        size: 10, align: 'right', border: true, numFmt: numFmt(cur),
      });
      // Simple bar visualization using repeated blocks
      const barLen = Math.max(1, Math.round(item.percentage / 5));
      setCell(cat, `G${r}`, '='.repeat(barLen), {
        size: 8, color: kind === 'expense' ? C.rose : C.emerald, border: true,
        bg: kind === 'expense' ? C.roseBg : C.emeraldBg,
      });
      setCell(cat, `H${r}`, item.percentage >= 20 ? 'Kategori dominan' : item.percentage >= 10 ? 'Signifikan' : 'Minor', {
        size: 9, italic: true, color: C.gray600, border: true,
      });
      r++;
    });

    // Subtotal row
    const subTotal = items.reduce((s, i) => s + i.total_amount, 0);
    const subCount = items.reduce((s, i) => s + i.count, 0);
    setCell(cat, `A${r}`, '', { bg: C.blue, border: true });
    setCell(cat, `B${r}`, 'TOTAL', { bold: true, size: 10, color: C.white, bg: C.blue, border: true });
    setCell(cat, `C${r}`, subCount, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'center', border: true });
    setCell(cat, `D${r}`, subTotal, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(cat, `E${r}`, 100, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'center', border: true, numFmt: '0.0"%"' });
    setCell(cat, `F${r}`, subCount > 0 ? subTotal / subCount : 0, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(cat, `G${r}`, '', { bg: C.blue, border: true });
    setCell(cat, `H${r}`, '', { bg: C.blue, border: true });
    r += 2;
  };

  catSection('expense', 'TOP KATEGORI PENGELUARAN', '1.');
  r += 1;
  catSection('income', 'SUMBER PEMASUKAN', '2.');

  r += 1;
  cat.mergeCells(`A${r}:H${r}`);
  setCell(cat, `A${r}`, 'Generated by Financial AI Engine - Keuanganku v2', {
    size: 8, italic: true, color: C.gray400, align: 'center',
  });

  // ============================================================
  // SHEET 4: WALLET HEALTH
  // ============================================================
  const wal = workbook.addWorksheet('Wallet Health', {
    properties: { tabColor: { argb: C.emerald } },
    views: [{ showGridLines: false }],
  });

  wal.columns = [
    { width: 24 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
  ];

  r = titleBanner(wal, 1, 'WALLET HEALTH', 'Kesehatan saldo dan distribusi dana antar dompet');
  r += 1;

  r = sectionHeader(wal, r, 'RINGKASAN PER DOMPET', '1.');

  ['Nama Dompet', 'Tipe', 'Saldo Awal', 'Saldo Saat Ini', 'Perubahan', 'Jml Transaksi', '% Distribusi', 'Status'].forEach((h, i) => {
    setCell(wal, `${String.fromCharCode(65 + i)}${r}`, h, {
      bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true,
    });
  });
  r++;

  const totalAllBalance = data.accountSummaries.reduce((s, a) => s + a.current_balance, 0);

  for (const acc of data.accountSummaries) {
    const change = acc.current_balance - acc.initial_balance;
    const distribution = totalAllBalance > 0 ? (acc.current_balance / totalAllBalance) * 100 : 0;
    const typeLabel = acc.type === 'bank' ? 'Bank' : acc.type === 'ewallet' ? 'E-Wallet' : 'Cash';

    setCell(wal, `A${r}`, acc.name, { bold: true, size: 10, border: true });
    setCell(wal, `B${r}`, typeLabel, {
      size: 9, align: 'center', border: true,
      color: acc.type === 'bank' ? C.indigo : acc.type === 'ewallet' ? C.cyan : C.emerald,
      bold: true,
    });
    setCell(wal, `C${r}`, acc.initial_balance, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(wal, `D${r}`, acc.current_balance, { size: 10, align: 'right', border: true, bold: true, numFmt: numFmt(cur) });
    setCell(wal, `E${r}`, change, {
      size: 10, align: 'right', border: true, numFmt: numFmt(cur),
      color: change >= 0 ? C.emerald : C.rose,
    });
    setCell(wal, `F${r}`, acc.transaction_count, { size: 10, align: 'center', border: true });
    setCell(wal, `G${r}`, distribution, { size: 10, align: 'center', border: true, numFmt: '0.0"%"' });
    setCell(wal, `H${r}`,
      acc.current_balance <= 0 ? 'KOSONG - Perlu top up' :
      distribution >= 50 ? 'Dompet utama' :
      acc.current_balance < 50000 ? 'Saldo rendah' : 'Sehat',
      {
        size: 9, align: 'center', border: true, bold: true,
        color: acc.current_balance <= 0 ? C.rose :
               acc.current_balance < 50000 ? C.amber : C.emerald,
        bg: acc.current_balance <= 0 ? C.roseBg :
            acc.current_balance < 50000 ? C.amberBg : C.emeraldBg,
      });
    r++;
  }

  // Total row
  setCell(wal, `A${r}`, 'TOTAL', { bold: true, size: 10, color: C.white, bg: C.blue, border: true });
  setCell(wal, `B${r}`, '', { bg: C.blue, border: true });
  const totalInitial = data.accountSummaries.reduce((s, a) => s + a.initial_balance, 0);
  setCell(wal, `C${r}`, totalInitial, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
  setCell(wal, `D${r}`, totalAllBalance, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
  setCell(wal, `E${r}`, totalAllBalance - totalInitial, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
  const totalTxCount = data.accountSummaries.reduce((s, a) => s + a.transaction_count, 0);
  setCell(wal, `F${r}`, totalTxCount, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'center', border: true });
  setCell(wal, `G${r}`, 100, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'center', border: true, numFmt: '0.0"%"' });
  setCell(wal, `H${r}`, `${data.accountSummaries.length} dompet`, { bold: true, size: 9, color: C.white, bg: C.blue, align: 'center', border: true });
  r += 2;

  wal.mergeCells(`A${r}:H${r}`);
  setCell(wal, `A${r}`, 'Generated by Financial AI Engine - Keuanganku v2', {
    size: 8, italic: true, color: C.gray400, align: 'center',
  });

  // ============================================================
  // SHEET 5: MERCHANT INTELLIGENCE
  // ============================================================
  const mrc = workbook.addWorksheet('Merchant Intelligence', {
    properties: { tabColor: { argb: C.amber } },
    views: [{ showGridLines: false }],
  });

  mrc.columns = [
    { width: 6 },
    { width: 30 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 20 },
  ];

  r = titleBanner(mrc, 1, 'MERCHANT INTELLIGENCE', 'Analisis merchant berdasarkan frekuensi dan total pengeluaran');
  r += 1;

  const expenseMerchants = data.merchantStats.filter((m) => m.total_amount > 0).slice(0, 20);

  if (expenseMerchants.length > 0) {
    r = sectionHeader(mrc, r, 'TOP MERCHANTS (BY TOTAL SPENDING)', '1.');

    ['Rank', 'Merchant', 'Frekuensi', 'Total', 'Rata-rata', 'Terakhir', 'Kategori Dominan'].forEach((h, i) => {
      setCell(mrc, `${String.fromCharCode(65 + i)}${r}`, h, {
        bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true,
      });
    });
    r++;

    expenseMerchants.forEach((m, idx) => {
      const isTop3 = idx < 3;
      setCell(mrc, `A${r}`, `${idx + 1}`, {
        bold: isTop3, size: 11, align: 'center', border: true,
        color: isTop3 ? C.white : C.gray600,
        bg: isTop3 ? C.amber : C.gray100,
      });
      setCell(mrc, `B${r}`, m.merchant, { bold: isTop3, size: 10, border: true });
      setCell(mrc, `C${r}`, `${m.count}x`, { size: 10, align: 'center', border: true });
      setCell(mrc, `D${r}`, m.total_amount, { size: 10, align: 'right', border: true, numFmt: numFmt(cur), bold: isTop3 });
      setCell(mrc, `E${r}`, m.avg_amount, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
      setCell(mrc, `F${r}`, fmtDateID(m.last_seen), { size: 9, align: 'center', border: true });
      setCell(mrc, `G${r}`, m.category_name || '-', { size: 9, italic: true, color: C.gray600, border: true });
      r++;
    });

    const merchantTotal = expenseMerchants.reduce((s, m) => s + m.total_amount, 0);
    setCell(mrc, `A${r}`, '', { bg: C.blue, border: true });
    setCell(mrc, `B${r}`, 'TOTAL', { bold: true, size: 10, color: C.white, bg: C.blue, border: true });
    setCell(mrc, `C${r}`, expenseMerchants.reduce((s, m) => s + m.count, 0), { bold: true, size: 10, color: C.white, bg: C.blue, align: 'center', border: true });
    setCell(mrc, `D${r}`, merchantTotal, { bold: true, size: 10, color: C.white, bg: C.blue, align: 'right', border: true, numFmt: numFmt(cur) });
    setCell(mrc, `E${r}`, '', { bg: C.blue, border: true });
    setCell(mrc, `F${r}`, '', { bg: C.blue, border: true });
    setCell(mrc, `G${r}`, '', { bg: C.blue, border: true });
    r += 2;

    // Frequent merchants (by count)
    r = sectionHeader(mrc, r, 'PALING SERING DIKUNJUNGI (BY FREQUENCY)', '2.');

    const frequentMerchants = [...data.merchantStats].sort((a, b) => b.count - a.count).slice(0, 10);

    ['Rank', 'Merchant', 'Frekuensi', 'Total', 'Rata-rata', 'Terakhir', 'Kategori Dominan'].forEach((h, i) => {
      setCell(mrc, `${String.fromCharCode(65 + i)}${r}`, h, {
        bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true,
      });
    });
    r++;

    frequentMerchants.forEach((m, idx) => {
      setCell(mrc, `A${r}`, `${idx + 1}`, { bold: idx < 3, size: 10, align: 'center', border: true });
      setCell(mrc, `B${r}`, m.merchant, { size: 10, border: true, bold: idx < 3 });
      setCell(mrc, `C${r}`, `${m.count}x`, {
        size: 10, align: 'center', border: true, bold: true,
        color: C.amber, bg: idx < 3 ? C.amberBg : undefined,
      });
      setCell(mrc, `D${r}`, m.total_amount, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
      setCell(mrc, `E${r}`, m.avg_amount, { size: 10, align: 'right', border: true, numFmt: numFmt(cur) });
      setCell(mrc, `F${r}`, fmtDateID(m.last_seen), { size: 9, align: 'center', border: true });
      setCell(mrc, `G${r}`, m.category_name || '-', { size: 9, italic: true, color: C.gray600, border: true });
      r++;
    });
  } else {
    setCell(mrc, `B${r}`, 'Tidak ada data merchant untuk periode ini.', { size: 10, italic: true, color: C.gray600 });
  }

  r += 2;
  mrc.mergeCells(`A${r}:G${r}`);
  setCell(mrc, `A${r}`, 'Generated by Financial AI Engine - Keuanganku v2', {
    size: 8, italic: true, color: C.gray400, align: 'center',
  });

  // ============================================================
  // SHEET 6: TRANSAKSI LENGKAP
  // ============================================================
  const tx = workbook.addWorksheet('Transaksi Lengkap', {
    properties: { tabColor: { argb: C.rose } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  tx.columns = [
    { width: 6 },
    { width: 14 },
    { width: 12 },
    { width: 30 },
    { width: 20 },
    { width: 18 },
    { width: 12 },
    { width: 16 },
  ];

  // Header rows
  tx.mergeCells('A1:H1');
  setCell(tx, 'A1', 'RIWAYAT TRANSAKSI LENGKAP', {
    bold: true, size: 14, color: C.white, bg: C.navyDark, align: 'center',
  });
  tx.getRow(1).height = 30;

  tx.mergeCells('A2:H2');
  setCell(tx, 'A2',
    `${totalCount.toLocaleString('id-ID')} transaksi | Periode: ${data.startDate ? fmtDateID(data.startDate) : 'Awal'} s/d ${data.endDate ? fmtDateID(data.endDate) : 'Sekarang'} | Filter: ${data.filterType === 'all' ? 'Semua' : data.filterType === 'income' ? 'Pemasukan' : 'Pengeluaran'}`,
    { size: 9, italic: true, color: C.gray400, bg: C.navyDark, align: 'center' });

  if (data.truncated) {
    tx.mergeCells('A3:H3');
    setCell(tx, 'A3',
      `PERHATIAN: Menampilkan ${data.transactions.length.toLocaleString('id-ID')} dari ${data.totalAvailable.toLocaleString('id-ID')} transaksi (dibatasi untuk performa). Gunakan filter tanggal untuk data lengkap.`,
      { size: 9, bold: true, color: C.rose, bg: C.roseBg, align: 'center' });
  }

  const txHeaderRow = 4;
  ['No', 'Tanggal', 'Tipe', 'Merchant / Deskripsi', 'Kategori', 'Dompet', 'Sumber', 'Nominal'].forEach((h, i) => {
    setCell(tx, `${String.fromCharCode(65 + i)}${txHeaderRow}`, h, {
      bold: true, size: 10, color: C.white, bg: C.navy, align: 'center', border: true,
    });
  });
  tx.getRow(txHeaderRow).height = 22;

  // Data rows
  const maxTx = Math.min(data.transactions.length, 10000);
  for (let i = 0; i < maxTx; i++) {
    const t = data.transactions[i];
    const row = txHeaderRow + 1 + i;
    const isIncome = t.type === 'income';

    tx.getCell(`A${row}`).value = i + 1;
    tx.getCell(`B${row}`).value = fmtDateID(t.occurred_at);
    tx.getCell(`C${row}`).value = isIncome ? 'PEMASUKAN' : 'PENGELUARAN';
    tx.getCell(`D${row}`).value = t.merchant || t.description || '-';
    tx.getCell(`E${row}`).value = t.category_name || 'Lainnya';
    tx.getCell(`F${row}`).value = t.account_name || '-';
    tx.getCell(`G${row}`).value = t.source === 'scan' ? 'Scan OCR' : 'Manual';
    tx.getCell(`H${row}`).value = isIncome ? t.amount : -t.amount;

    // Styling
    for (let col = 1; col <= 8; col++) {
      const cell = tx.getCell(row, col);
      cell.font = { name: FONT.name, size: 9, color: { argb: C.navyDark } };
      cell.border = thinBorder(C.gray200);
      cell.alignment = {
        horizontal: col === 1 ? 'center' : col === 8 ? 'right' : 'left',
        vertical: 'middle',
      };
    }

    tx.getCell(`C${row}`).font = {
      name: FONT.name, size: 9, bold: true,
      color: { argb: isIncome ? C.emerald : C.rose },
    };
    tx.getCell(`C${row}`).fill = fill(isIncome ? C.emeraldBg : C.roseBg);
    tx.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle' };

    tx.getCell(`H${row}`).numFmt = numFmt(cur);
    tx.getCell(`H${row}`).font = {
      name: FONT.name, size: 10, bold: true,
      color: { argb: isIncome ? C.emerald : C.navyDark },
    };

    // Zebra striping
    if (i % 2 === 1) {
      for (let col = 1; col <= 8; col++) {
        if (col !== 3) {
          tx.getCell(row, col).fill = fill(C.gray100);
        }
      }
    }
  }

  // Auto filter
  if (maxTx > 0) {
    tx.autoFilter = {
      from: { row: txHeaderRow, column: 1 },
      to: { row: txHeaderRow + maxTx, column: 8 },
    };
  }

  return workbook;
}
