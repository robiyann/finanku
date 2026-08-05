'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Lightbulb, RefreshCw, Activity, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function AiInsightsCard() {
  const [insightData, setInsightData] = useState<{ insight: string; score: number; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLatestInsight = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/insights/analyze');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat analisis AI.');
      }
      const data = await res.json();
      setInsightData(data.insight || null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestInsight();
  }, []);

  const handleRunAnalyze = async () => {
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/insights/analyze', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menjalankan analisis AI.');
      }
      const data = await res.json();
      if (data.ok && data.insight) {
        setInsightData(data.insight);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/20 border-purple-500/20">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="space-y-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100">AI Financial Insights</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Financial AI Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {insightData ? `Update terakhir: ${formatDate(insightData.created_at)}` : 'Analisis Otomatis & Manual Perilaku Keuangan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalyze}
              disabled={analyzing}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 hover:scale-[1.02]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Menganalisis...' : 'Jalankan Analisis AI'}</span>
            </button>

            <Link
              href="/recaps"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1 transition-colors pl-2"
            >
              <span>Rekap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Health Score & Narrative Box */}
        {loading ? (
          <div className="p-4 rounded-xl bg-purple-900/15 border border-purple-500/20 text-xs text-slate-400 animate-pulse flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-400/30 animate-spin" />
            <span>Memuat insight keuangan AI...</span>
          </div>
        ) : insightData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-900/20 border border-purple-500/30">
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <Activity className="w-4 h-4" />
                <span className="font-extrabold text-sm font-[family-name:var(--font-outfit)]">{insightData.score}/100</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-300 block">Skor Kesehatan Keuangan</span>
                <span className="text-xs text-slate-300">
                  {insightData.score >= 80 ? 'Sangat Sehat 👍' : insightData.score >= 60 ? 'Cukup Stabil ⚖️' : 'Perlu Perhatian ⚠️'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-900/15 border border-purple-500/20 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              <p className="font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Hasil Analisis Penasihat AI:
              </p>
              {insightData.insight}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-purple-900/15 border border-purple-500/20 text-xs text-slate-300 leading-relaxed flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Belum ada hasil analisis. Klik tombol <strong>"Jalankan Analisis AI"</strong> untuk menganalisis arus kasmu.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
