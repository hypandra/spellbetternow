export interface AttemptStatsInput {
  word: string;
  correct: boolean;
  timestamp: string;
}

export interface CurrentStreak {
  count: number;
  correct: boolean;
}

export function computeCurrentStreak(attempts: AttemptStatsInput[]): CurrentStreak {
  if (attempts.length === 0) {
    return { count: 0, correct: true };
  }

  const ordered = [...attempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latest = ordered[ordered.length - 1];
  let count = 0;

  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    if (ordered[i].correct === latest.correct) {
      count += 1;
    } else {
      break;
    }
  }

  return { count, correct: latest.correct };
}

export function computeUniqueWords(attempts: AttemptStatsInput[]): number {
  return new Set(attempts.map(attempt => attempt.word)).size;
}
