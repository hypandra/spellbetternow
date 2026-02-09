import { createClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface Session {
  id: string;
  kid_id: string;
  started_at: string;
  ended_at?: string;
  level_start: number;
  level_end?: number;
  mini_sets_completed: number;
  attempts_total: number;
  correct_total: number;
  current_word_ids: string[];
  current_word_index: number;
  current_level: number;
  created_at: string;
  updated_at: string;
}

export interface AttemptData {
  word_id: string;
  word_presented: string;
  user_spelling: string;
  correct: boolean;
  response_ms: number;
  replay_count?: number;
  edit_count?: number;
  prompt_mode?: 'audio' | 'no-audio';
}

export interface MiniSetSummaryData {
  index: number;
  level_effective: number;
  correct_count: number;
  words_json: Array<{ word_id: string; correct: boolean }>;
  lesson_json?: {
    pattern: string;
    explanation: string;
    contrast: string;
    question: string;
    answer: string;
  };
}

function getSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function createSession(kidId: string, levelStart: number, initialWordIds: string[]): Promise<Session> {
  const supabase = getSupabaseClient();
  const { data, error } = (await supabase
    .from('spelling_sessions')
    .insert({
      kid_id: kidId,
      level_start: levelStart,
      current_level: levelStart,
      current_word_ids: initialWordIds,
      current_word_index: 0,
    })
    .select()
    .single()) as { data: Session; error: PostgrestError | null };

  if (error) throw error;
  return data;
}

export async function getSessionState(sessionId: string): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = (await supabase
    .from('spelling_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()) as { data: Session | null; error: PostgrestError | null };

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateSessionState(
  sessionId: string,
  wordIds: string[],
  wordIndex: number,
  level?: number
): Promise<void> {
  const supabase = getSupabaseClient();
  const updateData: any = {
    current_word_ids: wordIds,
    current_word_index: wordIndex,
    updated_at: new Date().toISOString(),
  };
  if (level !== undefined) {
    updateData.current_level = level;
  }

  const { error } = await supabase
    .from('spelling_sessions')
    .update(updateData)
    .eq('id', sessionId);

  if (error) throw error;
}

export async function endSession(sessionId: string, stats: {
  levelEnd: number;
  miniSetsCompleted: number;
  attemptsTotal: number;
  correctTotal: number;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('spelling_sessions')
    .update({
      ended_at: new Date().toISOString(),
      level_end: stats.levelEnd,
      mini_sets_completed: stats.miniSetsCompleted,
      attempts_total: stats.attemptsTotal,
      correct_total: stats.correctTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function logAttempt(
  sessionId: string,
  kidId: string,
  attemptData: AttemptData,
  eloMeta?: {
    userEloBefore: number;
    userEloAfter: number;
    wordEloBefore: number;
    wordEloAfter: number;
  }
): Promise<string | undefined> {
  const supabase = getSupabaseClient();
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Spelling Attempt] saving user input', {
      sessionId,
      kidId,
      wordId: attemptData.word_id,
      wordPresented: attemptData.word_presented,
      userSpelling: attemptData.user_spelling,
    });
  }
  const { data: insertedAttempt, error } = await supabase
    .from('spelling_attempts')
    .insert({
      session_id: sessionId,
      kid_id: kidId,
      word_id: attemptData.word_id,
      word_presented: attemptData.word_presented,
      user_spelling: attemptData.user_spelling,
      correct: attemptData.correct,
      response_ms: attemptData.response_ms,
      replay_count: attemptData.replay_count || 0,
      edit_count: attemptData.edit_count,
      user_elo_before: eloMeta?.userEloBefore,
      user_elo_after: eloMeta?.userEloAfter,
      word_elo_before: eloMeta?.wordEloBefore,
      word_elo_after: eloMeta?.wordEloAfter,
      prompt_mode: attemptData.prompt_mode || null,
    })
    .select('id')
    .single();

  if (error) throw error;

  const { error: updateError } = await supabase.rpc('increment_session_stats', {
    session_id: sessionId,
    is_correct: attemptData.correct,
  });

  if (updateError) {
    const session = await getSessionState(sessionId);
    if (session) {
      await supabase
        .from('spelling_sessions')
        .update({
          attempts_total: session.attempts_total + 1,
          correct_total: session.correct_total + (attemptData.correct ? 1 : 0),
        })
        .eq('id', sessionId);
    }
  }

  return insertedAttempt?.id;
}

export async function createMiniSetSummary(sessionId: string, summaryData: MiniSetSummaryData): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('spelling_mini_set_summaries')
    .insert({
      session_id: sessionId,
      index: summaryData.index,
      level_effective: summaryData.level_effective,
      correct_count: summaryData.correct_count,
      words_json: summaryData.words_json,
      lesson_json: summaryData.lesson_json,
    });

  if (error) throw error;

  const { error: updateError } = await supabase
    .from('spelling_sessions')
    .update({
      mini_sets_completed: summaryData.index + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (updateError) throw updateError;
}

export async function getSessionAttempts(sessionId: string): Promise<AttemptData[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_attempts')
    .select('word_id, word_presented, user_spelling, correct, response_ms, replay_count, edit_count, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: AttemptData) => ({
    word_id: row.word_id,
    word_presented: row.word_presented,
    user_spelling: row.user_spelling,
    correct: row.correct,
    response_ms: row.response_ms,
    replay_count: row.replay_count,
    edit_count: row.edit_count,
  }));
}

export async function getSessionWordIds(sessionId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_attempts')
    .select('word_id')
    .eq('session_id', sessionId);

  if (error) throw error;
  return [...new Set((data || []).map(a => a.word_id))];
}
