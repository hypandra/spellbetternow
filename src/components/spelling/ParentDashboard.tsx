'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SpellingErrorBoundary } from './SpellingErrorBoundary';
import { ParentDashboardErrorFallback } from './ParentDashboardErrorFallback';
import type { Kid } from '@/lib/spelling/db/kids';

interface ParentDashboardProps {
  parentUserId: string;
}

interface KidStats {
  kid: Kid;
  lastSessionDate: string | null;
  totalAttempts: number;
  accuracy: number;
  wordsPracticed: number;
  trickyPatterns: string[];
}

function ParentDashboardContent({ parentUserId }: ParentDashboardProps) {
  const [stats, setStats] = useState<KidStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [parentUserId]);

  async function loadStats() {
    const supabase = createClient();

    const { data: kids } = await supabase
      .from('spelling_kids')
      .select('*')
      .eq('parent_user_id', parentUserId);

    if (!kids) {
      setStats([]);
      setLoading(false);
      return;
    }

    if (kids.length === 0) {
      setStats([]);
      setLoading(false);
      return;
    }

    const kidIds = kids.map(kid => kid.id);
    const [sessionsResult, attemptsResult, masteryResult] = await Promise.all([
      supabase
        .from('spelling_sessions')
        .select('kid_id, ended_at, attempts_total, correct_total')
        .in('kid_id', kidIds)
        .order('ended_at', { ascending: false }),
      supabase
        .from('spelling_attempts')
        .select('kid_id, word_id')
        .in('kid_id', kidIds),
      supabase
        .from('spelling_mastery')
        .select('kid_id, word_id, score')
        .in('kid_id', kidIds)
        .lt('score', 2),
    ]);

    const sessions = sessionsResult.data || [];
    const attempts = attemptsResult.data || [];
    const mastery = masteryResult.data || [];

    const lastSessionByKid = new Map<string, { ended_at: string | null; correct_total: number }>();
    sessions.forEach(session => {
      if (!lastSessionByKid.has(session.kid_id)) {
        lastSessionByKid.set(session.kid_id, {
          ended_at: session.ended_at,
          correct_total: session.correct_total,
        });
      }
    });

    const attemptsByKid = new Map<string, { total: number; wordIds: Set<string> }>();
    attempts.forEach(attempt => {
      const entry = attemptsByKid.get(attempt.kid_id) || {
        total: 0,
        wordIds: new Set<string>(),
      };
      entry.total += 1;
      entry.wordIds.add(attempt.word_id);
      attemptsByKid.set(attempt.kid_id, entry);
    });

    const masteryWordIds = Array.from(new Set(mastery.map(item => item.word_id)));
    const wordPatternById = new Map<string, string>();
    if (masteryWordIds.length > 0) {
      const { data: words } = await supabase
        .from('spelling_word_bank')
        .select('id, pattern')
        .in('id', masteryWordIds)
        .not('pattern', 'is', null);

      words?.forEach(word => {
        if (word.pattern) {
          wordPatternById.set(word.id, word.pattern);
        }
      });
    }

    const patternCountsByKid = new Map<string, Map<string, number>>();
    mastery.forEach(item => {
      const pattern = wordPatternById.get(item.word_id);
      if (!pattern) return;

      const patternCounts = patternCountsByKid.get(item.kid_id) || new Map<string, number>();
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
      patternCountsByKid.set(item.kid_id, patternCounts);
    });

    const results = kids.map(kid => {
      const lastSession = lastSessionByKid.get(kid.id);
      const attemptStats = attemptsByKid.get(kid.id);
      const totalAttempts = attemptStats?.total || 0;
      const correctTotal = lastSession?.correct_total || 0;
      const accuracy = totalAttempts > 0 ? (correctTotal / totalAttempts) * 100 : 0;
      const wordsPracticed = attemptStats ? attemptStats.wordIds.size : 0;

      const patternCounts = patternCountsByKid.get(kid.id) || new Map<string, number>();
      const trickyPatterns = Array.from(patternCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern]) => pattern);

      return {
        kid,
        lastSessionDate: lastSession?.ended_at || null,
        totalAttempts,
        accuracy: Math.round(accuracy),
        wordsPracticed,
        trickyPatterns,
      };
    });

    setStats(results);
    setLoading(false);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map(stat => (
          <div key={stat.kid.id} className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-4">{stat.kid.display_name}</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Last session:</strong>{' '}
                {stat.lastSessionDate
                  ? new Date(stat.lastSessionDate).toLocaleDateString()
                  : 'Never'}
              </p>
              <p>
                <strong>Total attempts:</strong> {stat.totalAttempts}
              </p>
              <p>
                <strong>Accuracy:</strong> {stat.accuracy}%
              </p>
              <p>
                <strong>Words practiced:</strong> {stat.wordsPracticed}
              </p>
              {stat.trickyPatterns.length > 0 && (
                <div>
                  <strong>Top tricky patterns:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {stat.trickyPatterns.map((pattern, i) => (
                      <li key={i}>{pattern}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ParentDashboard({ parentUserId }: ParentDashboardProps) {
  return (
    <SpellingErrorBoundary
      componentName="ParentDashboard"
      fallback={<ParentDashboardErrorFallback onRetry={() => window.location.reload()} />}
    >
      <ParentDashboardContent parentUserId={parentUserId} />
    </SpellingErrorBoundary>
  );
}
