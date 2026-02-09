/**
 * Deterministic letter_fragments generation.
 * Reveals first/last N chars based on word level.
 * No LLM needed — pure string manipulation.
 */

import type { WordRecord } from './types';

/**
 * Generate letter fragments for a word.
 * - Levels 1-3: reveal 3 chars prefix/suffix
 * - Levels 4-7: reveal 2 chars prefix/suffix
 * - 3-letter words: first char + "…" only
 * - Combined revealed chars must be ≤ 40% of word length
 */
export function generateFragments(word: string, level: number): string[] {
  const len = word.length;

  // Very short words: just first char
  if (len <= 3) {
    return [`${word[0]}…`];
  }

  // Determine reveal count based on level
  const revealChars = level <= 3 ? 3 : 2;

  // Check 40% cap: prefix + suffix combined
  const maxReveal = Math.floor(len * 0.4);

  if (maxReveal < revealChars) {
    // Can only do prefix
    const prefixLen = Math.min(revealChars, maxReveal);
    if (prefixLen < 1) return [`${word[0]}…`];
    return [`${word.slice(0, prefixLen)}…`];
  }

  // Both prefix and suffix fit within 40%
  const prefix = `${word.slice(0, revealChars)}…`;
  const suffix = `…${word.slice(-revealChars)}`;

  return [prefix, suffix];
}

/**
 * Generate fragments for all words. Returns a map of word -> fragments.
 */
export function generateAllFragments(
  words: WordRecord[]
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const w of words) {
    result.set(w.word, generateFragments(w.word, w.level));
  }

  console.log(`Generated letter fragments for ${result.size} words`);
  return result;
}
