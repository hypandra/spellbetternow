'use client';

import Link from 'next/link';
import ScoreProgressChart from '@/components/spelling/ScoreProgressChart';
import { levelToPercentileMidpoint } from '@/lib/spelling/elo';
import type { PublicSessionStats } from '@/lib/spelling/db/public-session';

type AttemptPoint = {
  attemptNumber: number;
  word: string;
  correct: boolean;
  userEloBefore: number;
  userEloAfter: number;
  timestamp: string;
};

interface SharePageClientProps {
  stats: PublicSessionStats;
  attempts: AttemptPoint[];
  totalWords: number;
}

export default function SharePageClient({
  stats,
  attempts,
  totalWords,
}: SharePageClientProps) {
  const winRate =
    stats.attemptsTotal > 0
      ? Math.round((stats.correctTotal / stats.attemptsTotal) * 100)
      : 0;
  const percentile = levelToPercentileMidpoint(stats.levelEnd);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-spelling-text text-center">
          {stats.correctTotal}/{stats.attemptsTotal} correct
        </h1>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-spelling-border bg-spelling-surface p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Win rate</p>
            <p className="text-2xl font-semibold text-spelling-text">{winRate}%</p>
          </div>
          <div className="border border-spelling-border bg-spelling-surface p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Percentile</p>
            <p className="text-2xl font-semibold text-spelling-text">{percentile}</p>
          </div>
        </div>

        {attempts.length > 0 && (
          <ScoreProgressChart attempts={attempts} totalWords={totalWords} />
        )}

        <div className="text-center space-y-4 pt-4">
          <Link
            href="/landing"
            className="inline-block px-6 py-3 bg-spelling-primary text-spelling-surface rounded-lg hover:bg-spelling-primary-hover transition-colors"
          >
            Try Spell Better Now
          </Link>
          <p className="text-xs text-spelling-text-muted">
            Adaptive spelling practice with targeted feedback
          </p>
        </div>
      </div>
    </div>
  );
}
