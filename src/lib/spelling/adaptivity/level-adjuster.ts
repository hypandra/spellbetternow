import type { AttemptData } from '../db/sessions';

export interface MiniSetResult {
  wordId: string;
  correct: boolean;
}

export function adjustLevelAfterColdStart(
  attempts: AttemptData[],
  currentLevel: number,
  maxLevel = 7
): number {
  // Need at least 5 attempts for meaningful adjustment
  if (attempts.length < 5) {
    return currentLevel;
  }

  // Use all available attempts (up to 10)
  const relevantAttempts = attempts.slice(0, Math.min(attempts.length, 10));
  const correctCount = relevantAttempts.filter(a => a.correct).length;
  const medianResponseMs = calculateMedian(relevantAttempts.map(a => a.response_ms));
  const accuracy = correctCount / relevantAttempts.length;

  const threshold = 5000;

  // Adjust based on accuracy thresholds (80% for level up, 40% for level down)
  if (accuracy >= 0.8 && medianResponseMs < threshold) {
    return Math.min(currentLevel + 1, maxLevel);
  } else if (accuracy <= 0.4) {
    return Math.max(currentLevel - 1, 1);
  }

  return currentLevel;
}

export function adjustLevelAfterMiniSet(
  miniSetResults: MiniSetResult[],
  currentLevel: number,
  confidenceScore: number,
  maxLevel = 7
): number {
  if (confidenceScore >= 2) {
    return Math.min(currentLevel + 1, maxLevel);
  } else if (confidenceScore <= -2) {
    return Math.max(currentLevel - 1, 1);
  }

  return currentLevel;
}

export function calculateConfidenceScore(miniSetResults: MiniSetResult[]): number {
  const correctCount = miniSetResults.filter(r => r.correct).length;

  if (correctCount >= 4) {
    return 1;
  } else if (correctCount <= 2) {
    return -1;
  }

  return 0;
}

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
