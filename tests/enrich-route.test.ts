import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

var mockGetSession: ReturnType<typeof vi.fn>;
var mockCreateClient: ReturnType<typeof vi.fn>;
var mockHeaders: ReturnType<typeof vi.fn>;
var mockFetch: ReturnType<typeof vi.fn>;

vi.mock('@/lib/auth', () => {
  mockGetSession = vi.fn();
  return {
    auth: {
      api: {
        getSession: mockGetSession,
      },
    },
  };
});

vi.mock('@supabase/supabase-js', () => {
  mockCreateClient = vi.fn();
  return {
    createClient: mockCreateClient,
  };
});

vi.mock('next/headers', () => {
  mockHeaders = vi.fn();
  return {
    headers: mockHeaders,
  };
});

import { POST } from '@/app/api/spelling/import/enrich/route';

function makeRequest(payload: unknown) {
  return new NextRequest('http://localhost/api/spelling/import/enrich', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

type WordBankRow = {
  word: string;
  definition: string | null;
  example_sentence: string | null;
  part_of_speech: string | null;
  level: number | null;
  current_elo: number | null;
};

function setupSupabaseWordBankQuery(result: { data: WordBankRow[]; error: unknown }) {
  const eq = vi.fn().mockResolvedValue(result);
  const inFn = vi.fn(() => ({ eq }));
  const select = vi.fn(() => ({ in: inFn }));
  const from = vi.fn(() => ({ select }));

  mockCreateClient.mockReturnValue({ from });

  return { from, select, inFn, eq };
}

function makeOpenAiSuccessResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }),
    text: vi.fn().mockResolvedValue(''),
  };
}

describe('POST /api/spelling/import/enrich', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.OPENAI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return makeOpenAiSuccessResponse(JSON.stringify({ enriched: [] }));
      }
      throw new Error(`Unexpected fetch URL: ${url} ${String(init?.method ?? '')}`);
    });
    (global as typeof globalThis & { fetch: typeof mockFetch }).fetch = mockFetch;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(makeRequest({ words: ['apple'] }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid payload shapes', async () => {
    const cases = [{}, { words: [] }, { words: Array.from({ length: 21 }, (_, i) => `w${i}`) }];

    for (const payload of cases) {
      const response = await POST(makeRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid payload');
    }
  });

  it('returns 400 when all words are invalid after normalization', async () => {
    const response = await POST(
      makeRequest({
        words: ['   ', '!!', 'ab', 'supercalifragilistic'],
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'No valid words provided' });
  });

  it('returns enriched word_bank results without calling OpenAI when all words exist in bank', async () => {
    setupSupabaseWordBankQuery({
      data: [
        {
          word: 'apple',
          definition: 'A fruit',
          example_sentence: 'I ate an apple.',
          part_of_speech: 'noun',
          level: 2,
          current_elo: 1200,
        },
      ],
      error: null,
    });

    const response = await POST(makeRequest({ words: [' Apple '] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enriched: [
        {
          word: 'apple',
          definition: 'A fruit',
          example_sentence: 'I ate an apple.',
          part_of_speech: 'noun',
          level: 2,
          estimated_elo: 1200,
          source: 'word_bank',
        },
      ],
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls OpenAI and returns llm source for words not in word bank', async () => {
    setupSupabaseWordBankQuery({ data: [], error: null });

    const llmContent = JSON.stringify({
      enriched: [
        {
          word: 'zephyr',
          definition: 'A soft, gentle breeze.',
          example_sentence: 'A zephyr moved through the field.',
          part_of_speech: 'noun',
          level: 4,
          estimated_elo: 1650,
        },
      ],
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return makeOpenAiSuccessResponse(llmContent);
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const response = await POST(makeRequest({ words: ['zephyr'] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enriched: [
        {
          word: 'zephyr',
          definition: 'A soft, gentle breeze.',
          example_sentence: 'A zephyr moved through the field.',
          part_of_speech: 'noun',
          level: 4,
          estimated_elo: 1650,
          source: 'llm',
        },
      ],
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns mixed results from word bank and OpenAI for bank + novel words', async () => {
    setupSupabaseWordBankQuery({
      data: [
        {
          word: 'apple',
          definition: 'A fruit',
          example_sentence: 'Apple pie is tasty.',
          part_of_speech: 'noun',
          level: 2,
          current_elo: 1300,
        },
      ],
      error: null,
    });

    const llmContent = JSON.stringify({
      enriched: [
        {
          word: 'zephyr',
          definition: 'A mild breeze.',
          example_sentence: 'A zephyr crossed the hill.',
          part_of_speech: 'noun',
          level: 4,
          estimated_elo: 1600,
        },
      ],
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return makeOpenAiSuccessResponse(llmContent);
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const response = await POST(makeRequest({ words: ['apple', 'zephyr'] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enriched: [
        {
          word: 'apple',
          definition: 'A fruit',
          example_sentence: 'Apple pie is tasty.',
          part_of_speech: 'noun',
          level: 2,
          estimated_elo: 1300,
          source: 'word_bank',
        },
        {
          word: 'zephyr',
          definition: 'A mild breeze.',
          example_sentence: 'A zephyr crossed the hill.',
          part_of_speech: 'noun',
          level: 4,
          estimated_elo: 1600,
          source: 'llm',
        },
      ],
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when OpenAI content is not parseable JSON', async () => {
    setupSupabaseWordBankQuery({ data: [], error: null });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return makeOpenAiSuccessResponse('not-json');
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const response = await POST(makeRequest({ words: ['zephyr'] }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: 'Word enrichment failed — please try again' });
  });

  it('returns 500 when OpenAI request is non-ok', async () => {
    setupSupabaseWordBankQuery({ data: [], error: null });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return {
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue('upstream failed'),
          json: vi.fn().mockResolvedValue({}),
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const response = await POST(makeRequest({ words: ['zephyr'] }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });

  it('sends model and temperature in OpenAI request body', async () => {
    setupSupabaseWordBankQuery({ data: [], error: null });

    const response = await POST(makeRequest({ words: ['zephyr'] }));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');

    const parsedBody = JSON.parse((init.body as string) ?? '{}') as {
      model?: string;
      temperature?: number;
      messages?: unknown[];
    };

    expect(parsedBody.model).toBe('gpt-4o-mini');
    expect(parsedBody.temperature).toBe(0.2);
    expect(Array.isArray(parsedBody.messages)).toBe(true);
  });

  it('looks up word bank with normalized words and active filter', async () => {
    const { inFn, eq } = setupSupabaseWordBankQuery({ data: [], error: null });

    const response = await POST(makeRequest({ words: [' Apple ', 'BANANA!!!', 'banana'] }));

    expect(response.status).toBe(200);
    expect(inFn).toHaveBeenCalledWith('word', ['apple', 'banana']);
    expect(eq).toHaveBeenCalledWith('is_active', true);
  });
});
