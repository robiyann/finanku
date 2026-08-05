import { describe, expect, it, vi, beforeEach } from 'vitest';
import { extractReceipt } from '../ocr';
import OpenAI from 'openai';

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    // Export mockCreate so it can be referenced in tests
    _mockCreate: mockCreate,
  };
});

describe('extractReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully parse a valid OCR response', async () => {
    const mockData = {
      merchant: 'Alfamart',
      total: 50000,
      tanggal: '2026-08-01',
      kategori_saran: 'Makanan & Minuman',
      items: [{ name: 'Susu', qty: 2, price: 25000 }],
    };

    // Get the mock instance
    const openAiInstance = new OpenAI({ apiKey: 'test' });
    vi.mocked(openAiInstance.chat.completions.create).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockData),
          },
        },
      ],
    } as any);

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceipt(buffer, 'image/webp', {
      categories: ['Makanan & Minuman', 'Lainnya'],
      apiKey: 'test-api-key',
      baseUrl: 'https://test.api/v1',
      model: 'test-model',
    });

    expect(result).toEqual(mockData);
  });

  it('should throw an error if validation fails', async () => {
    const invalidMockData = {
      merchant: 'Alfamart',
      total: -100, // Total should be positive
      tanggal: 'invalid-date',
      kategori_saran: 'Makanan & Minuman',
      items: [],
    };

    const openAiInstance = new OpenAI({ apiKey: 'test' });
    vi.mocked(openAiInstance.chat.completions.create).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(invalidMockData),
          },
        },
      ],
    } as any);

    const buffer = Buffer.from('fake-image-data');
    await expect(
      extractReceipt(buffer, 'image/webp', {
        categories: ['Makanan & Minuman'],
        apiKey: 'test-api-key',
      })
    ).rejects.toThrow(/Gagal memvalidasi skema hasil OCR/);
  });
});
