'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { THEME_CONTENT } from '@/features/spelling/constants/theme-content';
import { levelToPercentileMidpoint } from '@/lib/spelling/elo';
import ResultsCard from '@/components/spelling/ResultsCard';
import ShareButton from '@/components/spelling/ShareButton';
import type { FinishStats } from '@/features/spelling/hooks/useSpellingSession';

interface SessionCompleteProps {
  kidId: string;
  sessionId: string | null;
  finishStats: FinishStats | null;
  assessmentSuggestedLevel: number | null;
  assessmentMaxLevel: number | null;
  onApplyAssessmentLevel: (level: number) => Promise<void>;
}

export default function SessionComplete({
  kidId,
  sessionId,
  finishStats,
  assessmentSuggestedLevel,
  assessmentMaxLevel,
  onApplyAssessmentLevel,
}: SessionCompleteProps) {
  const router = useRouter();
  const { theme } = useSpellingTheme();
  const themeContent = THEME_CONTENT[theme];
  const [levelApplied, setLevelApplied] = useState(false);
  const hasSuggestion =
    typeof assessmentSuggestedLevel === 'number' && assessmentSuggestedLevel > 0;
  const suggestedPercentile = assessmentSuggestedLevel
    ? levelToPercentileMidpoint(assessmentSuggestedLevel)
    : null;

  async function handleApplyLevel() {
    if (!assessmentSuggestedLevel) return;
    await onApplyAssessmentLevel(assessmentSuggestedLevel);
    setLevelApplied(true);
  }

  function handleStartAssessment() {
    router.push(`/session?kidId=${kidId}&assessment=1&autoStart=1`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-spelling-text text-center">Session Complete</h2>

        {finishStats ? (
          <ResultsCard kidId={kidId} finishStats={finishStats} />
        ) : (
          <p className="text-sm text-spelling-text-muted text-center">
            Practice again tomorrow.
          </p>
        )}

        {sessionId && (
          <div className="flex justify-center">
            <ShareButton sessionId={sessionId} />
          </div>
        )}

        {hasSuggestion && (
          <div className="rounded-lg border bg-spelling-surface-muted p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-spelling-text">Assessment result</h3>
              {assessmentMaxLevel ? (
                <span className="text-xs text-spelling-text-muted">
                  Max percentile 100
                </span>
              ) : null}
            </div>
            <p className="text-sm text-spelling-text">
              Suggested score:{' '}
              <span className="font-semibold">
                {typeof suggestedPercentile === 'number' ? suggestedPercentile : '—'}
              </span>
            </p>
            {levelApplied ? (
              <p className="text-sm text-green-600">Score updated.</p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleApplyLevel}
                  className="px-4 py-2 rounded bg-spelling-success-bg text-spelling-success-text hover:bg-spelling-secondary transition-colors"
                >
                  Apply score
                </button>
                <button
                  onClick={() => setLevelApplied(true)}
                  className="px-4 py-2 rounded bg-spelling-surface text-spelling-text-muted border border-spelling-border hover:bg-spelling-surface-muted transition-colors"
                >
                  Keep current score
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleStartAssessment}
            className="px-6 py-3 bg-spelling-accent text-spelling-text rounded-lg hover:bg-spelling-tertiary transition-colors"
          >
            Re-test score (10 words)
          </button>
          <button
            onClick={() => router.push('/app')}
            className="px-6 py-3 bg-spelling-primary text-spelling-surface rounded-lg hover:bg-spelling-primary-hover transition-colors"
          >
            {themeContent.buttons.backToHome}
          </button>
        </div>
      </div>
    </div>
  );
}
