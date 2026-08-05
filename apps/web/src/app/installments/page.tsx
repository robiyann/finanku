'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ReceiptUploadModal } from '@/components/receipt-upload-modal';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { AddInstallmentModal } from '@/components/add-installment-modal';
import { PayInstallmentModal } from '@/components/pay-installment-modal';
import { formatMoney } from '@finance/core';
import { getBrandIconUrl } from '@/lib/icons';
import { CalendarClock, Inbox, Plus, CheckCircle2, AlertTriangle, Trash2, CreditCard, RefreshCw } from 'lucide-react';

interface Installment {
  id: string;
  name: string;
  lender?: string;
  amount: number;
  due_day: number;
  months_total?: number;
  months_paid: number;
  start_month?: string;
  auto_log: boolean;
  active: boolean;
}

export default function InstallmentsPage() {
  const [currency, setCurrency] = useState('IDR');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [payModalInstallment, setPayModalInstallment] = useState<Installment | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInstallments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/installments');
      const data = await res.json();
      if (data.ok && data.installments) {
        setInstallments(data.installments);
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server untuk memuat cicilan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah kamu yakin ingin menghapus cicilan "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/installments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.ok) {
        fetchInstallments();
      } else {
        alert(data.error || 'Gagal menghapus cicilan.');
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus cicilan.');
    } finally {
      setDeletingId(null);
    }
  };

  const currentDay = new Date().getDate();

  const totalMonthlyDebt = installments.reduce((sum, item) => {
    const isCompleted = item.months_total && item.months_paid >= item.months_total;
    return isCompleted ? sum : sum + Number(item.amount || 0);
  }, 0);

  return (
    <div className="min-h-screen flex bg-[#070a12] text-slate-100 font-sans">
      <Sidebar
        onOpenScanModal={() => setIsScanModalOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-w-0">
        <Topbar
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          onOpenQuickAdd={() => setIsAddTxModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Cicilan &amp; Angsuran</h1>
                <p className="text-xs text-slate-400">Pantau tagihan berulang &amp; kelola status pembayaran cicilan kamu</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddInstallmentOpen(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cicilan</span>
            </button>
          </div>

          {/* Total Monthly Debt Summary Card */}
          <div className="glass-card p-6 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-rose-950/30 border-rose-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <CreditCard className="w-32 h-32 text-rose-400" />
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-xs font-medium text-slate-400">Total Tagihan Cicilan Bulan Ini</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-[family-name:var(--font-outfit)] tracking-tight">
                {formatMoney(totalMonthlyDebt, currency)}
              </p>
              <p className="text-xs text-rose-400 font-semibold pt-1">
                {installments.length > 0
                  ? `${installments.length} cicilan terdaftar aktif`
                  : 'Belum ada cicilan terdaftar'}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={fetchInstallments} className="underline text-xs hover:text-rose-300">Coba Lagi</button>
            </div>
          )}

          {/* Installments List Grid */}
          <div className="space-y-4">
            {loading ? (
              <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Memuat data cicilan kamu...</p>
              </div>
            ) : installments.length === 0 ? (
              <div className="glass-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                  <Inbox className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-bold text-slate-200">Belum Ada Cicilan Terdaftar</p>
                  <p className="text-xs text-slate-400">
                    Tambahkan cicilan (KPR, Kendaraan, Gadget, atau PayLater) untuk mengaktifkan pelacakan jatuh tempo otomatis.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddInstallmentOpen(true)}
                  className="mt-3 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-bold hover:scale-[1.01] transition-all shadow-lg shadow-rose-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Cicilan Pertama</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installments.map((inst) => {
                  const lenderLogo = getBrandIconUrl(inst.lender || inst.name);
                  const isCompleted = Boolean(inst.months_total && inst.months_paid >= inst.months_total);
                  const daysDiff = inst.due_day - currentDay;
                  const isDueSoon = !isCompleted && daysDiff >= 0 && daysDiff <= 5;
                  const isOverdue = !isCompleted && daysDiff < 0;

                  const progressPct = inst.months_total
                    ? Math.min(100, Math.round((inst.months_paid / inst.months_total) * 100))
                    : 0;

                  return (
                    <div
                      key={inst.id}
                      className="glass-card p-5 space-y-4 relative border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Card Top Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl border border-slate-700/80 flex items-center justify-center p-1.5 shrink-0 bg-white shadow-sm">
                              {lenderLogo ? (
                                <img src={lenderLogo} alt="logo" className="w-full h-full object-contain" />
                              ) : (
                                <CreditCard className="w-5 h-5 text-slate-700" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-white truncate">{inst.name}</h3>
                              <p className="text-[11px] text-slate-400 truncate">{inst.lender || 'Cicilan Mandiri'}</p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {isCompleted ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Lunas
                            </span>
                          ) : isDueSoon ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold shrink-0 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Tempo H-{daysDiff === 0 ? 'Ini' : daysDiff}
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold shrink-0">
                              Tempo tgl {inst.due_day}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold shrink-0">
                              Tempo tgl {inst.due_day}
                            </span>
                          )}
                        </div>

                        {/* Amount & Tenor */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-slate-400">Tagihan per Bulan</p>
                            <p className="text-base font-extrabold text-white font-[family-name:var(--font-outfit)]">
                              {formatMoney(inst.amount, currency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">Progress Tenor</p>
                            <p className="text-xs font-bold text-slate-200">
                              {inst.months_paid} {inst.months_total ? `/ ${inst.months_total} Bulan` : 'Bulan'}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar (if months_total exists) */}
                        {inst.months_total && inst.months_total > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>Mulai</span>
                              <span>{progressPct}% Terbayar</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleDelete(inst.id, inst.name)}
                          disabled={deletingId === inst.id}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                          title="Hapus Cicilan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPayModalInstallment(inst)}
                          disabled={isCompleted}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                            isCompleted
                              ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 hover:scale-[1.01]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'Sudah Lunas' : 'Bayar Cicilan Bulan Ini'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ReceiptUploadModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} currency={currency} />
      <AddTransactionModal isOpen={isAddTxModalOpen} onClose={() => setIsAddTxModalOpen(false)} currency={currency} />
      <AddInstallmentModal
        isOpen={isAddInstallmentOpen}
        onClose={() => setIsAddInstallmentOpen(false)}
        onSuccess={() => fetchInstallments()}
        currency={currency}
      />
      <PayInstallmentModal
        isOpen={Boolean(payModalInstallment)}
        onClose={() => setPayModalInstallment(null)}
        onSuccess={() => fetchInstallments()}
        currency={currency}
        installment={payModalInstallment}
      />
    </div>
  );
}
