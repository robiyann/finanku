"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login, register, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Memproses…" : label}
    </button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? login : register;
  const [state, formAction] = useFormState<AuthState, FormData>(action, null);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Masuk" : "Buat akun"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Selamat datang kembali."
            : "Mulai catat keuanganmu lewat Telegram."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-1.5">
            <label htmlFor="display_name" className="text-sm font-medium">
              Nama (opsional)
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
            {state.error}
          </p>
        )}

        <SubmitButton label={mode === "login" ? "Masuk" : "Daftar"} />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium text-primary">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-primary">
              Masuk
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
