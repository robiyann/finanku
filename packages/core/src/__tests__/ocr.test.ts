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

    expect(result).toMatchObject(mockData);
  });

  it('should retry automatically when first attempt fails and succeed on second attempt', async () => {
    const mockData = {
      merchant: 'Indomaret',
      total: 15000,
      tanggal: '2026-08-05',
      kategori_saran: 'Makanan & Minuman',
      items: [{ name: 'Roti', qty: 1, price: 15000 }],
    };

    const openAiInstance = new OpenAI({ apiKey: 'test' });
    // First attempt fails (invalid JSON / empty content)
    vi.mocked(openAiInstance.chat.completions.create)
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'not valid json' } }],
      } as any)
      // Second attempt succeeds
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockData) } }],
      } as any);

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceipt(buffer, 'image/webp', {
      categories: ['Makanan & Minuman'],
      apiKey: 'test-api-key',
      maxRetries: 2,
    });

    expect(openAiInstance.chat.completions.create).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject(mockData);
  });

  it('should throw an error after max retries fail', async () => {
    const invalidMockData = {
      merchant: 'Alfamart',
      total: -100, // Invalid total
      tanggal: 'invalid-date',
      kategori_saran: 'Makanan & Minuman',
      items: [],
    };

    const openAiInstance = new OpenAI({ apiKey: 'test' });
    vi.mocked(openAiInstance.chat.completions.create).mockResolvedValue({
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
        maxRetries: 2,
      })
    ).rejects.toThrow(/Format data nota dari AI tidak valid/);

    expect(openAiInstance.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
