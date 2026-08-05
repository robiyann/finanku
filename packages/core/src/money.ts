/**
 * Dapatkan jumlah desimal (unit terkecil) untuk setiap mata uang.
 * Contoh: IDR = 0 desimal, MYR = 2 desimal (sen), USD = 2 desimal (cents).
 */
export function getCurrencyDecimals(currency: string): number {
  const c = currency.toUpperCase();
  if (['IDR', 'JPY', 'KRW'].includes(c)) {
    return 0;
  }
  return 2; // Default ke 2 desimal (cents/sen) untuk USD, MYR, SGD, EUR, dll.
}

/**
 * Dapatkan locale standar internasional untuk menentukan aturan pemisah ribuan (titik/koma).
 * Contoh: 
 * - IDR (Indonesia), EUR (Jerman/Eropa): Ribuan menggunakan titik (.) e.g. 1.400.000
 * - USD (AS), SGD (Singapura), MYR (Malaysia), GBP (Inggris), JPY (Jepang): Ribuan menggunakan koma (,) e.g. 1,400,000
 */
export function getCurrencyLocale(currency: string): string {
  const c = currency.toUpperCase();
  switch (c) {
    case 'IDR': return 'id-ID';
    case 'MYR': return 'ms-MY';
    case 'EUR': return 'de-DE'; // Menggunakan titik untuk ribuan
    case 'JPY': return 'ja-JP';
    case 'SGD': return 'en-SG';
    case 'GBP': return 'en-GB';
    case 'AUD': return 'en-AU';
    case 'CAD': return 'en-CA';
    default: return 'en-US'; // USD & default menggunakan koma
  }
}

/**
 * Format nominal angka ke string resmi mata uang.
 * @param amount Nilai nominal
 * @param currency Kode mata uang (IDR, USD, EUR, MYR, dll)
 */
export function formatMoney(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  const decimals = getCurrencyDecimals(c);
  const value = decimals === 0 ? amount : amount / Math.pow(10, decimals);
  const locale = getCurrencyLocale(c);

  if (c === 'IDR') {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
    return `Rp ${formatted}`;
  }

  if (c === 'MYR') {
    const formatted = new Intl.NumberFormat('ms-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `RM ${formatted}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: c,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
    return `${c} ${formatted}`;
  }
}

/**
 * Format angka input secara real-time saat pengguna mengetik angka di form input.
 * Contoh IDR: 1400000 -> "1.400.000"
 * Contoh USD: 1400000 -> "1,400,000"
 */
export function formatLiveCurrencyInput(value: string | number, currency: string): string {
  if (value === '' || value === null || value === undefined) return '';
  const c = currency.toUpperCase();
  const locale = getCurrencyLocale(c);

  // Ambil hanya karakter angka
  const digitsOnly = String(value).replace(/\D/g, '');
  if (!digitsOnly) return '';

  const num = parseInt(digitsOnly, 10);
  if (isNaN(num)) return '';

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Ekstrak angka murni dari string input yang diformat.
 * Contoh: "1.400.000" atau "$1,400,000" -> 1400000
 */
export function parseLiveCurrencyInput(formatted: string): number {
  const digitsOnly = String(formatted || '').replace(/\D/g, '');
  return parseInt(digitsOnly, 10) || 0;
}

/**
 * Parse input teks menjadi angka integer unit terkecil berdasarkan mata uang.
 */
export function parseAmount(input: string, currency: string): number | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  const c = currency.toUpperCase();
  const decimals = getCurrencyDecimals(c);

  // Bersihkan pemisah ribuan/simbol mata uang jika ada
  let text = clean
    .replace(/rp/g, '')
    .replace(/rm/g, '')
    .replace(/\$/g, '')
    .replace(/\s/g, '');

  // Cek pengali khusus Indonesia / Inggris
  let multiplier = 1;
  
  if (text.endsWith('jt') || text.endsWith('juta')) {
    multiplier = 1000000;
    text = text.replace(/jt|juta/g, '');
  } else if (text.endsWith('m') && !text.endsWith('rm')) {
    multiplier = 1000000;
    text = text.replace(/m/g, '');
  } else if (text.endsWith('k') || text.endsWith('rb') || text.endsWith('ribu')) {
    multiplier = 1000;
    text = text.replace(/k|rb|ribu/g, '');
  }

  // Ganti koma dengan titik untuk parsing desimal standar
  if (text.includes('.') && text.includes(',')) {
    if (c === 'IDR' || c === 'EUR') {
      text = text.replace(/\./g, '').replace(/,/g, '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (text.includes(',')) {
    const parts = text.split(',');
    if (parts[parts.length - 1].length === 3) {
      text = text.replace(/,/g, '');
    } else {
      text = text.replace(/,/g, '.');
    }
  } else if (text.includes('.')) {
    if (c === 'IDR' || c === 'EUR') {
      const parts = text.split('.');
      if (parts[parts.length - 1].length === 3) {
        text = text.replace(/\./g, '');
      }
    }
  }

  const num = parseFloat(text);
  if (isNaN(num)) return null;

  const rawValue = num * multiplier;

  // Konversi ke unit terkecil
  return Math.round(rawValue * Math.pow(10, decimals));
}
