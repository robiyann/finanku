# 🌐 Goal Checklist: Fitur 3 Bahasa Sistem (ID 🇮🇩, EN 🇬🇧, MS 🇲🇾)

Dokumen ini berisi checklist langkah demi langkah dan kriteria verifikasi agar fitur **Multi-Language (System Language)** untuk 3 bahasa (Bahasa Indonesia, English, Bahasa Melayu) dapat berfungsi 100% sempurna di seluruh aplikasi **Finanku**.

---

## 1. ⚙️ Fondasi & Konfigurasi i18n
- [ ] **1.1. Konfigurasi Kode & Tipe Bahasa (`src/i18n.config.ts`)**
  - [ ] Mendefinisikan array `locales` secara ketat: `['id', 'en', 'ms'] as const`.
  - [ ] Menyediakan `defaultLocale = 'id'`.
  - [ ] Menyediakan mapping nama bahasa (`localeNames`) dan bendera (`localeFlags`).
- [ ] **1.2. Client-Side Translation Hook (`src/lib/use-translation.ts`)**
  - [ ] Mendukung parsing nested key (contoh: `t('nav.overview')`).
  - [ ] Menggunakan fallback otomatis ke Bahasa Indonesia (`id.json`) jika key tidak ditemukan pada bahasa aktif.
  - [ ] Memiliki event listener (`window.addEventListener('locale-change')`) agar perubahan bahasa langsung ter-render tanpa perlu hard reload halaman.
- [ ] **1.3. Persistensi Preferensi Lokal**
  - [ ] Menyimpan preferensi pengguna di `localStorage` dengan key `'preferred-locale'`.
  - [ ] Sinkronisasi cookie `preferred-locale` untuk kemungkinan Server-Side Rendering (SSR).

---

## 2. 📚 Kelengkapan File Kamus Bahasa (Translation Dictionaries)
- [ ] **2.1. Bahasa Indonesia (`src/messages/id.json`)**
  - [ ] Memiliki struktur JSON lengkap untuk seluruh modul aplikasi.
- [ ] **2.2. English (`src/messages/en.json`)**
  - [ ] Paritas struktur 100% identik dengan `id.json` (semua key tersedia).
  - [ ] Diterjemahkan ke Bahasa Inggris yang natural dan profesional.
- [ ] **2.3. Bahasa Melayu (`src/messages/ms.json`)**
  - [ ] Paritas struktur 100% identik dengan `id.json` (semua key tersedia).
  - [ ] Diterjemahkan ke Bahasa Melayu baku yang sesuai untuk istilah keuangan.
- [ ] **2.4. Struktur Modul JSON yang Wajib Di-cover:**
  - [ ] `nav`: Menu navigasi sidebar & header (Overview, Transactions, Recaps, Installments, Wallets, Settings).
  - [ ] `dashboard`: Ringkasan saldo, total pemasukan, pengeluaran, grafik, dan transaksi terbaru.
  - [ ] `transactions`: Tabel riwayat transaksi, filter, pencarian, tombol tambah/scan.
  - [ ] `recaps`: Rekap bulanan, breakdown kategori, dan laporan keuangan.
  - [ ] `installments`: Daftar cicilan, progres pembayaran, dan status aktif/lunas.
  - [ ] `wallets`: Manajemen dompet/akun, saldo awal, dan tipe dompet (Cash, Bank, E-Wallet).
  - [ ] `settings`: Pengaturan akun, ganti foto profil, preferensi bahasa, dan mata uang.
  - [ ] `modals`: Form tambah transaksi, modal scan OCR, modal edit foto profil.
  - [ ] `common`: Tombol umum (Simpan, Batal, Edit, Hapus, Loading, Sukses, Gagal).

---

## 3. 🎛️ Komponen Selector & UI Language Switcher
- [ ] **3.1. Header / Topbar Language Switcher (`src/components/language-switcher.tsx`)**
  - [ ] Dropdown UI modern dengan bendera (🇮🇩 ID, 🇬🇧 EN, 🇲🇾 MS) dan label nama bahasa.
  - [ ] Status pilihan bahasa aktif ditandai secara jelas (highlight / check icon).
  - [ ] Menutup dropdown otomatis ketika pengguna mengeklik di luar area switcher (click outside handler).
- [ ] **3.2. Integration di Halaman Settings (`src/app/settings/page.tsx`)**
  - [ ] Pilihan Bahasa Sistem dalam bentuk radio group atau custom selector di menu Preferensi.
  - [ ] Menyimpan pilihan bahasa pengguna secara langsung ke backend (jika terautentikasi) dan `localStorage`.

---

## 4. 🖼️ Penerapan Terjemahan pada Seluruh Halaman & Komponen
- [ ] **4.1. Navigasi & Shell Utama**
  - [ ] Topbar (`src/components/topbar.tsx`)
  - [ ] Sidebar (`src/components/sidebar.tsx`)
- [ ] **4.2. Halaman Utama & Fitur**
  - [ ] Halaman Dashboard (`src/app/page.tsx` & `src/components/hero-balance-card.tsx`)
  - [ ] Halaman Transaksi (`src/app/transactions/page.tsx` & `src/components/transactions-preview-table.tsx`)
  - [ ] Halaman Rekap (`src/app/recaps/page.tsx`)
  - [ ] Halaman Cicilan (`src/app/installments/page.tsx`)
  - [ ] Halaman Dompet (`src/app/wallets/page.tsx`)
  - [ ] Halaman Pengaturan (`src/app/settings/page.tsx`)
- [ ] **4.3. Modal & Form Interaktif**
  - [ ] Form Tambah Transaksi (`src/components/add-transaction-modal.tsx`)
  - [ ] Modal Scan OCR Nota (`src/components/receipt-upload-modal.tsx`)
  - [ ] Modal Edit Avatar (`src/components/avatar-editor-modal.tsx`)

---

## 5. 🗄️ Persistensi Database & API User Settings
- [ ] **5.1. Skema Database Neon Postgres**
  - [ ] Kolom `preferred_language` pada tabel `public.users` atau `public.user_settings` (default: `'id'`).
- [ ] **5.2. API Routes**
  - [ ] Endpoint `GET /api/settings` mengembalikan `preferred_language`.
  - [ ] Endpoint `PUT/POST /api/settings` memperbarui `preferred_language` pengguna.

---

## 6. 🧪 Pengujian & Penjaminan Kualitas (Testing & QA)
- [ ] **6.1. Skrip Verifikasi Paritas Key JSON**
  - [ ] Membuat skrip pengujian untuk memastikan jumlah dan nama key di `id.json`, `en.json`, dan `ms.json` 100% sama (tidak ada untranslated / missing keys).
- [ ] **6.2. Pengujian Switcher Real-Time**
  - [ ] Memastikan pergantian bahasa dari UI langsung mengubah teks tanpa merusak layout/wrapping UI.
- [ ] **6.3. Verifikasi Build Production**
  - [ ] `npm run build --workspace=finstats-web` berjalan sukses tanpa ada type error atau missing import.

---

*Terakhir diperbarui: 2026-08-07*
