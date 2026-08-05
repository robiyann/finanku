'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Landmark, Smartphone, Wallet, RefreshCw, AlertCircle, Check, Star } from 'lucide-react';
import { formatLiveCurrencyInput, parseLiveCurrencyInput } from '@finance/core';
import { getBrandIconUrl, getPresetBrandIcon } from '@/lib/icons';

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash';
  initial_balance: number;
  color: string;
  mask?: string;
  is_default: boolean;
}

interface EditWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency: string;
  account: Account | null;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#64748b', // Slate
];

const BANK_PRESETS = [
  { slug: 'bca', name: 'BCA', color: '#3b82f6' },
  { slug: 'mandiri', name: 'Bank Mandiri', color: '#f59e0b' },
  { slug: 'bni', name: 'Bank BNI', color: '#f97316' },
  { slug: 'bri', name: 'Bank BRI', color: '#0284c7' },
  { slug: 'jago', name: 'Bank Jago', color: '#f59e0b' },
  { slug: 'seabank', name: 'SeaBank', color: '#ea580c' },
  { slug: 'blu', name: 'blu (BCA)', color: '#06b6d4' },
  { slug: 'bsi', name: 'BSI', color: '#0d9488' },
  { slug: 'cimb-niaga', name: 'CIMB Niaga', color: '#e11d48' },
  { slug: 'danamon', name: 'Danamon', color: '#f59e0b' },
  { slug: 'permata', name: 'Permata', color: '#059669' },
  { slug: 'ocbc', name: 'OCBC NISP', color: '#e11d48' },
  { slug: 'jenius', name: 'Jenius', color: '#0284c7' },
];

const EWALLET_PRESETS = [
  { slug: 'gopay', name: 'GoPay', color: '#06b6d4' },
  { slug: 'ovo', name: 'OVO', color: '#8b5cf6' },
  { slug: 'dana', name: 'DANA', color: '#3b82f6' },
  { slug: 'shopeepay', name: 'ShopeePay', color: '#ea580c' },
  { slug: 'linkaja', name: 'LinkAja', color: '#e11d48' },
];

export function EditWalletModal({ isOpen, onClose, onSuccess, currency, account }: EditWalletModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState('#3b82f6');
  const [mask, setMask] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (account && isOpen) {
      setName(account.name || '');
      setType(account.type || 'bank');
      setInitialBalance(formatLiveCurrencyInput(account.initial_balance ?? 0, currency));
      setColor(account.color || '#3b82f6');
      setMask(account.mask || '');
      setIsDefault(Boolean(account.is_default));
      setSelectedBrandSlug(null);
      setErrorMsg(null);
    }
  }, [account, isOpen, currency]);

  if (!isOpen || !account) return null;

  const handleSelectPreset = (preset: { slug: string; name: string; color: string }) => {
    setSelectedBrandSlug(preset.slug);
    setName(preset.name);
    setColor(preset.color);
  };

  const handleTypeChange = (newType: 'bank' | 'ewallet' | 'cash') => {
    setType(newType);
    setSelectedBrandSlug(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama akun / dompet wajib diisi.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: account.id,
          name: name.trim(),
          type,
          initial_balance: parseLiveCurrencyInput(initialBalance),
          color,
          mask: mask.trim() || undefined,
          is_default: isDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal memperbarui dompet.');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memperbarui dompet.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeBrandIconUrl = selectedBrandSlug
    ? getPresetBrandIcon(selectedBrandSlug)
    : getBrandIconUrl(name, type);

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
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center p-2 shrink-0 bg-white shadow-md"
            style={{ borderColor: `${color}90` }}
          >
            {activeBrandIconUrl ? (
              <img src={activeBrandIconUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Settings className="w-6 h-6 text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Edit & Atur Saldo Dompet</h3>
            <p className="text-xs text-slate-400">Sesuaikan nama, tipe, saldo awal, atau default account</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Account Type Selection */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Kategori Akun</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bank', label: 'Bank', icon: Landmark },
                { id: 'ewallet', label: 'E-Wallet', icon: Smartphone },
                { id: 'cash', label: 'Tunai', icon: Wallet },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTypeChange(id as any)}
                  className={`py-2.5 px-3 rounded-xl font-semibold border flex flex-col items-center gap-1.5 transition-all ${
                    type === id
                      ? 'bg-blue-600/25 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Provider Preset Selection Grid */}
          {type !== 'cash' && (
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium block">
                Pilih {type === 'bank' ? 'Bank' : 'E-Wallet'} Resmi
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                {(type === 'bank' ? BANK_PRESETS : EWALLET_PRESETS).map((preset) => {
                  const logoUrl = getPresetBrandIcon(preset.slug);
                  const isSelected = selectedBrandSlug === preset.slug || name.toLowerCase().includes(preset.slug);
                  return (
                    <button
                      key={preset.slug}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-400 ring-2 ring-blue-500/50'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                      title={preset.name}
                    >
                      <div className="w-full h-8 px-2 py-1 flex items-center justify-center bg-white rounded-lg shrink-0 shadow-sm">
                        <img src={logoUrl} alt={preset.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200 truncate w-full text-center">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Nama Akun / Dompet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSelectedBrandSlug(null);
              }}
              placeholder="Contoh: BCA Tabungan Utama, GoPay"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Initial Balance */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">Saldo Awal / Modal Dasar ({currency})</label>
            <input
              type="text"
              inputMode="numeric"
              value={initialBalance}
              onChange={(e) => setInitialBalance(formatLiveCurrencyInput(e.target.value, currency))}
              placeholder="0"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-extrabold text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-[family-name:var(--font-outfit)]"
            />
            <p className="text-[10px] text-slate-500">
              Saldo saat ini dihitung dari: Saldo Awal + Total Pemasukan - Total Pengeluaran.
            </p>
          </div>

          {/* Mask / Last Digits */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium block">4 Digit Terakhir / Keterangan (Opsional)</label>
            <input
              type="text"
              maxLength={10}
              value={mask}
              onChange={(e) => setMask(e.target.value)}
              placeholder="Contoh: 1234 atau Utama"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Color Picker (Fixed spacing to prevent overlap with label) */}
          <div className="space-y-2 pt-1">
            <label className="text-slate-400 font-medium block">Warna Label</label>
            <div className="flex items-center gap-3 pt-1 pb-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform shrink-0 ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Is Default Checkbox */}
          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold">
              <Star className={`w-3.5 h-3.5 ${isDefault ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
              <span>Jadikan Dompet Utama / Default</span>
            </div>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
