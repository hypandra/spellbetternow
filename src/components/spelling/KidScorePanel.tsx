'use client';

import { useEffect, useMemo, useState } from 'react';
import ScoreProgressChart from '@/components/spelling/ScoreProgressChart';
import { SpellingHistoryClient } from '@/features/spelling/api/history-client';
import { DEFAULT_ELO } from '@/lib/spelling/elo';

interface KidScorePanelProps {
  kidId: string;
}

type AttemptPoint = {
  attemptNumber: number;
  word: string;
  correct: boolean;
  userEloBefore: number;
  userEloAfter: number;
  timestamp: string;
};

export default function KidScorePanel({ kidId }: KidScorePanelProps) {
  const [attempts, setAttempts] = useState<AttemptPoint[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadScoreData() {
      setLoading(true);
      setError(null);
      try {
        const [attemptRows, totalResponse] = await Promise.all([
          SpellingHistoryClient.getKidAttempts(kidId),
          fetch('/api/spelling/word-bank/count'),
        ]);

        if (!totalResponse.ok) {
          throw new Error('Failed to load score data');
        }

        const totalPayload = (await totalResponse.json()) as { total?: number };
        const total = totalPayload.total ?? 0;

        const ordered = [...attemptRows]
          .filter(row => row.created_at)
          .sort(
            (a, b) =>
              new Date(a.created_at as string).getTime() -
              new Date(b.created_at as string).getTime()
          );

        const mapped = ordered.map((row, index) => {
          const before = row.user_elo_before ?? row.user_elo_after ?? DEFAULT_ELO;
          const after = row.user_elo_after ?? before;
          return {
            attemptNumber: index + 1,
            word: row.word_presented ?? '—',
            correct: row.correct === true,
            userEloBefore: before,
            userEloAfter: after,
            timestamp: row.created_at as string,
          };
        });

        if (isActive) {
          setAttempts(mapped);
          setTotalWords(total);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load score data.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadScoreData();

    return () => {
      isActive = false;
    };
  }, [kidId]);

  const chart = useMemo(
    () => <ScoreProgressChart attempts={attempts} totalWords={totalWords} />,
    [attempts, totalWords]
  );

  if (loading) {
    return <div className="text-sm text-spelling-text-muted mt-3">Loading score...</div>;
  }

  if (error) {
    return <div className="text-sm text-spelling-error-text mt-3">{error}</div>;
  }

  return <div className="mt-4">{chart}</div>;
}
