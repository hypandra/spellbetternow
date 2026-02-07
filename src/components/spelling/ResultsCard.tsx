'use client';

import { useEffect, useMemo, useState } from 'react';
import ScoreProgressChart from '@/components/spelling/ScoreProgressChart';
import { SpellingHistoryClient } from '@/features/spelling/api/history-client';
import { DEFAULT_ELO, levelToPercentileMidpoint } from '@/lib/spelling/elo';
import type { FinishStats } from '@/features/spelling/hooks/useSpellingSession';

type AttemptPoint = {
  attemptNumber: number;
  word: string;
  correct: boolean;
  userEloBefore: number;
  userEloAfter: number;
  timestamp: string;
};

interface ResultsCardProps {
  kidId: string;
  finishStats: FinishStats;
}

export default function ResultsCard({ kidId, finishStats }: ResultsCardProps) {
  const [attempts, setAttempts] = useState<AttemptPoint[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        const [attemptRows, totalResponse] = await Promise.all([
          SpellingHistoryClient.getKidAttempts(kidId),
          fetch('/api/spelling/word-bank/count'),
        ]);

        const totalPayload = totalResponse.ok
          ? ((await totalResponse.json()) as { total?: number })
          : { total: 0 };

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
            word: row.word_presented ?? '',
            correct: row.correct === true,
            userEloBefore: before,
            userEloAfter: after,
            timestamp: row.created_at as string,
          };
        });

        if (isActive) {
          setAttempts(mapped);
          setTotalWords(totalPayload.total ?? 0);
        }
      } catch {
        // Gracefully degrade — chart just won't show
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadData();
    return () => { isActive = false; };
  }, [kidId]);

  const winRate = finishStats.attemptsTotal > 0
    ? Math.round((finishStats.correctTotal / finishStats.attemptsTotal) * 100)
    : 0;

  const percentile = levelToPercentileMidpoint(finishStats.levelEnd);

  const chart = useMemo(
    () => <ScoreProgressChart attempts={attempts} totalWords={totalWords} />,
    [attempts, totalWords]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="border border-spelling-border bg-spelling-surface p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Score</p>
          <p className="text-2xl font-semibold text-spelling-text">
            {finishStats.correctTotal}/{finishStats.attemptsTotal}
          </p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Win rate</p>
          <p className="text-2xl font-semibold text-spelling-text">{winRate}%</p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Percentile</p>
          <p className="text-2xl font-semibold text-spelling-text">{percentile}</p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Sets</p>
          <p className="text-2xl font-semibold text-spelling-text">{finishStats.miniSetsCompleted}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-spelling-text-muted text-center">Loading progress...</div>
      ) : attempts.length > 0 ? (
        chart
      ) : null}

      <p className="text-center text-xs text-spelling-text-muted">Spell Better Now</p>
    </div>
  );
}
