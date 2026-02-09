/** Shared types for the hint pipeline */

export interface WordRecord {
  id: string;
  word: string;
  level: number;
  definition: string | null;
  example_sentence: string | null;
  part_of_speech: string | null;
  not_synonyms: string[] | null;
  letter_fragments: string[] | null;
  rhyme_hints: string[] | null;
}

export interface HintResult {
  id: string;
  word: string;
  level: number;
  part_of_speech: string;
  not_synonyms: string[];
  letter_fragments: string[];
  rhyme_hints: string[];
}

export interface ValidationResult {
  clean: HintResult[];
  leaky: Array<HintResult & { failures: string[] }>;
  warnings: Array<{ word: string; issues: string[] }>;
}

export const VALID_POS = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'pronoun',
  'interjection',
] as const;

export type PartOfSpeech = (typeof VALID_POS)[number];
