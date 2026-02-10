import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface Word {
  id: string;
  word: string;
  level: number;
  base_elo?: number;
  current_elo?: number;
  pattern?: string;
  frequency_band?: string;
  notes?: string;
  definition?: string;
  example_sentence?: string;
  part_of_speech?: string;
  not_synonyms?: string[];
  letter_fragments?: string[];
  rhyme_hints?: string[];
  ipa?: string;
  phonetic?: string;
  is_active: boolean;
  created_at: string;
}

const MINI_SET_QUERY_LIMIT = 50;
const RECENT_ATTEMPT_COOLDOWN = 20;

function getSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function formatExcludeFilter(ids: string[]): string {
  return `(${ids.map(id => `'${id}'`).join(',')})`;
}

function shuffleWords<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export async function getWordsForMiniSetByElo(
  targetElo: number,
  kidId: string,
  excludeWordIds: string[],
  recentSeenWindowDays = 7
): Promise<Word[]> {
  const supabase = getSupabaseClient();
  const toleranceSteps = [100, 200, 400, 800];
  let allWords: Word[] | null = null;
  let error: Error | null = null;

  for (const tolerance of toleranceSteps) {
    let query = supabase
      .from('spelling_word_bank')
      .select('*')
      .eq('is_active', true)
      .gte('current_elo', Math.max(0, targetElo - tolerance))
      .lte('current_elo', targetElo + tolerance)
      .limit(MINI_SET_QUERY_LIMIT);

    if (excludeWordIds.length > 0) {
      query = query.not('id', 'in', formatExcludeFilter(excludeWordIds));
    }

    const result = await query;
    allWords = result.data as Word[] | null;
    error = result.error as Error | null;

    if (allWords && allWords.length >= 5) {
      break;
    }
  }

  if (!allWords || allWords.length === 0) {
    const fallback = await supabase
      .from('spelling_word_bank')
      .select('*')
      .eq('is_active', true)
      .limit(MINI_SET_QUERY_LIMIT);
    allWords = fallback.data as Word[] | null;
    error = fallback.error as Error | null;
  }

  if (error) throw error;
  if (!allWords || allWords.length === 0) return [];

  const { data: recentAttempts } = await supabase
    .from('spelling_attempts')
    .select('word_id, correct')
    .eq('kid_id', kidId)
    .order('created_at', { ascending: false })
    .limit(RECENT_ATTEMPT_COOLDOWN);

  const recentMissed = new Set<string>();
  const recentSeen = new Set<string>();

  (recentAttempts || []).forEach(attempt => {
    if (!attempt.word_id) return;
    recentSeen.add(attempt.word_id);
    if (!attempt.correct) {
      recentMissed.add(attempt.word_id);
    }
  });

  const eligibleWords =
    recentSeen.size === 0
      ? allWords
      : allWords.filter(word => !recentSeen.has(word.id) || recentMissed.has(word.id));

  const candidateWords = eligibleWords.length >= 5 ? eligibleWords : allWords;

  const { data: mastery } = await supabase
    .from('spelling_mastery')
    .select('word_id, score, last_seen_at')
    .eq('kid_id', kidId);

  const masteryMap = new Map(mastery?.map(m => [m.word_id, m]) || []);

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - recentSeenWindowDays * 24 * 60 * 60 * 1000);

  const preferredWords: Word[] = [];
  const otherWords: Word[] = [];

  for (const word of candidateWords) {
    const masteryData = masteryMap.get(word.id);
    const hasHighMastery = masteryData && masteryData.score >= 2;
    const recentlySeen = masteryData && new Date(masteryData.last_seen_at) > cutoffDate;

    if (hasHighMastery && recentlySeen) {
      otherWords.push(word);
    } else {
      preferredWords.push(word);
    }
  }

  const selected = [...shuffleWords(preferredWords), ...shuffleWords(otherWords)].slice(0, 5);
  
  if (selected.length < 5 && allWords.length > selected.length) {
    const remaining = allWords.filter(w => !selected.find(s => s.id === w.id));
    selected.push(...shuffleWords(remaining).slice(0, 5 - selected.length));
  }

  return selected;
}

export async function getEasierWordsByElo(
  targetElo: number,
  count: number,
  excludeWordIds: string[]
): Promise<Word[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('spelling_word_bank')
    .select('*')
    .eq('is_active', true)
    .lt('current_elo', targetElo)
    .order('current_elo', { ascending: false })
    .limit(count);

  if (excludeWordIds.length > 0) {
    query = query.not('id', 'in', formatExcludeFilter(excludeWordIds));
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getWordsByPattern(
  pattern: string,
  level: number,
  excludeWordIds: string[]
): Promise<Word[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('spelling_word_bank')
    .select('*')
    .eq('level', level)
    .eq('pattern', pattern)
    .eq('is_active', true)
    .limit(5);

  if (excludeWordIds.length > 0) {
    query = query.not('id', 'in', formatExcludeFilter(excludeWordIds));
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getWord(wordId: string): Promise<Word | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_word_bank')
    .select('*')
    .eq('id', wordId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Word;
}

export async function updateWordElo(wordId: string, newElo: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('spelling_word_bank')
    .update({ current_elo: newElo })
    .eq('id', wordId);

  if (error) throw error;
}

export async function getWordsByIds(wordIds: string[]): Promise<Word[]> {
  if (wordIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_word_bank')
    .select('*')
    .in('id', wordIds)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

export async function getMaxWordLevel(): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_word_bank')
    .select('level')
    .eq('is_active', true)
    .order('level', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxLevel = data?.[0]?.level;
  return typeof maxLevel === 'number' && maxLevel > 0 ? maxLevel : 7;
}
