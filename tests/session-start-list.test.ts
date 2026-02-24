import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

var mockGetSession: ReturnType<typeof vi.fn>;
var mockCreateClient: ReturnType<typeof vi.fn>;
var mockGetKid: ReturnType<typeof vi.fn>;
var mockGetWordsForList: ReturnType<typeof vi.fn>;
var mockSessionRunnerCtor: ReturnType<typeof vi.fn>;
var mockRunnerStart: ReturnType<typeof vi.fn>;
var mockRunnerGetState: ReturnType<typeof vi.fn>;
var mockGetMaxWordLevel: ReturnType<typeof vi.fn>;
var mockBuildPromptData: ReturnType<typeof vi.fn>;
var mockSaveSessionRunnerState: ReturnType<typeof vi.fn>;
var mockHeaders: ReturnType<typeof vi.fn>;

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

vi.mock('@/lib/spelling/db/kids', () => {
  mockGetKid = vi.fn();
  return {
    getKid: mockGetKid,
  };
});

vi.mock('@/lib/spelling/db/custom-lists-db', () => {
  mockGetWordsForList = vi.fn();
  return {
    getWordsForList: mockGetWordsForList,
  };
});

vi.mock('@/lib/spelling/session/session-runner', () => {
  mockSessionRunnerCtor = vi.fn();
  mockRunnerStart = vi.fn();
  mockRunnerGetState = vi.fn();

  class MockSessionRunner {
    constructor() {
      mockSessionRunnerCtor();
    }

    start(...args: unknown[]) {
      return mockRunnerStart(...args);
    }

    getState(...args: unknown[]) {
      return mockRunnerGetState(...args);
    }
  }

  return {
    SessionRunner: MockSessionRunner,
  };
});

vi.mock('@/lib/spelling/db/words', () => {
  mockGetMaxWordLevel = vi.fn();
  return {
    getMaxWordLevel: mockGetMaxWordLevel,
    getWordsByIds: vi.fn(),
  };
});

vi.mock('@/lib/spelling/session/prompt', () => {
  mockBuildPromptData = vi.fn();
  return {
    buildPromptData: mockBuildPromptData,
  };
});

vi.mock('@/lib/spelling/db/session-runners', () => {
  mockSaveSessionRunnerState = vi.fn();
  return {
    saveSessionRunnerState: mockSaveSessionRunnerState,
  };
});

vi.mock('next/headers', () => {
  mockHeaders = vi.fn();
  return {
    headers: mockHeaders,
  };
});

import { POST } from '@/app/api/spelling/session/start/route';

type ListQueryResult = {
  data: { id: string; owner_user_id: string } | null;
  error: unknown;
};

function makeRequest(payload: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/spelling/session/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function setupSupabaseListQuery(result: ListQueryResult) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  mockCreateClient.mockReturnValue({ from });

  return { select };
}

describe('POST /api/spelling/session/start listId validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    mockRunnerStart.mockResolvedValue({
      sessionId: 'session-1',
      currentWord: { id: 'word-1' },
      wordIndex: 0,
      level: 2,
    });
    mockRunnerGetState.mockReturnValue({});

    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetKid.mockResolvedValue({
      id: 'kid-1',
      parent_user_id: 'user-1',
      level_current: 2,
      elo_rating: 1500,
      total_attempts: 10,
      successful_attempts: 7,
      audio_mode: 'audio',
    });
    mockGetWordsForList.mockResolvedValue([{ id: 'word-1' }, { id: 'word-2' }]);
    mockGetMaxWordLevel.mockResolvedValue(10);
    mockBuildPromptData.mockReturnValue({ text: 'prompt' });
    mockSaveSessionRunnerState.mockResolvedValue(undefined);
  });

  it('returns 404 when list lookup .single() returns error', async () => {
    const { select } = setupSupabaseListQuery({
      data: null,
      error: { message: 'query failed' },
    });

    const response = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'List not found' });
    expect(select).toHaveBeenCalledWith('id, owner_user_id');
    expect(mockGetWordsForList).not.toHaveBeenCalled();
  });

  it('returns 404 when list lookup .single() returns null data', async () => {
    const { select } = setupSupabaseListQuery({ data: null, error: null });

    const response = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'List not found' });
    expect(select).toHaveBeenCalledWith('id, owner_user_id');
  });

  it('returns 404 when list owner does not match session user', async () => {
    const { select } = setupSupabaseListQuery({
      data: { id: 'list-1', owner_user_id: 'user-2' },
      error: null,
    });

    const response = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'List not found' });
    expect(select).toHaveBeenCalledWith('id, owner_user_id');
  });

  it('returns 200 when list exists and owner matches session user', async () => {
    const { select } = setupSupabaseListQuery({
      data: { id: 'list-1', owner_user_id: 'user-1' },
      error: null,
    });

    const response = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: 'session-1',
      currentWord: { id: 'word-1' },
      currentPrompt: { text: 'prompt' },
      wordIndex: 0,
      level: 2,
    });
    expect(select).toHaveBeenCalledWith('id, owner_user_id');
    expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-service-key');
  });

  it('returns 400 when list has no active words', async () => {
    const { select } = setupSupabaseListQuery({
      data: { id: 'list-1', owner_user_id: 'user-1' },
      error: null,
    });
    mockGetWordsForList.mockResolvedValue([]);

    const response = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'List has no active words' });
    expect(select).toHaveBeenCalledWith('id, owner_user_id');
  });

  it('returns 400 when both listId and wordIds are provided', async () => {
    const response = await POST(
      makeRequest({
        kidId: 'kid-1',
        listId: 'list-1',
        wordIds: ['word-1'],
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'listId and wordIds are mutually exclusive',
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
