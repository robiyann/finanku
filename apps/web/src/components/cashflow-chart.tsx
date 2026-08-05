'use client';

import React, { useState } from 'react';
import { formatMoney } from '@finance/core';
import { BarChart3, Inbox } from 'lucide-react';

interface MonthlyCashflow {
  month: string;
  income: number;
  expense: number;
}

interface CashflowChartProps {
  currency: string;
  initialData?: MonthlyCashflow[];
}

export function CashflowChart({ currency, initialData = [] }: CashflowChartProps) {
  const [activeTab, setActiveTab] = useState<'6m' | '3m'>('6m');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const data = initialData;
  const hasData = data.length > 0 && data.some(d => d.income > 0 || d.expense > 0);
  const maxVal = hasData ? Math.max(...data.flatMap(d => [d.income, d.expense])) * 1.15 : 1;

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Arus Kas Per Bulan</h3>
            <p className="text-[11px] text-slate-400">Pemasukan vs Pengeluaran 6 Bulan Terakhir</p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('6m')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === '6m' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            6 Bulan
          </button>
          <button
            onClick={() => setActiveTab('3m')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === '3m' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3 Bulan
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 text-xs text-slate-400 pt-1">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-md bg-blue-500"></span>
          <span>Pemasukan</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-md bg-slate-700"></span>
          <span>Pengeluaran</span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-48 flex flex-col items-center justify-center space-y-2 border-b border-slate-800/80 text-center">
          <div className="p-3 rounded-full bg-slate-800 text-slate-500">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400 font-semibold">Belum Ada Data Arus Kas</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Bar chart arus kas akan muncul secara otomatis seiring dengan transaksi bulanan kamu.
          </p>
        </div>
      ) : (
        /* Bars Container */
        <div className="h-48 pt-4 flex items-end justify-between gap-3 relative border-b border-slate-800/80">
          {data.map((item) => {
            const incomeHeight = (item.income / maxVal) * 100;
            const expenseHeight = (item.expense / maxVal) * 100;
            const isHovered = hoveredMonth === item.month;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                onMouseEnter={() => setHoveredMonth(item.month)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-14 z-20 glass-card p-2 rounded-lg text-[10px] space-y-1 shadow-xl border border-blue-500/30 whitespace-nowrap animate-fade-in">
                    <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{item.month}</div>
                    <div className="text-emerald-400">Masuk: {formatMoney(item.income, currency)}</div>
                    <div className="text-rose-400">Keluar: {formatMoney(item.expense, currency)}</div>
                  </div>
                )}

                {/* Pair Bars */}
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  <div
                    className="w-1/2 max-w-[18px] bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                    style={{ height: `${incomeHeight}%` }}
                  ></div>
                  <div
                    className="w-1/2 max-w-[18px] bg-slate-700 rounded-t-md transition-all duration-300 group-hover:bg-slate-600"
                    style={{ height: `${expenseHeight}%` }}
                  ></div>
                </div>

                <span className={`text-[11px] font-medium transition-colors ${isHovered ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
