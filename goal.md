# 🌐 Goal Checklist: Fitur 3 Bahasa Sistem (ID 🇮🇩, EN 🇬🇧, MS 🇲🇾)

Dokumen ini berisi checklist langkah demi langkah dan kriteria verifikasi agar fitur **Multi-Language (System Language)** untuk 3 bahasa (Bahasa Indonesia, English, Bahasa Melayu) dapat berfungsi 100% sempurna di seluruh aplikasi **Finanku**.

> **Status Audit** — Codebase telah di-review secara langsung. Item bertanda ✅ sudah ada di kode. Item bertanda ❌ adalah **celah nyata yang harus diperbaiki**.

---

## 1. ⚙️ Fondasi & Konfigurasi i18n

- [x] **1.1. Konfigurasi Kode & Tipe Bahasa (`src/i18n.config.ts`)**
  - [x] Mendefinisikan array `locales` secara ketat: `['id', 'en', 'ms'] as const`. ✅
  - [x] Menyediakan `defaultLocale = 'id'`. ✅
  - [x] Menyediakan mapping nama bahasa (`localeNames`) dan bendera (`localeFlags`). ✅

- [ ] **1.2. Client-Side Translation Hook (`src/lib/use-translation.ts`)**
  - [x] Mendukung parsing nested key (contoh: `t('nav.overview')`). ✅
  - [x] Menggunakan fallback otomatis ke Bahasa Indonesia (`id.json`) jika gagal load bahasa aktif. ✅
  - [ ] ❌ **Belum ada** `window.addEventListener('locale-change', ...)` agar perubahan bahasa langsung re-render tanpa hard reload halaman. Saat ini masih pakai `window.location.reload()`.
  - [ ] ❌ **Belum expose** fungsi `changeLocale(code)` yang bisa dipanggil dari luar hook untuk trigger re-render reaktif.

- [x] **1.3. Persistensi Preferensi Lokal**
  - [x] Menyimpan preferensi pengguna di `localStorage` dengan key `'preferred-locale'`. ✅
  - [ ] ❌ Sinkronisasi cookie `preferred-locale` untuk Server-Side Rendering (SSR) belum ada.

---

## 2. ❌ KRITIS: Bug API Settings — Bahasa Melayu Ditolak

- [ ] **2.1. ❌ CRITICAL BUG di `src/app/api/settings/route.ts` baris 76:**
  - [ ] Saat ini: `const VALID_LANGUAGES = ['id', 'en'];` — **`'ms'` TIDAK ADA!**
  - [ ] Menyebabkan request `POST /api/settings` dengan `language: 'ms'` **mengembalikan HTTP 400 Bad Request**.
  - [ ] **Harus diperbaiki menjadi:** `const VALID_LANGUAGES = ['id', 'en', 'ms'];`

---

## 3. ❌ KRITIS: Keys Terjemahan yang Belum Ada di JSON Dictionary

Komponen `hero-balance-card.tsx` & `sidebar.tsx` menggunakan keys yang **belum ada** di `id.json`, `en.json`, maupun `ms.json`. Ini menyebabkan `t(key)` mengembalikan nama key mentah, bukan terjemahan.

- [ ] **3.1. Keys yang wajib ditambahkan ke ketiga file JSON (`id.json`, `en.json`, `ms.json`):**
  - [ ] `dashboard.jan`, `dashboard.feb`, `dashboard.mar`, `dashboard.apr`, `dashboard.mei`, `dashboard.jun`, `dashboard.jul`, `dashboard.agu`, `dashboard.sep`, `dashboard.okt`, `dashboard.nov`, `dashboard.des` — nama bulan untuk grafik sparkline.
  - [ ] `dashboard.positive` — teks "Surplus / Pertumbuhan positif".
  - [ ] `dashboard.negative` — teks "Defisit / Pengeluaran berlebih".
  - [ ] `dashboard.no_change` — teks "Tidak ada perubahan saldo".
  - [ ] `dashboard.today` — teks "Hari Ini".
  - [ ] `dashboard.balance_trend` — teks "Tren Saldo 30 Hari".
  - [ ] `dashboard.last_30_days` — teks "30 hari terakhir".
  - [ ] `common.income` — teks "Pemasukan".
  - [ ] `common.expense` — teks "Pengeluaran".
  - [ ] `common.real_time` — teks "Live" / "Real-Time".

- [ ] **3.2. Keys tambahan untuk modul lain yang perlu dicek lebih lanjut:**
  - [ ] `transaction.scan_receipt` ✅ sudah ada.
  - [ ] `auth.login_title` ✅ sudah ada.
  - [ ] `common.saved` ✅ sudah ada.

---

## 4. 📚 Kelengkapan & Kualitas File Kamus Bahasa

- [ ] **4.1. Bahasa Indonesia (`src/messages/id.json`)**
  - [x] Struktur dasar JSON lengkap untuk modul: `common`, `nav`, `auth`, `dashboard`, `transaction`, `wallet`, `installment`, `recap`, `settings`, `errors`, `success`. ✅
  - [ ] ❌ Belum ada keys dashboard bulan (`dashboard.jan` - `dashboard.des`) dan keys yang disebutkan di poin 3.1.

- [ ] **4.2. English (`src/messages/en.json`)**
  - [x] Paritas struktur 100% identik dengan `id.json` untuk keys yang ada. ✅
  - [ ] ❌ Belum ada keys tambahan di poin 3.1.

- [ ] **4.3. Bahasa Melayu (`src/messages/ms.json`)**
  - [x] Paritas struktur 100% identik dengan `id.json` untuk keys yang ada. ✅
  - [ ] ❌ Belum ada keys tambahan di poin 3.1.
  - [ ] ⚠️ Beberapa terjemahan perlu diperbaiki kualitasnya:
    - `nav.overview` = "Konten Utama" → seharusnya "Halaman Utama" atau "Ikhtisar"
    - `dashboard.title` = "Dapaturut Utama" → seharusnya "Papan Pemuka" atau "Dashboard"
    - `installment.due_day` = "Hari Tunku (1-31)" → typo "Tunku", seharusnya "Hari Matang (1-31)"
    - `wallet.balance_updated` = "Bali berjaya dikemas kini" → typo "Bali", seharusnya "Baki berjaya dikemas kini"
    - `wallet.enter_new_balance` = "Masukkan bali baharu" → typo "bali", seharusnya "Masukkan baki baharu"

- [ ] **4.4. Modul JSON tambahan yang perlu di-cover:**
  - [ ] `ocr`: Teks di modal scan OCR nota (judul, status scanning, error messages, sukses).
  - [ ] `installment.payment_history_empty` — teks ketika belum ada riwayat pembayaran.
  - [ ] `wallet.no_wallets` — teks ketika belum ada dompet.
  - [ ] `common.income`, `common.expense` — diperlukan untuk `hero-balance-card.tsx`.

---

## 5. 🎛️ Komponen Selector & UI Language Switcher

- [x] **5.1. Komponen `LanguageSwitcher` (`src/components/language-switcher.tsx`)** ✅
  - [x] Dropdown UI dengan bendera (🇮🇩 ID, 🇬🇧 EN, 🇲🇾 MS) dan label nama bahasa. ✅
  - [x] Status pilihan bahasa aktif ditandai (highlight / check icon). ✅
  - [ ] ❌ **Belum ada click-outside handler** — dropdown tidak menutup otomatis saat klik di luar area.
  - [ ] ❌ Masih menggunakan `window.location.reload()` — perlu diganti dengan mekanisme reaktif (custom event `locale-change`).

- [x] **5.2. Integration di Halaman Settings (`src/app/settings/page.tsx`)** ✅
  - [x] Pilihan Bahasa Sistem menggunakan `<select>` dropdown di menu Preferensi Regional. ✅
  - [x] Menyimpan pilihan bahasa pengguna ke backend via `POST /api/settings`. ✅
  - [ ] ❌ Perubahan bahasa dari Settings tidak langsung mengubah teks UI tanpa save & reload.

- [ ] **5.3. Integrasi LanguageSwitcher di Topbar atau Sidebar**
  - [ ] Saat ini `LanguageSwitcher` komponen ada tapi belum dipasang di Topbar (`topbar.tsx`) — yang justru paling mudah diakses user.

---

## 6. 🖼️ Penerapan Terjemahan pada Seluruh Halaman & Komponen

- [ ] **6.1. Navigasi & Shell Utama**
  - [x] Sidebar (`src/components/sidebar.tsx`) — sudah menggunakan `useTranslation` untuk nav items. ✅
  - [ ] ❌ Topbar (`src/components/topbar.tsx`) — teks seperti placeholder "Cari transaksi..." masih **hardcoded** dalam Bahasa Indonesia.

- [ ] **6.2. Halaman Utama & Fitur**
  - [x] Halaman Dashboard (`src/app/page.tsx` & `src/components/hero-balance-card.tsx`) — menggunakan `useTranslation`. ✅
  - [ ] Halaman Transaksi (`src/app/transactions/page.tsx` & `src/components/transactions-preview-table.tsx`) — perlu audit.
  - [ ] Halaman Rekap (`src/app/recaps/page.tsx`) — perlu audit.
  - [ ] Halaman Cicilan (`src/app/installments/page.tsx`) — perlu audit.
  - [ ] Halaman Dompet (`src/app/wallets/page.tsx`) — perlu audit.
  - [x] Halaman Pengaturan (`src/app/settings/page.tsx`) — sebagian besar hardcoded Bahasa Indonesia, perlu penerapan `useTranslation`. ⚠️

- [ ] **6.3. Komponen Modal & Form Interaktif**
  - [ ] Form Tambah Transaksi (`src/components/add-transaction-modal.tsx`)
  - [ ] Modal Scan OCR Nota (`src/components/receipt-upload-modal.tsx`)
  - [ ] Modal Edit Avatar (`src/components/avatar-editor-modal.tsx`)
  - [ ] Form Tambah Dompet (`src/components/add-wallet-modal.tsx`)
  - [ ] Form Edit Dompet (`src/components/edit-wallet-modal.tsx`)
  - [ ] Modal Bayar Angsuran (`src/components/pay-installment-modal.tsx`)
  - [ ] Form Tambah Cicilan (`src/components/add-installment-modal.tsx`)

- [ ] **6.4. Komponen Chart & Visualisasi Data**
  - [ ] Cashflow Chart (`src/components/cashflow-chart.tsx`)
  - [ ] Category Donut (`src/components/category-donut.tsx`)
  - [ ] AI Insights Card (`src/components/ai-insights-card.tsx`)

- [ ] **6.5. Halaman Login**
  - [ ] `src/app/login/page.tsx` — teks judul, subtitle, dan tombol login masih perlu diaudit untuk penerapan `useTranslation`.

---

## 7. 🗄️ Persistensi Database & API User Settings

- [x] **7.1. Skema Database Neon Postgres**
  - [x] Kolom `language` pada tabel `public.users` sudah ada (dilihat dari query di `GET /api/settings`). ✅
- [x] **7.2. API Routes**
  - [x] Endpoint `GET /api/settings` mengembalikan `language`. ✅
  - [x] Endpoint `POST /api/settings` memperbarui `language` pengguna. ✅
  - [ ] ❌ **CRITICAL BUG**: `VALID_LANGUAGES` di `POST /api/settings` hanya `['id', 'en']` — `'ms'` belum diizinkan (poin 2.1).

---

## 8. 🧪 Pengujian & Penjaminan Kualitas

- [x] **8.1. Unit Test Paritas Key JSON (`src/lib/__tests__/i18n.test.ts`)** ✅
  - [x] Test memvalidasi semua key identik antara `id.json`, `en.json`, `ms.json`. ✅
  - [x] Test memvalidasi tidak ada value kosong. ✅
  - [ ] ❌ Test akan **GAGAL** jika dijalankan sekarang karena `hero-balance-card.tsx` memanggil keys yang belum ada di JSON (misal: `dashboard.jan`, `common.income`). Perlu ditambahkan keys tersebut terlebih dahulu.

- [ ] **8.2. Pengujian Switcher Real-Time**
  - [ ] Setelah live reload dihilangkan, verifikasi pergantian bahasa mengubah teks tanpa merusak layout.
  - [ ] Test di ketiga browser (Chrome, Firefox, Safari/Edge).

- [x] **8.3. Verifikasi Build Production**
  - [x] `npm run build` berjalan sukses tanpa TypeScript error. ✅

---

## 🗂️ Ringkasan Prioritas Tindakan

| # | Item | Prioritas | Status |
|---|------|-----------|--------|
| 1 | Fix `VALID_LANGUAGES` di `api/settings/route.ts` (tambah `'ms'`) | 🔴 KRITIS | ❌ Belum |
| 2 | Tambah 14+ keys yang hilang di `id.json`, `en.json`, `ms.json` | 🔴 KRITIS | ❌ Belum |
| 3 | Perbaiki typo terjemahan Bahasa Melayu di `ms.json` | 🟠 Penting | ❌ Belum |
| 4 | Tambah `locale-change` event listener di `use-translation.ts` | 🟠 Penting | ❌ Belum |
| 5 | Tambah click-outside handler di `language-switcher.tsx` | 🟡 Normal | ❌ Belum |
| 6 | Pasang `LanguageSwitcher` di Topbar | 🟡 Normal | ❌ Belum |
| 7 | Terapkan `useTranslation` di seluruh komponen & halaman yang tersisa | 🟡 Normal | ❌ Belum |
| 8 | Audit & update terjemahan Halaman Settings (masih hardcoded ID) | 🟡 Normal | ⚠️ Sebagian |

---

*Terakhir diperbarui: 2026-08-07 — Audit kode dilakukan secara langsung*
