/** Shared types for the word pipeline */

export interface CandidateWord {
  word: string;
  /** 0-100 spelling difficulty score */
  difficultyScore: number;
  /** 0-100 frequency score (higher = rarer) */
  frequencyScore: number;
  /** Composite score: 0.4 * freq + 0.6 * difficulty */
  compositeScore: number;
  /** Assigned level 4-7 */
  level: number;
  /** ELO rating based on level */
  elo: number;
  /** Top difficulty category (for pattern column) */
  pattern: string;
  /** Which source lists contained this word */
  sources: string[];
}

export interface SubtlexEntry {
  word: string;
  count: number;
}

export interface SVLEntry {
  lemma: string;
  POS: string;
  rank: number;
  frequency: number;
}

export interface AVMSSEntry {
  frequency_rank: number;
  words: string[];
}

export type SubtlexMap = Map<string, number>;
