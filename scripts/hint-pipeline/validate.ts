/**
 * Validate generated hints for leaks and quality issues.
 *
 * Tier 1 (blocking): word appears in hints, morphological variants, shared suffix
 * Tier 2 (warning): POS not in allowed set, wrong count of synonyms/rhymes
 */

import type { HintResult, ValidationResult } from './types';
import { VALID_POS } from './types';

const SUFFIXES = [
  'ing', 'tion', 'sion', 'ment', 'ness', 'ity', 'ous', 'ive',
  'ful', 'less', 'able', 'ible', 'al', 'ly', 'er', 'or', 'ed',
  'es', 's', 'ise', 'ize', 'ent', 'ant', 'ence', 'ance', 'ate',
];

/** Get morphological variants of a word */
function getMorphVariants(word: string): Set<string> {
  const w = word.toLowerCase();
  const variants = new Set<string>([w]);

  // Add common suffix variants
  for (const suffix of SUFFIXES) {
    variants.add(w + suffix);
    if (w.endsWith('e')) variants.add(w.slice(0, -1) + suffix);
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      variants.add(w.slice(0, -suffix.length));
    }
  }

  // Doubling last consonant + ing/ed
  if (/[bcdfghlmnprstvwz]$/.test(w)) {
    variants.add(w + w[w.length - 1] + 'ing');
    variants.add(w + w[w.length - 1] + 'ed');
  }

  return variants;
}

/**
 * Check if a rhyme shares a problematic suffix with the word.
 * Only flags if the shared suffix is >= 60% of the word length.
 * Short rhyme overlaps (e.g., "back"/"pack" sharing "ack") are natural
 * for rhyming words and aren't real leaks — letter_fragments already
 * reveals the word's beginning/end anyway.
 */
function hasSharedSuffix(word: string, rhyme: string): boolean {
  const w = word.toLowerCase();
  const r = rhyme.toLowerCase();
  const minLen = Math.max(4, Math.ceil(w.length * 0.6));
  const maxCheck = Math.min(w.length, r.length);

  for (let i = minLen; i <= maxCheck; i++) {
    if (w.slice(-i) === r.slice(-i)) return true;
  }
  return false;
}

export function validate(hints: HintResult[]): ValidationResult {
  const clean: HintResult[] = [];
  const leaky: Array<HintResult & { failures: string[] }> = [];
  const warnings: Array<{ word: string; issues: string[] }> = [];

  for (const hint of hints) {
    const failures: string[] = [];
    const issues: string[] = [];
    const wordLower = hint.word.toLowerCase();
    const variants = getMorphVariants(hint.word);
    const wordRegex = new RegExp(`\\b${wordLower}\\b`, 'i');

    // --- Tier 1: Blocking ---

    // Check not_synonyms for the word itself or morphological variants
    for (const syn of hint.not_synonyms) {
      const synLower = syn.toLowerCase();
      if (synLower === wordLower) {
        failures.push(`not_synonyms contains the word itself: "${syn}"`);
      } else if (variants.has(synLower)) {
        failures.push(`not_synonyms contains morphological variant: "${syn}"`);
      }
    }

    // Check rhyme_hints for the word itself or morphological variants
    for (const rhyme of hint.rhyme_hints) {
      const rhymeLower = rhyme.toLowerCase();
      if (rhymeLower === wordLower) {
        failures.push(`rhyme_hints contains the word itself: "${rhyme}"`);
      } else if (variants.has(rhymeLower)) {
        failures.push(`rhyme_hints contains morphological variant: "${rhyme}"`);
      } else if (hasSharedSuffix(hint.word, rhyme)) {
        // Demoted to warning: shared suffixes are natural for rhymes
        issues.push(`rhyme shares suffix with word: "${rhyme}" / "${hint.word}"`);
      }
    }

    // Check if the full word appears in the text of any synonym or rhyme
    for (const syn of hint.not_synonyms) {
      if (wordRegex.test(syn)) {
        failures.push(`not_synonyms entry contains word: "${syn}"`);
      }
    }
    for (const rhyme of hint.rhyme_hints) {
      if (wordRegex.test(rhyme)) {
        failures.push(`rhyme_hints entry contains word: "${rhyme}"`);
      }
    }

    // --- Tier 2: Warnings ---

    if (!VALID_POS.includes(hint.part_of_speech)) {
      issues.push(`POS "${hint.part_of_speech}" not in allowed set`);
    }

    if (hint.not_synonyms.length < 2 || hint.not_synonyms.length > 3) {
      issues.push(`not_synonyms count: ${hint.not_synonyms.length} (expected 2-3)`);
    }

    if (hint.rhyme_hints.length > 2) {
      issues.push(`rhyme_hints count: ${hint.rhyme_hints.length} (expected 0-2)`);
    }

    // Categorize
    if (failures.length > 0) {
      leaky.push({ ...hint, failures });
    } else {
      clean.push(hint);
    }

    if (issues.length > 0) {
      warnings.push({ word: hint.word, issues });
    }
  }

  console.log(`Validation: ${clean.length} clean, ${leaky.length} leaky, ${warnings.length} with warnings`);
  return { clean, leaky, warnings };
}
