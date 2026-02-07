import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface PublicSessionStats {
  sessionId: string;
  kidId: string;
  attemptsTotal: number;
  correctTotal: number;
  levelEnd: number;
}

export async function getPublicSessionStats(
  sessionId: string
): Promise<PublicSessionStats | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_sessions')
    .select('id, kid_id, attempts_total, correct_total, level_end, ended_at')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;
  if (!data.ended_at) return null; // Only completed sessions

  return {
    sessionId: data.id,
    kidId: data.kid_id,
    attemptsTotal: data.attempts_total ?? 0,
    correctTotal: data.correct_total ?? 0,
    levelEnd: data.level_end ?? 3,
  };
}

export interface PublicAttemptRow {
  correct: boolean;
  created_at: string;
  user_elo_before: number | null;
  user_elo_after: number | null;
}

export async function getPublicKidAttemptHistory(
  kidId: string
): Promise<PublicAttemptRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_attempts')
    .select('correct, created_at, user_elo_before, user_elo_after')
    .eq('kid_id', kidId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as PublicAttemptRow[];
}

export async function getPublicSessionAttempts(
  sessionId: string
): Promise<PublicAttemptRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_attempts')
    .select('correct, created_at, user_elo_before, user_elo_after')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as PublicAttemptRow[];
}

export async function getWordBankCount(): Promise<number> {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('spelling_word_bank')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count ?? 0;
}
