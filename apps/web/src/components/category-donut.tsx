'use client';

import React from 'react';
import { formatMoney } from '@finance/core';
import { PieChart, ShoppingBag, Inbox } from 'lucide-react';

interface CategoryItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: any;
}

interface CategoryDonutProps {
  currency: string;
  categories?: CategoryItem[];
}

export function CategoryDonut({ currency, categories = [] }: CategoryDonutProps) {
  const hasData = categories.length > 0 && categories.some(c => c.amount > 0);

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <PieChart className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200">Kategori Pengeluaran</h3>
          <p className="text-[11px] text-slate-400">Pembagian Pengeluaran Bulan Ini</p>
        </div>
      </div>

      {!hasData ? (
        <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-full bg-slate-800 text-slate-500">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400 font-semibold">Belum ada pengeluaran bulan ini</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Grafik kategori pengeluaran akan terbentuk secara otomatis setelah ada transaksi.
          </p>
        </div>
      ) : (
        <>
          {/* SVG Donut Visual */}
          <div className="flex items-center justify-center py-2 relative">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#1e293b" strokeWidth="12" />
              {categories.map((cat, idx) => {
                const dashArray = `${(cat.percentage / 100) * 238} 238`;
                return (
                  <circle
                    key={cat.name}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke={cat.color}
                    strokeWidth="12"
                    strokeDasharray={dashArray}
                    strokeDashoffset="0"
                  />
                );
              })}
            </svg>

            {/* Center Text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Top Kategori</span>
              <span className="text-sm font-extrabold text-blue-400 font-[family-name:var(--font-outfit)]">
                {categories[0]?.percentage || 0}%
              </span>
              <span className="text-[10px] text-slate-300">{categories[0]?.name || '-'}</span>
            </div>
          </div>

          {/* Category Items List */}
          <div className="space-y-2 pt-2">
            {categories.map((cat) => {
              const Icon = cat.icon || ShoppingBag;
              return (
                <div
                  key={cat.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/40 transition-all text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-300 font-medium">{cat.name}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-200 font-[family-name:var(--font-outfit)]">
                      {formatMoney(cat.amount, currency)}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
