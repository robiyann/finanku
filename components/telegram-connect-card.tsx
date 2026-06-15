"use client";

import { useState, useTransition } from "react";
import {
  generateConnectCode,
  disconnectTelegram,
} from "@/app/(dashboard)/settings/actions";

interface Props {
  connected: boolean;
  botUsername: string | null;
}

export function TelegramConnectCard({ connected, botUsername }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateConnectCode();
      if (result && "ok" in result) setCode(result.code);
      else if (result && "error" in result) setError(result.error);
    });
  }

  function handleDisconnect() {
    if (!confirm("Putuskan tautan Telegram?")) return;
    setError(null);
    startTransition(async () => {
      const result = await disconnectTelegram();
      if ("error" in result) setError(result.error);
      else setCode(null);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Telegram</h2>
          <p className="text-sm text-muted-foreground">
            Catat transaksi langsung dari chat Telegram.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            connected
              ? "bg-income/10 text-income"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {connected ? "Tertaut" : "Belum tertaut"}
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
          {error}
        </p>
      )}

      {connected ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={pending}
            className="rounded-lg border border-expense px-4 py-2 text-sm font-medium text-expense transition hover:bg-expense/10 disabled:opacity-60"
          >
            {pending ? "Memproses…" : "Putuskan tautan"}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {code ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Kode koneksimu</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-widest">
                  {code}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Berlaku 10 menit.
                </p>
              </div>
              <ol className="space-y-1.5 text-sm text-muted-foreground">
                <li>
                  1. Buka bot{" "}
                  {botUsername ? (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary"
                    >
                      @{botUsername}
                    </a>
                  ) : (
                    "Telegram kamu"
                  )}
                  .
                </li>
                <li>
                  2. Kirim pesan:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    /connect {code}
                  </code>
                </li>
                <li>3. Selesai — mulai catat transaksimu!</li>
              </ol>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={pending}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                Buat kode baru
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Membuat…" : "Hubungkan Telegram"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
