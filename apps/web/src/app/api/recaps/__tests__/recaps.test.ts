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

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Mocked narrative recap from AI',
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe('POST /api/recaps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  it('should generate recap narrative successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/recaps', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        period: 'month',
        period_start: '2026-08-01',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.recap.narrative).toBe('Mocked narrative recap from AI');
  });
});
