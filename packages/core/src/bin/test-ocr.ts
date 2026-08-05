import fs from 'fs';
import path from 'path';
import { extractReceipt } from '../ocr';

// Manual parser untuk membaca .env.local secara lokal
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      const val = trimmed.slice(index + 1).trim();
      process.env[key] = val;
    });
  }
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const imagePath = args[0] || 'nota-test.webp';

  const fullPath = path.resolve(process.cwd(), imagePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File tidak ditemukan di ${fullPath}`);
    process.exit(1);
  }

  console.log(`Membaca file struk: ${fullPath}...`);
  const buffer = fs.readFileSync(fullPath);
  
  let mimeType = 'image/jpeg';
  if (imagePath.endsWith('.webp')) mimeType = 'image/webp';
  else if (imagePath.endsWith('.png')) mimeType = 'image/png';

  const categories = [
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Tagihan',
    'Hiburan',
    'Kesehatan',
    'Pendidikan',
    'Lainnya'
  ];

  console.log('Mengirim gambar struk ke AI Router...');
  try {
    const result = await extractReceipt(buffer, mimeType, {
      categories,
      today: new Date().toISOString().split('T')[0]
    });
    console.log('\n=== HASIL PARSING OCR ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Gagal melakukan OCR nota:', error);
    process.exit(1);
  }
}

main();
