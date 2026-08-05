'use client';

import React from 'react';
import { X, ScanLine, Edit3, Sparkles } from 'lucide-react';

interface TransactionChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScan: () => void;
  onSelectManual: () => void;
}

export function TransactionChoiceModal({
  isOpen,
  onClose,
  onSelectScan,
  onSelectManual,
}: TransactionChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 space-y-5 relative border border-slate-700 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-extrabold text-white font-[family-name:var(--font-outfit)]">
            Pilih Cara Tambah Transaksi
          </h3>
          <p className="text-xs text-slate-400">Pilih metode pencatatan pengeluaran atau pemasukan</p>
        </div>

        {/* 2 Choice Options */}
        <div className="grid grid-cols-1 gap-3">
          {/* Option A: Scan Struk Nota OCR */}
          <button
            onClick={() => {
              onClose();
              onSelectScan();
            }}
            className="group p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 hover:border-blue-500/60 flex items-center space-x-4 text-left transition-all hover:scale-[1.02]"
          >
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 group-hover:scale-110 transition-transform shrink-0">
              <ScanLine className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Scan Struk Belanja</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> OCR AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Foto struk nota belanja, sistem AI akan mengekstrak otomatis.
              </p>
            </div>
          </button>

          {/* Option B: Input Manual */}
          <button
            onClick={() => {
              onClose();
              onSelectManual();
            }}
            className="group p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center space-x-4 text-left transition-all hover:scale-[1.02]"
          >
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300 group-hover:scale-110 transition-transform shrink-0">
              <Edit3 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-white block">Catat Manual</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Isi nominal, toko, kategori, dan dompet secara manual.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
