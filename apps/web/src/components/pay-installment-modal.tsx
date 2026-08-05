'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, RefreshCw, AlertCircle, Wallet } from 'lucide-react';
import { formatMoney } from '@finance/core';
import { getBrandIconUrl } from '@/lib/icons';

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
}

interface Installment {
  id: string;
  name: string;
  lender?: string;
  amount: number;
  due_day: number;
  months_total?: number;
  months_paid: number;
}

interface PayInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency: string;
  installment: Installment | null;
}

export function PayInstallmentModal({ isOpen, onClose, onSuccess, currency, installment }: PayInstallmentModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setLoadingAccounts(true);
      fetch('/api/wallets')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.accounts) {
            setAccounts(data.accounts);
            if (data.accounts.length > 0) {
              const def = data.accounts.find((a: any) => a.is_default) || data.accounts[0];
              setAccountId(def.id);
            }
          }
        })
        .catch(() => setErrorMsg('Gagal memuat daftar dompet.'))
        .finally(() => setLoadingAccounts(false));
    }
  }, [isOpen]);

  if (!isOpen || !installment) return null;

  const nextMonthNum = (installment.months_paid || 0) + 1;
  const isFinalMonth = installment.months_total ? nextMonthNum >= installment.months_total : false;
  const lenderLogo = getBrandIconUrl(installment.lender || installment.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accountId) {
      setErrorMsg('Pilih dompet sumber dana untuk pembayaran.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/installments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: installment.id,
          action: 'pay',
          account_id: accountId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal mencatat pembayaran cicilan.');
      }

      onClose();
      if (onSuccess) onSuccess();

    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat membayar cicilan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 space-y-4 relative border border-slate-700 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl border border-emerald-500/30 flex items-center justify-center p-2 shrink-0 bg-white shadow-md">
            {lenderLogo ? (
              <img src={lenderLogo} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Bayar Cicilan Bulan Ini</h3>
            <p className="text-xs text-emerald-400 font-semibold">{installment.name}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Installment Summary */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>Pembayaran Untuk</span>
            <span className="font-bold text-white">
              Bulan ke-{nextMonthNum} {installment.months_total ? `dari ${installment.months_total}` : ''}
              {isFinalMonth ? ' 🎉 (Cicilan Terakhir)' : ''}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Nominal Tagihan</span>
            <span className="text-lg font-extrabold text-white font-[family-name:var(--font-outfit)]">
              {formatMoney(installment.amount, currency)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Wallet Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Pilih Dompet / Sumber Dana</label>
            {loadingAccounts ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500">
                Memuat daftar dompet...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                Belum ada dompet. Tambahkan dompet terlebih dahulu.
              </div>
            ) : (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()}) — Saldo: {formatMoney(Number(acc.current_balance || 0), currency)}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-slate-500">
              Transaksi pengeluaran sebesar {formatMoney(installment.amount, currency)} akan otomatis dicatat pada dompet yang dipilih.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || accounts.length === 0}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mencatat Pembayaran...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Bayar {formatMoney(installment.amount, currency)}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
