import { createClient } from '@supabase/supabase-js';
import type { Word } from './words';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get all active custom list words assigned to a kid.
 * Looks up each word in spelling_word_bank for full metadata;
 * words not in the bank get minimal defaults.
 */
export async function getCustomListWordsForKid(kidId: string): Promise<Word[]> {
  const supabase = getSupabaseClient();

  // 1. Get enabled list assignments for this kid
  const { data: assignments, error: assignError } = await supabase
    .from('spelling_kid_list_assignments')
    .select('list_id, weight')
    .eq('kid_id', kidId)
    .eq('is_enabled', true);

  if (assignError) throw assignError;
  if (!assignments || assignments.length === 0) return [];

  const listIds = assignments.map(a => a.list_id);

  // 2. Get active items from those lists
  const { data: items, error: itemsError } = await supabase
    .from('spelling_custom_list_items')
    .select('id, list_id, word_text, word_display, is_active, created_at')
    .in('list_id', listIds)
    .eq('is_active', true);

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) return [];

  // 3. Look up words in the word bank for full metadata
  const wordTexts = items.map(item => item.word_text);
  const { data: bankMatches } = await supabase
    .from('spelling_word_bank')
    .select('*')
    .in('word', wordTexts)
    .eq('is_active', true);

  const bankByWord = new Map<string, Word>();
  for (const w of bankMatches ?? []) {
    bankByWord.set(w.word, w as Word);
  }

  // 4. Build Word[] — use bank data if available, otherwise minimal defaults
  return items.map(item => {
    const bankWord = bankByWord.get(item.word_text);
    if (bankWord) return bankWord;

    return {
      id: item.id,
      word: item.word_text,
      level: 3,
      current_elo: 1500,
      is_active: true,
      created_at: item.created_at,
    } as Word;
  });
}
