import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockCreateClient = vi.fn();
const mockHeaders = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

import { POST } from './route';

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type SupabaseMockOptions = {
  listResult?: QueryResult<{ id: string; owner_user_id: string }>;
  kidResult?: QueryResult<{ id: string; parent_user_id: string }>;
  assignResult?: QueryResult<{ kid_id: string; list_id: string; is_enabled: boolean; weight: number }>;
};

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  let upsertPayload: Record<string, unknown> | null = null;

  const listResult = options.listResult ?? {
    data: { id: 'list-1', owner_user_id: 'user-1' },
    error: null,
  };
  const kidResult = options.kidResult ?? {
    data: { id: '11111111-1111-4111-8111-111111111111', parent_user_id: 'user-1' },
    error: null,
  };
  const assignResult = options.assignResult ?? {
    data: { kid_id: '11111111-1111-4111-8111-111111111111', list_id: 'list-1', is_enabled: true, weight: 1 },
    error: null,
  };

  const supabase = {
    from: (table: string) => {
      if (table === 'spelling_custom_lists') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(listResult),
            }),
          }),
        };
      }

      if (table === 'spelling_kids') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(kidResult),
            }),
          }),
        };
      }

      if (table === 'spelling_kid_list_assignments') {
        return {
          upsert: (payload: Record<string, unknown>) => {
            upsertPayload = payload;
            return {
              select: () => ({
                single: () => Promise.resolve(assignResult),
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase, getUpsertPayload: () => upsertPayload };
}

describe('POST /api/spelling/lists/[id]/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(new Request('http://localhost/api/spelling/lists/list-1/assign', {
      method: 'POST',
      body: JSON.stringify({ kidId: '11111111-1111-4111-8111-111111111111' }),
    }), {
      params: Promise.resolve({ id: 'list-1' }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid payloads', async () => {
    const { supabase } = createSupabaseMock();
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request('http://localhost/api/spelling/lists/list-1/assign', {
        method: 'POST',
        body: JSON.stringify({ isEnabled: true }),
      }),
      { params: Promise.resolve({ id: 'list-1' }) }
    );

    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid payload');
  });

  it('returns 404 when list is not found', async () => {
    const { supabase } = createSupabaseMock({
      listResult: { data: null, error: null },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request('http://localhost/api/spelling/lists/list-1/assign', {
        method: 'POST',
        body: JSON.stringify({ kidId: '11111111-1111-4111-8111-111111111111' }),
      }),
      { params: Promise.resolve({ id: 'list-1' }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'List or kid not found' });
  });

  it('returns 403 when user does not own list or learner', async () => {
    const { supabase } = createSupabaseMock({
      listResult: { data: { id: 'list-1', owner_user_id: 'someone-else' }, error: null },
      kidResult: { data: { id: '11111111-1111-4111-8111-111111111111', parent_user_id: 'someone-else' }, error: null },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request('http://localhost/api/spelling/lists/list-1/assign', {
        method: 'POST',
        body: JSON.stringify({ kidId: '11111111-1111-4111-8111-111111111111', isEnabled: false, weight: 3 }),
      }),
      { params: Promise.resolve({ id: 'list-1' }) }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns 200 and upserts assignment without phantom columns', async () => {
    const { supabase, getUpsertPayload } = createSupabaseMock({
      assignResult: {
        data: {
          kid_id: '11111111-1111-4111-8111-111111111111',
          list_id: 'list-1',
          is_enabled: false,
          weight: 5,
        },
        error: null,
      },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request('http://localhost/api/spelling/lists/list-1/assign', {
        method: 'POST',
        body: JSON.stringify({ kidId: '11111111-1111-4111-8111-111111111111', isEnabled: false, weight: 5 }),
      }),
      { params: Promise.resolve({ id: 'list-1' }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      assignment: {
        kid_id: '11111111-1111-4111-8111-111111111111',
        list_id: 'list-1',
        is_enabled: false,
        weight: 5,
      },
    });
    expect(getUpsertPayload()).toEqual({
      list_id: 'list-1',
      kid_id: '11111111-1111-4111-8111-111111111111',
      is_enabled: false,
      weight: 5,
    });
  });

  it('returns 500 on assignment write error', async () => {
    const { supabase } = createSupabaseMock({
      assignResult: { data: null, error: { message: 'db write failed' } },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request('http://localhost/api/spelling/lists/list-1/assign', {
        method: 'POST',
        body: JSON.stringify({ kidId: '11111111-1111-4111-8111-111111111111' }),
      }),
      { params: Promise.resolve({ id: 'list-1' }) }
    );

    expect(response.status).toBe(500);
    expect((await response.json()) as { error: string }).toMatchObject({
      error: 'Failed to assign list',
    });
  });
});
