import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/spelling/db/kids', () => ({
  getKid: vi.fn(),
}));

vi.mock('@/lib/spelling/db/custom-lists-db', () => ({
  getWordsForList: vi.fn(),
}));

const mockRunnerStart = vi.fn();
const mockRunnerGetState = vi.fn();
vi.mock('@/lib/spelling/session/session-runner', () => {
  return {
    SessionRunner: class {
      start = mockRunnerStart;
      getState = mockRunnerGetState;
    },
  };
});

vi.mock('@/lib/spelling/db/words', () => ({
  getMaxWordLevel: vi.fn(),
  getWordsByIds: vi.fn(),
}));

vi.mock('@/lib/spelling/session/prompt', () => ({
  buildPromptData: vi.fn(),
}));

vi.mock('@/lib/spelling/db/session-runners', () => ({
  saveSessionRunnerState: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

import { POST } from '@/app/api/spelling/session/start/route';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getKid } from '@/lib/spelling/db/kids';
import { getWordsForList } from '@/lib/spelling/db/custom-lists-db';
import { getMaxWordLevel } from '@/lib/spelling/db/words';
import { buildPromptData } from '@/lib/spelling/session/prompt';
import { saveSessionRunnerState } from '@/lib/spelling/db/session-runners';
import { headers } from 'next/headers';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockGetKid = getKid as ReturnType<typeof vi.fn>;
const mockGetWordsForList = getWordsForList as ReturnType<typeof vi.fn>;
const mockGetMaxWordLevel = getMaxWordLevel as ReturnType<typeof vi.fn>;
const mockBuildPromptData = buildPromptData as ReturnType<typeof vi.fn>;
const mockSaveSessionRunnerState = saveSessionRunnerState as ReturnType<typeof vi.fn>;
const mockHeaders = headers as ReturnType<typeof vi.fn>;

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
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
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

  it('returns 500 when list lookup returns a query error', async () => {
    const { select } = setupSupabaseListQuery({
      data: null,
      error: { code: 'PGRST000', message: 'query failed' },
    });

    const response = await POST(makeRequest({ kidId: 'kid-1', listId: 'list-1' }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Database error while loading list' });
    expect(select).toHaveBeenCalledWith('id, owner_user_id');
    expect(mockGetWordsForList).not.toHaveBeenCalled();
  });

  it('returns 404 when list lookup returns null data', async () => {
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
