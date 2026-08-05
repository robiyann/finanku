'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ReceiptUploadModal } from '@/components/receipt-upload-modal';
import { AddWalletModal } from '@/components/add-wallet-modal';
import { EditWalletModal } from '@/components/edit-wallet-modal';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { getBrandIconUrl } from '@/lib/icons';
import { formatMoney } from '@finance/core';
import { WalletCards, Plus, Landmark, Smartphone, Wallet, Inbox, RefreshCw, Settings } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash';
  current_balance: number;
  initial_balance: number;
  is_default: boolean;
  color: string;
  mask?: string;
}

const accountTypeIcon: Record<string, any> = {
  bank: Landmark,
  ewallet: Smartphone,
  cash: Wallet,
};

const accountTypeLabel: Record<string, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
};

export default function WalletsPage() {
  const [currency, setCurrency] = useState('IDR');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAddWalletModalOpen, setIsAddWalletModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [selectedWalletForAddSaldo, setSelectedWalletForAddSaldo] = useState<string | undefined>(undefined);
  const [selectedWalletToEdit, setSelectedWalletToEdit] = useState<Account | null>(null);
  const [isEditWalletModalOpen, setIsEditWalletModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wallets');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memuat data dompet.');
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleOpenAddSaldo = (accountId?: string) => {
    setSelectedWalletForAddSaldo(accountId);
    setIsAddTxModalOpen(true);
  };

  const handleOpenEditWallet = (acc: Account) => {
    setSelectedWalletToEdit(acc);
    setIsEditWalletModalOpen(true);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);

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
          onOpenQuickAdd={() => handleOpenAddSaldo()}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                <WalletCards className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Dompet & Akun</h1>
                <p className="text-xs text-slate-400">Kelola semua rekening, isi saldo, dan sesuaikan dompet digital kamu</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchWallets}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsAddWalletModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Akun Baru</span>
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Total Balance Summary */}
          <div className="glass-card p-5 sm:p-6 bg-gradient-to-br from-slate-900/80 to-blue-950/20 border-blue-500/20 glow-blue flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Kekayaan Bersih</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-[family-name:var(--font-outfit)]">
                {loading ? (
                  <span className="inline-block w-40 h-9 bg-slate-800 rounded-lg animate-pulse" />
                ) : formatMoney(totalBalance, currency)}
              </p>
              <p className="text-xs text-emerald-400 mt-1">
                {loading ? 'Memuat...' : accounts.length > 0 ? `dari ${accounts.length} akun terdaftar` : 'Belum ada akun dompet terdaftar'}
              </p>
            </div>
            {accounts.length > 0 && (
              <button
                onClick={() => handleOpenAddSaldo()}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Saldo (Top Up)</span>
              </button>
            )}
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-5 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 bg-slate-800 rounded" />
                      <div className="h-2 w-14 bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-7 w-32 bg-slate-800 rounded-lg mt-2" />
                </div>
              ))
            ) : accounts.length === 0 ? (
              <div className="col-span-full glass-card p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3 rounded-full bg-slate-800 text-slate-500">
                  <Inbox className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-bold text-slate-300">Belum Ada Rekening / Dompet</p>
                  <p className="text-xs text-slate-500">
                    Tambahkan rekening bank (BCA, Mandiri) atau E-Wallet (GoPay, OVO) untuk melacak saldo secara terpusat.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddWalletModalOpen(true)}
                  className="mt-2 flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Akun Pertama</span>
                </button>
              </div>
            ) : (
              <>
                {accounts.map((acc) => {
                  const Icon = accountTypeIcon[acc.type] || Landmark;
                  const brandIconUrl = getBrandIconUrl(acc.name, acc.type);
                  const balance = Number(acc.current_balance ?? acc.initial_balance ?? 0);
                  return (
                    <div key={acc.id} className="glass-card p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-xl border flex items-center justify-center p-1.5 shrink-0 bg-slate-900/90"
                              style={{ borderColor: `${acc.color || '#3b82f6'}40` }}
                            >
                              {brandIconUrl ? (
                                <img src={brandIconUrl} alt={acc.name} className="w-full h-full object-contain" />
                              ) : (
                                <Icon className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                                {acc.name}
                                {acc.is_default && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">DEFAULT</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 capitalize">
                                {accountTypeLabel[acc.type] || acc.type}
                                {acc.mask ? ` · ${acc.mask}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenEditWallet(acc)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Edit / Atur Dompet"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="border-t border-slate-800 pt-3 mt-4">
                          <p className={`text-2xl font-extrabold font-[family-name:var(--font-outfit)] ${balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                            {formatMoney(balance, currency)}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Saldo Saat Ini</p>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-800/60">
                        <button
                          onClick={() => handleOpenAddSaldo(acc.id)}
                          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Saldo</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditWallet(acc)}
                          className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700/80"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={() => setIsAddWalletModalOpen(true)}
                  className="glass-card p-5 border-dashed border-slate-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[160px]"
                >
                  <div className="p-3 rounded-full bg-slate-800 text-slate-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Tambah Akun Baru</p>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <ReceiptUploadModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} currency={currency} />
      <AddWalletModal isOpen={isAddWalletModalOpen} onClose={() => setIsAddWalletModalOpen(false)} onSuccess={fetchWallets} currency={currency} />
      <EditWalletModal isOpen={isEditWalletModalOpen} onClose={() => setIsEditWalletModalOpen(false)} onSuccess={fetchWallets} currency={currency} account={selectedWalletToEdit} />
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => {
          setIsAddTxModalOpen(false);
          setSelectedWalletForAddSaldo(undefined);
        }}
        onSuccess={fetchWallets}
        currency={currency}
        initialAccountId={selectedWalletForAddSaldo}
        initialType={selectedWalletForAddSaldo ? 'income' : 'expense'}
      />
    </div>
  );
}


