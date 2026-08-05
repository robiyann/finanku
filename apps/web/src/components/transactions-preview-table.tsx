'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '@finance/core';
import { getBrandIconUrl } from '@/lib/icons';
import Link from 'next/link';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ScanLine,
  Eye,
  Calendar,
  Store,
  Wallet,
  X,
  Inbox,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Loader2,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface TransactionItem {
  id: string;
  merchant: string | null;
  category_name: string | null;
  type: 'income' | 'expense';
  amount: number;
  account_name: string | null;
  account_color: string | null;
  occurred_at: string;
  source: string;
  description: string | null;
}

interface Summary {
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  total_count: number;
}

interface TransactionsPreviewTableProps {
  currency: string;
  limit?: number;
  isOverview?: boolean;
}

export function TransactionsPreviewTable({ currency, limit = 10, isOverview = false }: TransactionsPreviewTableProps) {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchTransactions = async (resetOffset = true) => {
    const currentOffset = resetOffset ? 0 : offset;
    if (resetOffset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const fetchLimit = isOverview ? 10 : limit;
      const params = new URLSearchParams({
        limit: String(fetchLimit),
        offset: String(currentOffset),
      });

      if (filterType !== 'all') params.set('type', filterType);

      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengambil data transaksi.');
      }

      const data = await res.json();
      const newItems = data.transactions || [];

      if (resetOffset) {
        setTransactions(newItems);
      } else {
        setTransactions((prev) => [...prev, ...newItems]);
      }

      setSummary(data.summary || null);

      if (isOverview) {
        setHasMore(false);
      } else {
        setHasMore(newItems.length === fetchLimit && (currentOffset + newItems.length < (data.summary?.total_count || 0)));
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, isOverview]);

  const handleLoadMore = () => {
    const nextOffset = offset + (isOverview ? 10 : limit);
    setOffset(nextOffset);
    // Fetch next batch
    fetchTransactions(false);
  };

  // Export handler
  const handleExportExcel = async (filter: 'all' | 'income' | 'expense', startDate?: string, endDate?: string) => {
    setIsDownloading(true);
    setShowExportMenu(false);
    
    try {
      const params = new URLSearchParams({
        type: filter,
      });
      
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      
      const response = await fetch(`/api/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Keuanganku_Laporan_${filter}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export Failed]', err);
      alert('Gagal mengunduh laporan. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards (Only shown on full Transactions Page, not in Overview) */}
      {!isOverview && summary && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4 space-y-1 border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Total Pemasukan</span>
            </div>
            <p className="text-lg font-extrabold text-emerald-400 font-[family-name:var(--font-outfit)]">
              +{formatMoney(summary.total_income, currency)}
            </p>
          </div>
          <div className="glass-card p-4 space-y-1 border-rose-500/20">
            <div className="flex items-center gap-1.5 text-rose-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Total Pengeluaran</span>
            </div>
            <p className="text-lg font-extrabold text-rose-400 font-[family-name:var(--font-outfit)]">
              -{formatMoney(summary.total_expense, currency)}
            </p>
          </div>
          <div className={`glass-card p-4 space-y-1 ${summary.net_cashflow >= 0 ? 'border-blue-500/20' : 'border-rose-500/20'}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Net Cashflow</span>
            <p className={`text-lg font-extrabold font-[family-name:var(--font-outfit)] ${summary.net_cashflow >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {summary.net_cashflow >= 0 ? '+' : ''}{formatMoney(summary.net_cashflow, currency)}
            </p>
          </div>
        </div>
      )}

      <div className="glass-card p-4 sm:p-6 space-y-4 border border-slate-800">
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {isOverview ? 'Transaksi Terbaru' : 'Daftar Riwayat Transaksi'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {loading ? 'Memuat...' : `${summary?.total_count ?? transactions.length} transaksi tercatat`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Button Dropdown */}
            {!isOverview && (
              <div className="relative export-menu-container">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={loading || isDownloading}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all disabled:opacity-50 ${
                    isDownloading ? 'animate-pulse' : ''
                  }`}
                  title="Export ke Excel"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span className="text-xs font-semibold">Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold hidden sm:inline">Export Excel</span>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    </>
                  )}
                </button>

                {/* Export Menu Dropdown */}
                {showExportMenu && !isDownloading && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-white">Pilih Filter Export</p>
                      <p className="text-[10px] text-slate-500">Data akan di-export sesuai pilihan</p>
                    </div>
                    
                    {/* All Transactions */}
                    <button
                      onClick={() => handleExportExcel('all')}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Semua Transaksi</p>
                          <p className="text-[10px] text-slate-500">Export semua data dengan filter aktif</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    </button>

                    {/* Income Only */}
                    <button
                      onClick={() => handleExportExcel('income')}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Hanya Pemasukan</p>
                          <p className="text-[10px] text-slate-500">Filter: pemasukan saja</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    </button>

                    {/* Expense Only */}
                    <button
                      onClick={() => handleExportExcel('expense')}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Hanya Pengeluaran</p>
                          <p className="text-[10px] text-slate-500">Filter: pengeluaran saja</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    </button>

                    {/* Info Footer */}
                    <div className="px-3 py-2 bg-slate-800/50 rounded-b-xl">
                      <p className="text-[10px] text-slate-400">📊 Output:</p>
                      <ul className="text-[9px] text-slate-500 space-y-0.5 mt-1">
                        <li>✓ Dashboard Ringkasan KPI</li>
                        <li>✓ Detail Transaksi Lengkap</li>
                        <li>✓ Analisis Per Kategori</li>
                        <li>✓ Rekapitulasi Per Dompet</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchTransactions(true)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Filter Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Pemasukan
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterType === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Pengeluaran
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-32 bg-slate-800 rounded" />
                  <div className="h-2 w-20 bg-slate-800/60 rounded" />
                </div>
                <div className="h-3 w-24 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Table or Empty State */}
        {!loading && transactions.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3 bg-slate-900/30 rounded-2xl border border-slate-800/60 my-2">
            <div className="p-3.5 rounded-full bg-slate-800/80 text-slate-500">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-bold text-slate-300">Belum Ada Transaksi</p>
              <p className="text-xs text-slate-500">
                {filterType === 'all'
                  ? 'Semua transaksi baru yang di-scan atau diinput manual akan muncul secara otomatis di sini.'
                  : filterType === 'income'
                  ? 'Belum ada transaksi pemasukan yang tercatat.'
                  : 'Belum ada transaksi pengeluaran yang tercatat.'}
              </p>
            </div>
          </div>
        ) : !loading && (
          <div className="space-y-3">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0c101c] z-10">
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Merchant / Deskripsi</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Sumber Dana</th>
                    <th className="py-3 px-3">Sumber Input</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3 text-right">Nominal</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.map((tx) => {
                    const brandIconUrl = getBrandIconUrl(tx.merchant || tx.category_name || tx.account_name);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors group">
                        <td className="py-3 px-3 font-semibold text-slate-200 min-w-[160px]">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl border flex items-center justify-center p-1 shrink-0 bg-slate-900 border-slate-800">
                              {brandIconUrl ? (
                                <img src={brandIconUrl} alt={tx.merchant || 'logo'} className="w-full h-full object-contain" />
                              ) : (
                                <div className={`w-full h-full rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {tx.type === 'income' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="block font-semibold text-slate-200">
                                {tx.merchant || tx.description || 'Transaksi'}
                              </span>
                              {tx.description && tx.merchant && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">{tx.description}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium text-[11px]">
                            {tx.category_name || 'Lainnya'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          <div className="flex items-center space-x-1.5">
                            <Wallet className="w-3 h-3 text-slate-500" />
                            <span>{tx.account_name || '—'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {tx.source === 'scan' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold">
                              <ScanLine className="w-3 h-3" />
                              <span>Scan OCR</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                              Manual
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{formatDate(tx.occurred_at)}</span>
                          </div>
                        </td>

                        <td className={`py-3 px-3 text-right font-extrabold font-[family-name:var(--font-outfit)] whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {tx.type === 'income' ? '+' : '-'} {formatMoney(tx.amount, currency)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700 transition-all inline-flex items-center gap-1 text-[11px] hover:text-white"
                            title="Detail transaksi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More Button (on full transactions page) */}
            {!isOverview && hasMore && (
              <div className="pt-2 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span>Memuat transaksi lagi...</span>
                    </>
                  ) : (
                    <span>Muat Transaksi Lainnya ({transactions.length} / {summary?.total_count || 0})</span>
                  )}
                </button>
              </div>
            )}

            {/* Overview Footer Link: "Lihat Semua Riwayat Transaksi ➔" */}
            {isOverview && (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Menampilkan 10 transaksi terbaru
                </span>
                <Link
                  href="/transactions"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold transition-all inline-flex items-center gap-1 hover:scale-[1.02]"
                >
                  <span>Lihat Semua Riwayat Transaksi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 space-y-4 relative border border-slate-700 shadow-2xl">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl border ${selectedTx.type === 'income' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'}`}>
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedTx.merchant || selectedTx.description || 'Detail Transaksi'}
                </h3>
                <p className="text-xs text-slate-400 capitalize">{selectedTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Jumlah', value: `${selectedTx.type === 'income' ? '+' : '-'}${formatMoney(selectedTx.amount, currency)}`, highlight: true },
                { label: 'Tanggal', value: formatDate(selectedTx.occurred_at) },
                { label: 'Kategori', value: selectedTx.category_name || 'Lainnya' },
                { label: 'Akun', value: selectedTx.account_name || '—' },
                { label: 'Merchant', value: selectedTx.merchant || '—' },
                { label: 'Deskripsi', value: selectedTx.description || '—' },
                { label: 'Sumber', value: selectedTx.source === 'scan' ? 'Scan OCR' : 'Manual' },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-semibold ${highlight ? (selectedTx.type === 'income' ? 'text-emerald-400' : 'text-slate-200') : 'text-slate-200'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
