'use client';

import React, { useRef, useState, useEffect } from 'react';
import { formatMoney } from '@finance/core';
import { UploadCloud, X, ScanLine, Sparkles, Check, ImagePlus, AlertCircle, LogIn, Lock, RefreshCw, Wallet } from 'lucide-react';
import Link from 'next/link';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
}

async function compressImageForOcr(file: File, maxDimension = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    if (file.size < 300 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}

export function ReceiptUploadModal({ isOpen, onClose, currency }: ReceiptUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Auth check state
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Ledger save state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [savingLedger, setSavingLedger] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setCurrentUser(data.authenticated ? data.user : null);
        setAuthChecked(true);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthChecked(true);
      });

    // Pre-fetch user accounts
    fetch('/api/wallets')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          const def = data.accounts.find((a: any) => a.is_default) || data.accounts[0];
          setSelectedAccountId(def.id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setScannedResult(null);
    setErrorMsg(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setScannedResult(null);
    setErrorMsg(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setScannedResult(null);
    setErrorMsg(null);
    setScanning(false);
    setUploadProgress('');
    setSavingLedger(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = async () => {
    if (!selectedFile || !currentUser) return;
    setScanning(true);
    setScannedResult(null);
    setErrorMsg(null);

    try {
      setUploadProgress('Mengompresi foto nota agar ekstraksi kilat...');
      const fileToUpload = await compressImageForOcr(selectedFile);

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let success = false;

      // Attempt Presigned R2 Upload first
      try {
        setUploadProgress('Mempersiapkan upload aman ke R2...');
        const presignRes = await fetch('/api/receipts/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': requestId,
          },
          body: JSON.stringify({
            mime_type: fileToUpload.type || 'image/jpeg',
            file_size: fileToUpload.size,
            filename: fileToUpload.name,
            request_id: requestId,
          }),
        });

        if (presignRes.ok) {
          const { presigned_url, storage_path, receipt_id } = await presignRes.json();

          setUploadProgress('Mengupload foto nota ke storage...');
          const uploadRes = await fetch(presigned_url, {
            method: 'PUT',
            body: fileToUpload,
            headers: { 'Content-Type': fileToUpload.type || 'image/jpeg' },
          });

          if (uploadRes.ok) {
            setUploadProgress('Sistem OCR Cerdas sedang menganalisis nota...');
            const processRes = await fetch('/api/receipts/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storage_path, receipt_id }),
            });

            const json = await processRes.json();
            if (processRes.ok && json.ok) {
              setScanning(false);
              setUploadProgress('');
              setScannedResult(json.data);
              success = true;
            } else {
              throw new Error(json.error || 'Gagal memproses nota struk.');
            }
          }
        }
      } catch (presignErr: any) {
        console.warn('[OCR Modal] Presigned upload failed/CORS error, switching to direct upload:', presignErr);
      }

      // Direct Upload Fallback if presigned path failed or had CORS issue
      if (!success) {
        setUploadProgress('Mengunggah nota via server...');
        const formData = new FormData();
        formData.append('file', fileToUpload);

        const res = await fetch('/api/receipts/process', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Gagal memproses nota struk.');
        }

        setScanning(false);
        setUploadProgress('');
        setScannedResult(json.data);
      }
    } catch (err: any) {
      setScanning(false);
      setUploadProgress('');
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses OCR.');
    }
  };

  const handleSaveToLedger = async () => {
    if (!scannedResult) return;
    setSavingLedger(true);
    setErrorMsg(null);

    try {
      let targetAccountId = selectedAccountId;
      if (!targetAccountId && accounts.length > 0) {
        targetAccountId = accounts[0].id;
      }

      if (!targetAccountId) {
        const walletRes = await fetch('/api/wallets');
        const walletData = await walletRes.json();
        if (walletData.ok && walletData.accounts && walletData.accounts.length > 0) {
          targetAccountId = walletData.accounts[0].id;
        }
      }

      if (!targetAccountId) {
        throw new Error('Belum ada dompet terdaftar. Silakan buat dompet terlebih dahulu.');
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const itemsSummary = scannedResult.items?.map((i: any) => `${i.qty || 1}x ${i.name}`).join(', ');

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': requestId,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: Number(scannedResult.total) || 0,
          account_id: targetAccountId,
          merchant: scannedResult.merchant || 'Hasil Scan Struk',
          description: itemsSummary ? `Scan Struk: ${itemsSummary}` : 'Hasil Scan Struk Belanja OCR',
          occurred_at: scannedResult.tanggal || new Date().toISOString().split('T')[0],
          source: 'scan',
          request_id: requestId,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Gagal menyimpan transaksi ke ledger.');
      }

      setSavingLedger(false);
      handleReset();
      onClose();
    } catch (err: any) {
      setSavingLedger(false);
      setErrorMsg(err.message || 'Gagal menyimpan transaksi ke ledger.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-lg w-full p-6 space-y-5 relative border border-slate-700 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Scan Struk Belanja (OCR AI)</h3>
            <p className="text-xs text-slate-400">
              {currentUser
                ? `Nota akan disimpan ke akun: ${currentUser.name || currentUser.email}`
                : 'Unggah foto nota untuk ekstraksi transaksi otomatis'}
            </p>
          </div>
        </div>

        {!authChecked && (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Memverifikasi sesi login...</p>
          </div>
        )}

        {authChecked && !currentUser && (
          <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Wajib Login Terlebih Dahulu</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Kamu harus masuk dengan akun Google untuk dapat scan nota dan menyimpan transaksi.
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <LogIn className="w-4 h-4" />
              Masuk dengan Google
            </Link>
          </div>
        )}

        {authChecked && currentUser && (
          <>
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Scan OCR Gagal (2x Percobaan)</p>
                    <p className="text-[11px] opacity-90">{errorMsg}</p>
                  </div>
                </div>
                {selectedFile && !scanning && (
                  <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                    <button
                      onClick={handleScan}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Coba Scan Ulang
                    </button>
                    <button
                      onClick={handleReset}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all"
                    >
                      Upload Foto Lain
                    </button>
                  </div>
                )}
              </div>
            )}

            {!selectedFile && !scanning && !scannedResult && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/webp,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all group"
                >
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform mb-3">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">
                    Tarik &amp; lepaskan file nota di sini, atau{' '}
                    <span className="text-blue-400 underline underline-offset-2">klik untuk memilih</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Mendukung format WebP, JPEG, PNG (Maks 10MB)</p>
                </div>
              </>
            )}

            {selectedFile && !scanning && !scannedResult && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview nota" className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      <ImagePlus className="w-6 h-6 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type.split('/')[1]?.toUpperCase()}
                    </p>
                    <button
                      onClick={handleReset}
                      className="text-[11px] text-rose-400 hover:text-rose-300 mt-1 underline underline-offset-2"
                    >
                      Ganti file
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleScan}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  Mulai Ekstraksi Struk Otomatis
                </button>
              </div>
            )}

            {scanning && (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 rounded-full bg-purple-500/15 text-purple-400 animate-spin">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">Sistem OCR Cerdas sedang mengekstrak nota...</p>
                  <p className="text-[11px] text-slate-400">{uploadProgress || 'Mengekstrak merchant, tanggal, dan detail barang'}</p>
                </div>
                <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-full animate-pulse"></div>
                </div>
              </div>
            )}

            {scannedResult && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Ekstraksi OCR Berhasil!
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Merchant / Toko</span>
                    <span className="font-bold text-slate-200">{scannedResult.merchant || 'Tidak terdeteksi'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total Belanja</span>
                    <span className="font-extrabold text-blue-400 font-[family-name:var(--font-outfit)]">
                      {formatMoney(scannedResult.total || 0, currency)}
                    </span>
                  </div>
                </div>

                {/* Wallet Selector */}
                {accounts.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <label className="text-slate-400 font-medium flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-blue-400" /> Potong Saldo Dari Dompet:
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type.toUpperCase()}) — Saldo: {formatMoney(Number(acc.current_balance || 0), currency)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scannedResult.items && scannedResult.items.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Rincian Barang Terdeteksi</span>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {scannedResult.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-900/60 text-xs flex justify-between">
                          <span className="text-slate-300 truncate">{item.qty}x {item.name}</span>
                          <span className="font-bold text-slate-200">{formatMoney(item.price, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    disabled={savingLedger}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all disabled:opacity-50"
                  >
                    Batal / Scan Ulang
                  </button>
                  <button
                    onClick={handleSaveToLedger}
                    disabled={savingLedger}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingLedger ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Ke Ledger Transaksi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
