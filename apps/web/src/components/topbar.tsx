'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Globe, ChevronDown, LogIn, LogOut, User, Menu } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  onOpenQuickAdd: () => void;
  onToggleMobileMenu?: () => void;
}

export function Topbar({ currentCurrency, onCurrencyChange, onOpenQuickAdd, onToggleMobileMenu }: TopbarProps) {
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  const currencies = [
    { code: 'IDR', label: 'Rupiah (IDR)', symbol: 'Rp' },
    { code: 'MYR', label: 'Ringgit (MYR)', symbol: 'RM' },
    { code: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  ];

  return (
    <header className="h-16 glass-nav fixed top-0 right-0 left-0 md:left-64 z-20 flex items-center justify-between px-4 sm:px-6">
      {/* Mobile Hamburger Button + Search Input */}
      <div className="flex items-center space-x-2 flex-1 max-w-xs sm:max-w-md">
        {/* Hamburger Menu Toggle on Mobile */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white md:hidden shrink-0"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-all"
          />
        </div>
      </div>

      {/* Actions & Utilities */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-2">
        {/* Currency Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
            className="flex items-center space-x-1 py-1.5 px-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentCurrency}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showCurrencyDropdown && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 animate-fade-in text-xs">
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    onCurrencyChange(c.code);
                    setShowCurrencyDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 ${
                    currentCurrency === c.code ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className="text-[10px] text-slate-500">{c.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add Transaction Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1 py-1.5 px-2.5 sm:px-3.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition-all hover:scale-[1.02]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Transaksi</span>
        </button>

        {/* Auth User Profile / Login Link */}
        {user ? (
          <div className="flex items-center space-x-1.5 pl-1.5 border-l border-slate-800">
            <div className="flex items-center space-x-1.5 py-1 px-2 rounded-xl bg-slate-900/80 border border-slate-800">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.email || 'User'}
                  className="w-5 h-5 rounded-full border border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                  <User className="w-3 h-3" />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[80px] hidden sm:inline">
                {user.name?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center space-x-1 py-1.5 px-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
}
