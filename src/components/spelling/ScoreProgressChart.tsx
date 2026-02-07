'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { computeCurrentStreak, computeUniqueWords } from '@/lib/spelling/stats';
import { eloToPercentileApprox, percentileToDisplay } from '@/lib/spelling/elo';

type AttemptPoint = {
  attemptNumber: number;
  word: string;
  correct: boolean;
  userEloBefore: number;
  userEloAfter: number;
  timestamp: string;
};

interface ScoreProgressChartProps {
  attempts: AttemptPoint[];
  totalWords: number;
}

function formatDelta(before: number, after: number) {
  const delta = after - before;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta}`;
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const attempt = payload[0].payload as AttemptPoint;
  const beforePct = percentileToDisplay(eloToPercentileApprox(attempt.userEloBefore));
  const afterPct = percentileToDisplay(eloToPercentileApprox(attempt.userEloAfter));

  return (
    <div className="border border-spelling-border bg-spelling-surface p-3 shadow-lg text-xs space-y-1">
      <div className="font-semibold text-spelling-text">Attempt #{attempt.attemptNumber}</div>
      {attempt.word ? <div>Word: &quot;{attempt.word}&quot;</div> : null}
      <div>Result: {attempt.correct ? '✓ Correct' : '✗ Incorrect'}</div>
      <div>
        Score: {beforePct} → {afterPct} ({formatDelta(beforePct, afterPct)})
      </div>
    </div>
  );
}

export default function ScoreProgressChart({ attempts, totalWords }: ScoreProgressChartProps) {
  const [showAll, setShowAll] = useState(false);

  const ordered = useMemo(() => {
    return [...attempts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [attempts]);

  const data = useMemo(
    () =>
      ordered.map((attempt) => ({
        ...attempt,
        userPercentileAfter: percentileToDisplay(
          eloToPercentileApprox(attempt.userEloAfter)
        ),
      })),
    [ordered]
  );

  const displayData = useMemo(() => {
    if (showAll || data.length <= 50) return data;
    return data.slice(-50);
  }, [data, showAll]);

  const totalAttempts = attempts.length;
  const totalWins = attempts.filter(attempt => attempt.correct).length;
  const winRate = totalAttempts > 0 ? Math.round((totalWins / totalAttempts) * 100) : 0;
  const currentPercentile =
    data.length > 0 ? data[data.length - 1].userPercentileAfter : null;
  const currentStreak = useMemo(() => computeCurrentStreak(data), [data]);
  const uniqueWords = useMemo(() => computeUniqueWords(data), [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="border border-spelling-border bg-spelling-surface p-4">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Current score</p>
          <p className="text-2xl font-semibold text-spelling-text">
            {typeof currentPercentile === 'number' ? `${currentPercentile}` : '—'}
          </p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Total attempts</p>
          <p className="text-2xl font-semibold text-spelling-text">{totalAttempts}</p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Win rate</p>
          <p className="text-2xl font-semibold text-spelling-text">
            {winRate}% <span className="text-sm text-spelling-text-muted">({totalWins}/{totalAttempts})</span>
          </p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Current streak</p>
          <p className="text-2xl font-semibold text-spelling-text">
            {currentStreak.count} {currentStreak.correct ? '✓' : '✗'}
          </p>
        </div>
        <div className="border border-spelling-border bg-spelling-surface p-4">
          <p className="text-xs uppercase tracking-widest text-spelling-text-muted">Unique words</p>
          <p className="text-2xl font-semibold text-spelling-text">
            {uniqueWords}/{totalWords}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-spelling-text">Score over time</h2>
        {data.length > 50 && (
          <button
            onClick={() => setShowAll(prev => !prev)}
            className="text-sm text-spelling-text-muted hover:text-spelling-text transition-colors"
          >
            {showAll ? 'Show recent' : 'Show all attempts'}
          </button>
        )}
      </div>

      <div className="border border-spelling-border bg-spelling-surface p-4">
        {displayData.length === 0 ? (
          <p className="text-sm text-spelling-text-muted">No attempts yet.</p>
        ) : (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="attemptNumber"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<TooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="userPercentileAfter"
                  stroke="hsl(var(--spelling-primary))"
                  strokeWidth={2}
                  dot={({ cx, cy, payload, index }) => (
                    <circle
                      key={`${payload.attemptNumber ?? index}-${payload.timestamp ?? 'dot'}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.correct ? 'hsl(var(--spelling-success-text))' : 'hsl(var(--spelling-error-text))'}
                      stroke="white"
                      strokeWidth={1}
                    />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
