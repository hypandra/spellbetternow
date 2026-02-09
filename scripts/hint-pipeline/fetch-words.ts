/**
 * Fetch words from spelling_word_bank that need hint enrichment.
 * Uses Supabase client with service role key from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import type { WordRecord } from './types';

export async function fetchWords(opts: {
  force?: boolean;
  words?: string[];
}): Promise<WordRecord[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let query = supabase
    .from('spelling_word_bank')
    .select('id, word, level, definition, example_sentence, part_of_speech, not_synonyms, letter_fragments, rhyme_hints')
    .eq('is_active', true)
    .order('level', { ascending: true })
    .order('word', { ascending: true });

  // Filter to specific words if provided
  if (opts.words && opts.words.length > 0) {
    query = query.in('word', opts.words);
  }

  // Unless --force, only fetch words missing any hint column
  if (!opts.force && !opts.words) {
    query = query.or(
      'part_of_speech.is.null,not_synonyms.is.null,letter_fragments.is.null,rhyme_hints.is.null'
    );
  }

  // Supabase default limit is 1000, but be explicit
  query = query.limit(1000);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  console.log(`Fetched ${data.length} words from spelling_word_bank`);
  return data as WordRecord[];
}
