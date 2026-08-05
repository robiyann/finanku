# Rencana Rombak Total — "Keuanganku v2"

> Nota-scanner pribadi dengan **dua muka**: **aplikasi Android (APK)** sebagai input utama (kamera scan nota) dan **web dashboard** untuk analisis & pengelolaan. Ditenagai **Gemini 2.5 Flash** untuk membaca nota dan menyusun rekap. Backend **Neon Postgres** & **Direct Google OAuth**. Mulai dari nol — Telegram bot v1 dibuang, skema & data lama dibuang.

## 1. Gambaran Produk

```
┌──────────────┐   foto nota (kamera)    ┌──────────────────────┐
│  APK (Expo)  │ ──── upload batch ────► │  Backend Next.js     │
│  Android     │ ◄─── data, notifikasi ── │  - Neon Postgres     │
└──────────────┘                         │  - Direct Google     │
                                         │    OAuth Session     │
┌──────────────┐   kelola & analisis     │  - Next.js API       │
│  Web         │ ◄──── grafik, rekap ─── │    (proses OCR, cron │
│  Dashboard   │ ────── koreksi ───────► │    rekap)            │
└──────────────┘                         │  - packages/core     │
                                         └──────────┬───────────┘
                                                    │
                                         ┌──────────▼───────────┐
                                         │  Gemini 2.5 Flash    │
                                         │  (vision + rekap)    │
                                         └──────────────────────┘
```

**Prinsip keamanan key:** kredensial AI router, Neon `DATABASE_URL`, dan Cloudflare R2 **hanya ada di sisi server** — tidak pernah di APK/web client. Alur: client (Google Auth Session Cookie) → backend (verifikasi session, presigned URL R2, antrian, simpan hasil ke Neon) → AI router (OpenAI-compatible; API key hak server) → balik data. Client hanya menerima presigned URL untuk upload dan hasil akhir.

**Pipeline gambar:** kompres WebP di client → upload langsung ke **Cloudflare R2** via presigned URL dari backend → AI router membaca via URL R2. Foto asli tidak perlu disimpan; opsional lifecycle rule R2 hapus otomatis > 1 tahun.

**Siklus gaji (payday-aware):** semua metrik "sisa dana / pace / jatah harian" dihitung per **siklus gaji**, bukan bulan kalender. `profiles.settings.payday_day` (1–31, default: kalender) menentukan siklus.

**Multi sumber dana:** saldo dilacak per akun (rekening bank, e-wallet, cash). Saldo akun = saldo awal + pemasukan − pengeluaran ± transfer. Setiap transaksi wajib punya `account_id`.

## 2. Prinsip Teknis

- **`extractReceipt()` adalah interface yang bisa ditukar.** Implementasi awal `GeminiVisionProvider`.
- **LLM tidak dipakai untuk hal yang bisa deterministik.** Input teks manual diparse lokal (regex + `money.ts`); Gemini hanya untuk vision (nota) dan rekap naratif.
- **Neon Serverless Driver (`@neondatabase/serverless`).** Driver HTTP/WebSocket ringan untuk mengeksekusi kueri Postgres secara efisien di Server Components & Next.js Route Handlers.
- **Direct Google OAuth + Encrypted Session Cookie.** Autentikasi menggunakan Google OAuth 2.0 PKCE. Sesi tersimpan dalam Cookie terenkripsi (`HttpOnly`, `SameSite=Lax`) yang dikelola oleh `jose` JWT.

## 3. Skema Database (Neon Postgres)

```sql
create table public.users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  email text unique not null,
  display_name text,
  avatar_url text,
  language text not null default 'id',
  country text not null default 'ID',
  currency text not null default 'IDR',
  settings jsonb not null default '{"payday_day": 1, "auto_approve": false, "notifications": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

accounts       (id, user_id references users, name, type, mask, initial_balance, is_default, color, active)
categories     (id, user_id references users nullable, name, kind)
transactions   (id, user_id references users, type, amount, category_id, description, merchant, occurred_at, source, account_id, receipt_id)
transfers      (id, user_id references users, from_account_id, to_account_id, amount, occurred_at, note)
receipts       (id, user_id references users, storage_path, status, ocr_json, error, created_at, parsed_at)
receipt_items  (id, receipt_id references receipts, name, qty, price)
recaps         (id, user_id references users, period, period_start, period_end, narrative, stats)
installments   (id, user_id references users, name, lender, amount, due_day, months_total, months_paid, start_month, remind_days)
push_tokens    (id, user_id references users, expo_push_token, device)
```

## 4. Struktur Repo & Autentikasi

```
finance/
├── apps/
│   ├── web/        → Next.js: dashboard web (desain dark modern), API route processes, Neon DB client, Google Auth session
│   └── mobile/     → Expo (React Native): aplikasi Android (Google Sign-In Native)
├── packages/
│   └── core/       → shared: types, money.ts, parser teks lokal, extractReceipt()
└── supabase/       → migrations (Neon SQL DDL)
```

**Auth Utama: Direct Google OAuth 2.0 (Google Sign-In)**
- **Satu Akun Lintas Perangkat**: Google OAuth Sign-In yang sama untuk Web Dashboard maupun Aplikasi Mobile APK Expo.
- **Google OAuth Callback**: Menukar code Google ke Access Token & Profile, melakukan `UPSERT` ke tabel `users` Neon Postgres, dan menerbitkan Cookie Sesi terenkripsi (`session_token`).
- **Edge Middleware Protection**: Next.js `middleware.ts` memeriksa Cookie Sesi `session_token` untuk mengamankan seluruh rute web app.

---

## 5. Environment

```
DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
AI_BASE_URL=http://43.134.41.152:20128/v1
AI_API_KEY=...
AI_MODEL=ag/gemini-3.6-flash-medium
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=fintrack
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. Security & Proteksi Sistem (Direct Google OAuth, Neon & R2)

1. **Direct Google OAuth & Session Management**:
   - Google Auth Code ditukar di server (`/auth/callback`), profil disinkronkan ke Neon DB `users`.
   - Sesi terenkripsi menggunakan Cookie `HttpOnly`, `Secure`, `SameSite=Lax` (`session_token`).
2. **Edge Middleware Navigation Guard**:
   - `middleware.ts` mencegat setiap navigasi halaman. Unauthenticated user di-redirect ke `/login`.
3. **Storage Security (Cloudflare R2)**:
   - Private R2 Bucket dengan Presigned Upload URL berumur pendek (5 menit). Path file dikunci per user `receipts/<user_id>/<uuid>.webp`.
4. **Backend API Protection**:
   - Seluruh kueri SQL ke Neon Postgres memfilter `WHERE user_id = $1` menggunakan ID pengguna terverifikasi dari Session JWT. Kredensial `DATABASE_URL` & `AI_API_KEY` tidak pernah diekspos ke client.
