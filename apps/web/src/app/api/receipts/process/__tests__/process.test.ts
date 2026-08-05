import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Session
vi.mock('@/lib/session', () => {
  return {
    getSession: vi.fn().mockResolvedValue({
      id: 'test-user-uuid',
      email: 'test@example.com',
      name: 'Test User',
    }),
  };
});

// Mock Neon DB
vi.mock('@/lib/db', () => {
  return {
    getDb: () => vi.fn().mockImplementation(async () => []),
  };
});

// Mock Cloudflare R2 S3 Client
vi.mock('@/lib/r2', () => {
  return {
    getR2Client: () => ({
      send: vi.fn().mockResolvedValue({
        ContentType: 'image/webp',
        Body: (async function* () {
          yield Buffer.from('fake-data');
        })(),
      }),
    }),
  };
});

// Mock Core OCR Library
vi.mock('@finance/core', () => {
  return {
    extractReceipt: vi.fn().mockResolvedValue({
      merchant: 'Alfamart',
      total: 25000,
      tanggal: '2026-08-01',
      kategori_saran: 'Makanan & Minuman',
      items: [{ name: 'Susu UHT', qty: 2, price: 12500 }],
    }),
  };
});

describe('POST /api/receipts/process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.R2_ACCOUNT_ID = 'test-account-id';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
  });

  it('should process JSON body with storage_path successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/receipts/process', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        storage_path: 'test-user-uuid/receipt-file.webp',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.merchant).toBe('Alfamart');
    expect(json.data.total).toBe(25000);
  });
});
