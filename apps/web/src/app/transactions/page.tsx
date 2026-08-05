'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ReceiptUploadModal } from '@/components/receipt-upload-modal';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { TransactionsPreviewTable } from '@/components/transactions-preview-table';
import { ReceiptText, Plus, ScanLine } from 'lucide-react';

export default function TransactionsPage() {
  const [currency, setCurrency] = useState('IDR');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Semua Transaksi</h1>
                <p className="text-xs text-slate-400">Riwayat lengkap pembayaran &amp; pemasukan kamu</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 text-xs font-semibold transition-all"
              >
                <ScanLine className="w-4 h-4" />
                <span>Scan OCR</span>
              </button>
              <button
                onClick={() => setIsAddTxModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Manual</span>
              </button>
            </div>
          </div>

          <TransactionsPreviewTable key={refreshKey} currency={currency} />
        </main>
      </div>
      <ReceiptUploadModal isOpen={isScanModalOpen} onClose={() => { setIsScanModalOpen(false); handleRefresh(); }} currency={currency} />
      <AddTransactionModal isOpen={isAddTxModalOpen} onClose={() => setIsAddTxModalOpen(false)} onSuccess={handleRefresh} currency={currency} />
    </div>
  );
}
