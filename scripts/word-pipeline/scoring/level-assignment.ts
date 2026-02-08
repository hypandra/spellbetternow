import type { SubtlexMap } from "../types";
import { frequencyScore } from "../sources/subtlex";
import { spellingDifficulty } from "./spelling-difficulty";

interface LevelAssignment {
  level: number;
  elo: number;
  compositeScore: number;
  difficultyScore: number;
  frequencyScoreValue: number;
  pattern: string;
}

const LEVEL_ELO: Record<number, number> = {
  4: 1550,
  5: 1700,
  6: 1850,
  7: 2000,
};

/**
 * Assign a level 4-7 based on composite score:
 * 0.4 * frequencyScore + 0.6 * difficultyScore
 */
export function assignLevel(
  word: string,
  subtlex: SubtlexMap,
  subtlexTotal: number
): LevelAssignment {
  const freq = frequencyScore(word, subtlex, subtlexTotal);
  const { score: diff, topCategory } = spellingDifficulty(word);

  const composite = 0.4 * freq + 0.6 * diff;

  let level: number;
  if (composite < 35) level = 4;
  else if (composite < 55) level = 5;
  else if (composite < 75) level = 6;
  else level = 7;

  return {
    level,
    elo: LEVEL_ELO[level],
    compositeScore: Math.round(composite * 10) / 10,
    difficultyScore: diff,
    frequencyScoreValue: freq,
    pattern: topCategory,
  };
}
