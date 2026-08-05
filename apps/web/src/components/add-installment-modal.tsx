'use client';

import React, { useState } from 'react';
import { X, CalendarClock, RefreshCw, AlertCircle, Check, Edit3 } from 'lucide-react';
import { formatLiveCurrencyInput, parseLiveCurrencyInput } from '@finance/core';
import { getBrandIconUrl, getPresetBrandIcon } from '@/lib/icons';

interface AddInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency: string;
}

const LENDER_PRESETS = [
  { slug: 'kpr', name: 'KPR Rumah', defaultName: 'KPR Rumah' },
  { slug: 'gadget', name: 'Gadget / HP / Laptop', defaultName: 'Cicilan Gadget' },
  { slug: 'pln', name: 'PLN / Listrik', defaultName: 'Tagihan PLN Bulanan' },
  { slug: 'motor', name: 'Cicilan Motor', defaultName: 'Cicilan Motor' },
  { slug: 'mobil', name: 'Cicilan Mobil', defaultName: 'Cicilan Mobil' },
  { slug: 'tiktokpaylater', name: 'TikTok PayLater', defaultName: 'Cicilan TikTok Shop' },
  { slug: 'shopeepay', name: 'SPayLater / Shopee', defaultName: 'Cicilan Shopee' },
  { slug: 'kredivo', name: 'Kredivo', defaultName: 'Cicilan Kredivo' },
  { slug: 'akulaku', name: 'Akulaku', defaultName: 'Cicilan Akulaku' },
  { slug: 'adira', name: 'Adira Finance', defaultName: 'Angsuran Adira' },
  { slug: 'fif', name: 'FIFGROUP', defaultName: 'Cicilan FIFGROUP' },
  { slug: 'acc', name: 'ACC Astra', defaultName: 'Angsuran ACC Astra' },
  { slug: 'indodana', name: 'Indodana', defaultName: 'Cicilan Indodana' },
  { slug: 'lazada', name: 'Lazada PayLater', defaultName: 'Cicilan Lazada' },
  { slug: 'bca', name: 'BCA Finance / KPR', defaultName: 'KPR / Kredit BCA' },
  { slug: 'mandiri', name: 'Mandiri Finance', defaultName: 'Cicilan Mandiri' },
  { slug: 'bri', name: 'BRI / Ceria', defaultName: 'Cicilan BRI Ceria' },
];

export function AddInstallmentModal({ isOpen, onClose, onSuccess, currency }: AddInstallmentModalProps) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [monthsTotal, setMonthsTotal] = useState('12');
  const [monthsPaid, setMonthsPaid] = useState('0');
  const [selectedLenderSlug, setSelectedLenderSlug] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: { slug: string; name: string; defaultName: string }) => {
    setSelectedLenderSlug(preset.slug);
    setLender(preset.name);
    if (!name || name.startsWith('Cicilan') || name.startsWith('Tagihan') || name.startsWith('Angsuran') || name.startsWith('KPR')) {
      setName(preset.defaultName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama cicilan wajib diisi.');
      return;
    }

    const parsedAmount = parseLiveCurrencyInput(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Nominal tagihan per bulan harus lebih dari 0.');
      return;
    }

    const dueDayNum = Number(dueDay);
    if (!dueDayNum || dueDayNum < 1 || dueDayNum > 31) {
      setErrorMsg('Tanggal jatuh tempo harus antara 1 sampai 31.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          lender: lender.trim() || undefined,
          amount: parsedAmount,
          due_day: dueDayNum,
          months_total: monthsTotal ? Number(monthsTotal) : undefined,
          months_paid: monthsPaid ? Number(monthsPaid) : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal menambahkan cicilan.');
      }

      // Reset & Close
      setName('');
      setLender('');
      setAmount('');
      setDueDay('10');
      setMonthsTotal('12');
      setMonthsPaid('0');
      setSelectedLenderSlug(null);
      onClose();
      if (onSuccess) onSuccess();

    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menambahkan cicilan.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeLenderIconUrl = selectedLenderSlug
    ? getPresetBrandIcon(selectedLenderSlug)
    : getBrandIconUrl(lender || name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 space-y-4 relative border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl border border-rose-500/30 flex items-center justify-center p-2 shrink-0 bg-white shadow-md">
            {activeLenderIconUrl ? (
              <img src={activeLenderIconUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <CalendarClock className="w-6 h-6 text-rose-500" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tambah Cicilan Baru</h3>
            <p className="text-xs text-slate-400">KPR, Gadget, PLN, Motor, Mobil, atau TikTok PayLater</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Preset Lender / Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Pilih Jenis / Penyedia Cicilan</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              {LENDER_PRESETS.map((preset) => {
                const logoUrl = getPresetBrandIcon(preset.slug);
                const isSelected = selectedLenderSlug === preset.slug || lender.toLowerCase().includes(preset.slug);
                return (
                  <button
                    key={preset.slug}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-rose-600/20 border-rose-400 ring-2 ring-rose-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                    title={preset.name}
                  >
                    <div className="w-full h-7 px-1.5 py-0.5 flex items-center justify-center bg-white rounded-lg shrink-0 shadow-sm">
                      <img src={logoUrl} alt={preset.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-200 truncate w-full text-center">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Lender Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Penyedia / Finance (Bisa Kustom)</label>
            <div className="relative">
              <input
                type="text"
                value={lender}
                onChange={(e) => {
                  setLender(e.target.value);
                  setSelectedLenderSlug(null);
                }}
                placeholder="Contoh: TikTok PayLater, Adira, FIF, PLN, ACC Astra, Custom"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 pr-9"
              />
              <Edit3 className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Nama Cicilan / Item</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: KPR Rumah BSD, iPhone 16, Honda Vario 160"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Tagihan per Bulan ({currency})</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatLiveCurrencyInput(e.target.value, currency))}
              placeholder={currency === 'IDR' ? 'Contoh: 1.500.000' : 'Contoh: 1,500'}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-extrabold text-sm placeholder-slate-600 focus:outline-none focus:border-rose-500 font-[family-name:var(--font-outfit)]"
            />
          </div>

          {/* Due Day & Tenor Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium block">Tgl Tempo (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="10"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-center font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium block">Total Tenor (Bulan)</label>
              <input
                type="number"
                min={1}
                value={monthsTotal}
                onChange={(e) => setMonthsTotal(e.target.value)}
                placeholder="12"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-center font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium block">Sudah Terbayar</label>
              <input
                type="number"
                min={0}
                value={monthsPaid}
                onChange={(e) => setMonthsPaid(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-center font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.01] disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Cicilan</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
