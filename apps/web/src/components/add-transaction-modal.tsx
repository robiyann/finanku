'use client';

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { formatMoney, formatLiveCurrencyInput, parseLiveCurrencyInput } from '@finance/core';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency: string;
  initialAccountId?: string;
  initialType?: 'expense' | 'income';
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  currency,
  initialAccountId,
  initialType = 'expense',
}: AddTransactionModalProps) {
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(initialAccountId || '');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0]);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingAccounts(true);
    setErrorMsg(null);
    if (initialType) setType(initialType);

    fetch('/api/wallets')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.accounts) {
          setAccounts(data.accounts);
          if (initialAccountId && data.accounts.some((a: any) => a.id === initialAccountId)) {
            setAccountId(initialAccountId);
          } else if (data.accounts.length > 0) {
            // Default to default account or first account
            const def = data.accounts.find((a: any) => a.is_default) || data.accounts[0];
            setAccountId(def.id);
          }
        }
      })
      .catch(() => {
        setErrorMsg('Gagal memuat daftar dompet.');
      })
      .finally(() => setLoadingAccounts(false));
  }, [isOpen, initialAccountId, initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseLiveCurrencyInput(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Nominal transaksi harus lebih dari 0.');
      return;
    }

    if (!accountId) {
      setErrorMsg('Pilih akun / dompet sumber dana.');
      return;
    }

    setSubmitting(true);

    try {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': requestId,
        },
        body: JSON.stringify({
          type,
          amount: numAmount,
          account_id: accountId,
          merchant: merchant || undefined,
          description: description || undefined,
          occurred_at: occurredAt,
          source: 'manual',
          request_id: requestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal menyimpan transaksi.');
      }

      // Reset form & close
      setAmount('');
      setMerchant('');
      setDescription('');
      onClose();
      if (onSuccess) onSuccess();

    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan transaksi.');
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

        {/* Modal Title */}
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tambah Transaksi Manual</h3>
            <p className="text-xs text-slate-400">Catat pengeluaran atau pemasukan secara manual</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Pemasukan</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Nominal ({currency})</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatLiveCurrencyInput(e.target.value, currency))}
              placeholder={currency === 'IDR' ? 'Contoh: 1.400.000' : 'Contoh: 1,400,000'}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-extrabold text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-[family-name:var(--font-outfit)]"
            />
          </div>

          {/* Wallet / Account Select */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">
              {type === 'income' ? 'Dompet Tujuan / Akun Penerima' : 'Sumber Dana / Akun'}
            </label>
            {loadingAccounts ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500">
                Memuat akun...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                Belum ada dompet. Tambahkan akun dompet terlebih dahulu.
              </div>
            ) : (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()}) — Saldo: {formatMoney(Number(acc.current_balance || 0), currency)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Merchant / Sender */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">
              {type === 'income' ? 'Pengirim / Sumber Pemasukan (Opsional)' : 'Merchant / Penerima (Opsional)'}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'Contoh: PT ABC, Transfer Budi, Project Freelance'
                  : 'Contoh: Indomaret, Starbucks, Token PLN'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description / Note */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Deskripsi / Catatan (Opsional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'Contoh: Gaji Bulanan, Dividen, Reimbursement'
                  : 'Contoh: Beli Kopi & Camilan Sore'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Occurred At Date */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Tanggal Transaksi</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || accounts.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] disabled:opacity-50 ${
              type === 'expense'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/20'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-500/20'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Transaksi</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
