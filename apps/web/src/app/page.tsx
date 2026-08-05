'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { HeroBalanceCard } from '@/components/hero-balance-card';
import { CashflowChart } from '@/components/cashflow-chart';
import { CategoryDonut } from '@/components/category-donut';
import { AiInsightsCard } from '@/components/ai-insights-card';
import { TransactionsPreviewTable } from '@/components/transactions-preview-table';
import { ReceiptUploadModal } from '@/components/receipt-upload-modal';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { AddWalletModal } from '@/components/add-wallet-modal';
import { TransactionChoiceModal } from '@/components/transaction-choice-modal';

export default function DashboardPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<string>('IDR');
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState<boolean>(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState<boolean>(false);
  const [isAddWalletModalOpen, setIsAddWalletModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Dynamic metrics state
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [dailyCashflows, setDailyCashflows] = useState<Array<{ date: string; net: number }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace('/login');
        } else {
          setLoadingAuth(false);
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;

    fetch('/api/wallets')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.accounts) {
          const sum = data.accounts.reduce((acc: number, a: any) => acc + Number(a.current_balance || 0), 0);
          setTotalBalance(sum);
        }
      })
      .catch(() => {});

    fetch('/api/transactions?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.summary) {
          setTotalIncome(data.summary.total_income || 0);
          setTotalExpense(data.summary.total_expense || 0);
          setDailyCashflows(data.summary.daily_cashflows || []);
        }
      })
      .catch(() => {});
  }, [loadingAuth, refreshKey]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a12] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Memverifikasi sesi login...</p>
        </div>
      </div>
    );
  }

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex bg-[#070a12] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Sidebar Navigation */}
      <Sidebar
        onOpenScanModal={() => setIsChoiceModalOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-w-0">
        {/* Topbar Header */}
        <Topbar
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          onOpenQuickAdd={() => setIsChoiceModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Dashboard Content Container */}
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
          {/* Row 1: Hero Balance Card */}
          <section>
            <HeroBalanceCard
              totalBalance={totalBalance}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              currency={currency}
              dailyCashflows={dailyCashflows}
              onOpenAddTransaction={() => setIsChoiceModalOpen(true)}
            />
          </section>

          {/* Row 2: AI Financial Insights */}
          <section>
            <AiInsightsCard />
          </section>

          {/* Row 3: Cashflow Chart & Category Donut */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <CashflowChart currency={currency} />
            </div>
            <div className="lg:col-span-5">
              <CategoryDonut currency={currency} />
            </div>
          </section>

          {/* Row 4: Recent Transactions Table */}
          <section>
            <TransactionsPreviewTable key={refreshKey} currency={currency} isOverview={true} limit={10} />
          </section>
        </main>
      </div>

      {/* Choice Modal (Pilih Manual / Scan Struk) */}
      <TransactionChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectScan={() => setIsScanModalOpen(true)}
        onSelectManual={() => setIsAddTxModalOpen(true)}
      />

      {/* OCR Scan Upload Modal */}
      <ReceiptUploadModal
        isOpen={isScanModalOpen}
        onClose={() => {
          setIsScanModalOpen(false);
          handleRefreshData();
        }}
        currency={currency}
      />

      {/* Add Manual Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        onSuccess={handleRefreshData}
        currency={currency}
      />

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={isAddWalletModalOpen}
        onClose={() => setIsAddWalletModalOpen(false)}
        onSuccess={handleRefreshData}
        currency={currency}
      />
    </div>
  );
}
