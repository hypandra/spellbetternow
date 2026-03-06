import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mock setup ---

const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockSupabaseFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

vi.mock('@/lib/spelling/db/kids', () => ({
  getKid: vi.fn().mockResolvedValue({
    id: 'kid-1',
    parent_user_id: 'user-1',
    level_current: 3,
    elo_rating: 1500,
    total_attempts: 0,
    successful_attempts: 0,
    audio_mode: 'audio',
  }),
}));

vi.mock('@/lib/spelling/db/words', () => ({
  getMaxWordLevel: vi.fn().mockResolvedValue(7),
  getWordsByIds: vi.fn().mockResolvedValue([]),
  getWordResolvingCustomList: vi.fn(),
}));

vi.mock('@/lib/spelling/db/custom-lists-db', () => ({
  getWordsForList: vi.fn().mockResolvedValue([
    { id: 'w1', word: 'apple', level: 2, definition: '', example_sentence: '' },
    { id: 'w2', word: 'banana', level: 2, definition: '', example_sentence: '' },
    { id: 'w3', word: 'cherry', level: 2, definition: '', example_sentence: '' },
    { id: 'w4', word: 'date', level: 2, definition: '', example_sentence: '' },
    { id: 'w5', word: 'elderberry', level: 2, definition: '', example_sentence: '' },
  ]),
}));

vi.mock('@/lib/spelling/session/prompt', () => ({
  buildPromptData: vi.fn().mockReturnValue({ word: 'apple', mode: 'audio' }),
}));

vi.mock('@/lib/spelling/db/session-runners', () => ({
  saveSessionRunnerState: vi.fn().mockResolvedValue(undefined),
}));

const mockRunnerStart = vi.fn().mockResolvedValue({
  sessionId: 'session-1',
  currentWord: { id: 'w1', word: 'apple', level: 2 },
  wordIndex: 0,
  level: 3,
});
const mockGetState = vi.fn().mockReturnValue({});
vi.mock('@/lib/spelling/session/session-runner', () => {
  return {
    SessionRunner: class {
      start = mockRunnerStart;
      getState = mockGetState;
    },
  };
});

// --- Helpers ---

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/spelling/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockSupabaseListQuery(result: { data: unknown; error: unknown }) {
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

// --- Tests ---

import { POST } from './route';

describe('POST /api/spelling/session/start — list validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns 200 when list exists and belongs to the session user', async () => {
    mockSupabaseListQuery({
      data: { id: 'list-1', owner_user_id: 'user-1' },
      error: null,
    });

    const res = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sessionId).toBeDefined();
  });

  it('returns 404 when list does not exist', async () => {
    mockSupabaseListQuery({ data: null, error: null });

    const res = await POST(makeRequest({ kidId: 'kid-1', listId: 'nonexistent' }));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('List not found');
  });

  it('returns 404 when list belongs to a different user', async () => {
    mockSupabaseListQuery({
      data: { id: 'list-1', owner_user_id: 'other-user' },
      error: null,
    });

    const res = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('List not found');
  });

  it('returns 500 with database error message when Supabase query fails', async () => {
    mockSupabaseListQuery({
      data: null,
      error: { code: 'PGRST000', message: 'connection refused' },
    });

    const res = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Database error while loading list');
  });
});
