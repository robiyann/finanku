'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ReceiptUploadModal } from '@/components/receipt-upload-modal';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { AiInsightsCard } from '@/components/ai-insights-card';
import { Sparkles, RefreshCcw, Inbox } from 'lucide-react';

interface RecapItem {
  id: string;
  period: 'week' | 'month';
  period_label: string;
  narrative: string;
  stats: { income: number; expense: number; net: number };
  sentiment: 'positive' | 'negative' | 'neutral';
  date: string;
}

export default function RecapsPage() {
  const [currency, setCurrency] = useState('IDR');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [recaps, setRecaps] = useState<RecapItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerateRecap = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/recaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'month' }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setRecaps((prev) => [json.data, ...prev]);
      }
    } catch {
      // Gracefully handle if API is not fully configured
    } finally {
      setGenerating(false);
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
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Rekapitulasi AI</h1>
                <p className="text-xs text-slate-400">Analisis naratif dan evaluasi kesehatan finansial berkala</p>
              </div>
            </div>
            <button
              onClick={handleGenerateRecap}
              disabled={generating}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Membuat Rekap...' : 'Buat Rekap Baru'}</span>
            </button>
          </div>

          <AiInsightsCard />

          {/* Recaps List */}
          <div className="space-y-4">
            {recaps.length === 0 ? (
              <div className="glass-card p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3 rounded-full bg-slate-800 text-slate-500">
                  <Inbox className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-bold text-slate-300">Belum Ada Rekap AI</p>
                  <p className="text-xs text-slate-500">
                    Klik tombol "Buat Rekap Baru" di atas untuk menghasilkan laporan analisis keuangan naratif dari Financial AI Engine.
                  </p>
                </div>
              </div>
            ) : (
              recaps.map((recap) => (
                <div key={recap.id} className="glass-card p-5 space-y-3 border-purple-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{recap.period_label}</span>
                    <span className="text-[10px] text-slate-400">{recap.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{recap.narrative}</p>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
      <ReceiptUploadModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} currency={currency} />
      <AddTransactionModal isOpen={isAddTxModalOpen} onClose={() => setIsAddTxModalOpen(false)} currency={currency} />
    </div>
  );
}
