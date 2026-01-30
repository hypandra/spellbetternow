import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface WordMistakeStat {
  spelling: string;
  count: number;
}

interface WordMistakeRow {
  user_spelling: string | null;
}

const spellingSorter = (left: string, right: string) => left.localeCompare(right);

export function buildWordMistakeStats(rows: WordMistakeRow[]): WordMistakeStat[] {
  const counts = new Map<string, number>();

  rows.forEach(row => {
    const spelling = row.user_spelling?.trim();
    if (!spelling) return;
    counts.set(spelling, (counts.get(spelling) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([spelling, count]) => ({ spelling, count }))
    .sort((a, b) => b.count - a.count || spellingSorter(a.spelling, b.spelling));
}

export async function getWordMistakeStats(params: {
  kidId: string;
  wordId: string;
  since: Date;
}): Promise<WordMistakeStat[]> {
  const { kidId, wordId, since } = params;
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('spelling_attempts')
    .select('user_spelling')
    .eq('kid_id', kidId)
    .eq('word_id', wordId)
    .eq('correct', false)
    .gte('created_at', since.toISOString());

  if (error) throw error;
  return buildWordMistakeStats((data || []) as WordMistakeRow[]);
}
