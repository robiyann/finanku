'use client';

import React from 'react';
import { formatMoney } from '@finance/core';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, Plus } from 'lucide-react';

interface DailyCashflow {
  date: string;
  net: number;
}

interface HeroBalanceCardProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  currency: string;
  dailyCashflows?: DailyCashflow[];
  onOpenAddTransaction?: () => void;
}

export function HeroBalanceCard({
  totalBalance,
  totalIncome,
  totalExpense,
  currency,
  dailyCashflows = [],
  onOpenAddTransaction,
}: HeroBalanceCardProps) {
  const netCashflow = totalIncome - totalExpense;

  // Build dynamic 30-day balance history
  const today = new Date();
  const days: { dateStr: string; label: string }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
    days.push({ dateStr, label });
  }

  // Create a map of date -> net_cashflow
  const cashflowMap = new Map<string, number>();
  dailyCashflows.forEach((item) => {
    cashflowMap.set(item.date, item.net);
  });

  // Calculate daily balances stepping backward from totalBalance today
  const dailyBalances: number[] = new Array(30);

  let runningBalance = totalBalance;
  for (let i = 29; i >= 0; i--) {
    dailyBalances[i] = runningBalance;
    const netOnDay = cashflowMap.get(days[i].dateStr) || 0;
    runningBalance -= netOnDay;
  }

  // Calculate SVG curve coordinates (viewBox: 0 0 300 80)
  const minBal = Math.min(...dailyBalances);
  const maxBal = Math.max(...dailyBalances);
  const range = maxBal - minBal;

  const points = dailyBalances.map((bal, idx) => {
    const x = (idx / 29) * 300;
    const y = range === 0 ? 40 : 70 - ((bal - minBal) / range) * 55;
    return { x, y };
  });

  // Construct smooth cubic bezier path
  let linePath = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    linePath += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
  }

  const fillPath = `${linePath} L 300,80 L 0,80 Z`;
  const lastPoint = points[points.length - 1];

  return (
    <div className="glass-card glow-blue p-5 sm:p-6 relative overflow-hidden">
      {/* Background Subtle Gradient Shape */}
      <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Total Balance */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Saldo Tergabung</span>
            </div>

            {/* Primary Action Button on Balance Card */}
            {onOpenAddTransaction && (
              <button
                onClick={onOpenAddTransaction}
                className="flex items-center space-x-1.5 py-2 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Transaksi</span>
              </button>
            )}
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-[family-name:var(--font-outfit)]">
              {formatMoney(totalBalance, currency)}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" /> +12.4%
              </span>
              <span>dibandingkan bulan lalu</span>
            </p>
          </div>

          {/* Sub Stats Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Pemasukan</span>
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 font-[family-name:var(--font-outfit)]">
                {formatMoney(totalIncome, currency)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Pengeluaran</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-rose-400 font-[family-name:var(--font-outfit)]">
                {formatMoney(totalExpense, currency)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Kas Bersih</span>
                <span className="text-blue-400 font-semibold">Net</span>
              </div>
              <p className={`text-xs sm:text-sm font-bold font-[family-name:var(--font-outfit)] ${netCashflow >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {formatMoney(netCashflow, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic 30-day Sparkline SVG Curve */}
        <div className="lg:col-span-5 h-full flex flex-col justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Tren Saldo 30 Hari</span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time Data</span>
            </span>
          </div>

          <div className="my-3 h-24 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 300 80">
              <defs>
                <linearGradient id="gradientSparkline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Under Curve */}
              <path d={fillPath} fill="url(#gradientSparkline)" />

              {/* Smooth Stroke Curve */}
              <path
                d={linePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Pulse Marker on Current Day */}
              <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#3b82f6" className="animate-ping opacity-75" />
              <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#60a5fa" />
            </svg>
          </div>

          {/* Dynamic Date Labels */}
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{days[0].label}</span>
            <span>{days[15].label}</span>
            <span className="text-slate-300 font-semibold">Hari Ini</span>
          </div>
        </div>
      </div>
    </div>
  );
}
