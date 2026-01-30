import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface MasteryScore {
  kid_id: string;
  word_id: string;
  score: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

function getSupabaseClient(useServiceRole = false) {
  const key = useServiceRole ? supabaseServiceKey : supabaseAnonKey;
  if (!key) {
    throw new Error(`Missing Supabase ${useServiceRole ? 'service role' : 'anon'} key`);
  }
  return createClient(supabaseUrl, key);
}

export async function updateMastery(kidId: string, wordId: string, correct: boolean): Promise<void> {
  const supabase = getSupabaseClient(true);
  
  const { data: existing } = await supabase
    .from('spelling_mastery')
    .select('score')
    .eq('kid_id', kidId)
    .eq('word_id', wordId)
    .single();

  let newScore: number;
  if (existing) {
    if (correct) {
      newScore = Math.min(existing.score + 1, 3);
    } else {
      newScore = Math.max(existing.score - 1, 0);
    }
  } else {
    newScore = correct ? 1 : 0;
  }

  const { error } = await supabase
    .from('spelling_mastery')
    .upsert({
      kid_id: kidId,
      word_id: wordId,
      score: newScore,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'kid_id,word_id',
    });

  if (error) throw error;
}

export async function getMasteryScores(kidId: string): Promise<MasteryScore[]> {
  const supabase = getSupabaseClient(false);
  const { data, error } = await supabase
    .from('spelling_mastery')
    .select('*')
    .eq('kid_id', kidId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMasteryScore(kidId: string, wordId: string): Promise<number> {
  const supabase = getSupabaseClient(false);
  const { data, error } = await supabase
    .from('spelling_mastery')
    .select('score')
    .eq('kid_id', kidId)
    .eq('word_id', wordId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return 0;
    throw error;
  }
  return data?.score || 0;
}

