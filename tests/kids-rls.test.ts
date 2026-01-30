import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

const TEST_URL = 'https://test.supabase.co'
const TEST_ANON_KEY = 'test-anon-key'
const TEST_SERVICE_KEY = 'test-service-role-key'

// Use vi.hoisted to set up env vars before any imports
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

// Use vi.hoisted to create mock before hoisting
const mockCreateClient = vi.hoisted(() => vi.fn(() => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
})))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

// Import after mocking
import { getSupabaseClient } from '@/lib/spelling/db/kids'

describe('getSupabaseClient RLS pattern', () => {
  beforeEach(() => {
    mockCreateClient.mockClear()
  })

  it('uses anon key when useServiceRole is false', () => {
    getSupabaseClient(false)

    expect(mockCreateClient).toHaveBeenCalledWith(TEST_URL, TEST_ANON_KEY)
  })

  it('uses service role key when useServiceRole is true', () => {
    getSupabaseClient(true)

    expect(mockCreateClient).toHaveBeenCalledWith(TEST_URL, TEST_SERVICE_KEY)
  })

  it('adds auth header when authToken provided with anon key', () => {
    const authToken = 'user-jwt-token'
    getSupabaseClient(false, authToken)

    expect(mockCreateClient).toHaveBeenCalledWith(TEST_URL, TEST_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    })
  })
})
