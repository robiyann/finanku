'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ReceiptUploadModal } from '@/components/receipt-upload-modal';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { Settings, User, Globe, Bell, ShieldCheck, Save, Check, AlertCircle, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [currency, setCurrency] = useState('IDR');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Editable settings form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('id');
  const [paydayDay, setPaydayDay] = useState(25);
  const [notifications, setNotifications] = useState(true);
  const [recapWeekly, setRecapWeekly] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user) {
          const u = data.user;
          setDisplayName(u.display_name || u.email?.split('@')[0] || '');
          setEmail(u.email || '');
          setLanguage(u.language || 'id');
          setCurrency(u.currency || 'IDR');
          if (u.settings) {
            setPaydayDay(u.settings.payday_day ?? 25);
            setNotifications(u.settings.notifications ?? true);
            setRecapWeekly(u.settings.recap_weekly ?? true);
          }
        }
      })
      .catch(() => {
        setErrorMsg('Gagal memuat pengaturan pengguna.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          language,
          currency,
          payday_day: Number(paydayDay),
          notifications,
          recap_weekly: recapWeekly,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal menyimpan perubahan.');
      }

      setSuccessMsg('Pengaturan berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

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
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-8 space-y-6 max-w-4xl w-full mx-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center space-x-3 pt-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Pengaturan</h1>
              <p className="text-xs text-slate-400">Konfigurasi profil, preferensi regional, dan notifikasi</p>
            </div>
          </div>

          {/* Feedback Alerts */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <p className="text-xs">Memuat pengaturan...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Section 1: Profil Pengguna */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
                  <div className="p-1.5 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-200">Profil Pengguna</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Nama Tampilan</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Masukkan nama tampilan kamu"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Email (Terkoneksi Google)</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Preferensi Regional */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
                  <div className="p-1.5 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-200">Preferensi Regional</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Mata Uang Utama</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="IDR">IDR — Rupiah Indonesia</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="SGD">SGD — Singapore Dollar ($)</option>
                      <option value="MYR">MYR — Malaysian Ringgit (RM)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Bahasa Antarmuka</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                      <option value="ms">Bahasa Melayu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Siklus Gajian (Payday) */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
                  <div className="p-1.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-200">Siklus Gajian (Payday)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Tanggal Gajian Bulanan (1 - 31)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={paydayDay}
                      onChange={(e) => setPaydayDay(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Notifikasi & Rekap AI */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
                  <div className="p-1.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-200">Notifikasi & Rekap AI</h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-800/60">
                    <div>
                      <p className="font-semibold text-slate-200">Notifikasi Aplikasi & Pengingat</p>
                      <p className="text-[11px] text-slate-400">Terima pengingat gajian dan tagihan tepat waktu</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(!notifications)}
                      className={`w-10 h-6 rounded-full flex items-center transition-all p-0.5 ${notifications ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-800/60">
                    <div>
                      <p className="font-semibold text-slate-200">Rekap Mingguan AI</p>
                      <p className="text-[11px] text-slate-400">Dapatkan analisis naratif keuangan otomatis setiap minggu</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecapWeekly(!recapWeekly)}
                      className={`w-10 h-6 rounded-full flex items-center transition-all p-0.5 ${recapWeekly ? 'bg-blue-500 justify-end' : 'bg-slate-700 justify-start'}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </form>
          )}
        </main>
      </div>
      <ReceiptUploadModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} currency={currency} />
      <AddTransactionModal isOpen={isAddTxModalOpen} onClose={() => setIsAddTxModalOpen(false)} currency={currency} />
    </div>
  );
}
