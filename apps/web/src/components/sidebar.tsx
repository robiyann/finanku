'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ReceiptText, 
  WalletCards, 
  CalendarClock, 
  Sparkles, 
  Settings, 
  ScanLine, 
  TrendingUp,
  ShieldCheck,
  LogIn,
  X
} from 'lucide-react';

interface SidebarProps {
  onOpenScanModal: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onOpenScanModal, isOpenMobile = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
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

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard, badge: null },
    { name: 'Transaksi', href: '/transactions', icon: ReceiptText, badge: null },
    { name: 'Dompet & Akun', href: '/wallets', icon: WalletCards, badge: null },
    { name: 'Angsuran', href: '/installments', icon: CalendarClock, badge: null },
    { name: 'Rekap AI', href: '/recaps', icon: Sparkles, badge: 'Baru' },
    { name: 'Pengaturan', href: '/settings', icon: Settings, badge: null },
  ];

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Pengguna Tamu');
  const displayEmail = user?.email || 'Belum Terkoneksi';
  const avatarUrl = user?.avatar;
  const initials = displayName ? displayName.substring(0, 2).toUpperCase() : 'U';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      <aside
        className={`w-64 glass-sidebar fixed inset-y-0 left-0 z-40 flex flex-col justify-between p-4 border-r border-slate-800/80 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          {/* Header Logo + Close button on Mobile */}
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-[family-name:var(--font-outfit)]">
                    Keuanganku
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    v2
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Finance Tracker</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Payday Status Card */}
          <div className="p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Siklus Gajian</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> Aktif
              </span>
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full w-[100%] rounded-full"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Payday Cycle</span>
              <span className="text-slate-300 font-semibold">Tgl 25</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Action & User Info */}
        <div className="space-y-3 pt-3 border-t border-slate-800/60">
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenScanModal();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01]"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Struk OCR</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border border-slate-700 object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onCloseMobile}
              className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800/40 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 group-hover:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                <LogIn className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Masuk ke Akun</p>
                <p className="text-[10px] text-blue-400 truncate font-medium">Klik untuk Login Google</p>
              </div>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
