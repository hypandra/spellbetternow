'use client';

import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { THEME_CONTENT } from '@/features/spelling/constants/theme-content';

interface BreakScreenProps {
  breakData: {
    breakSummary: { correct: string[]; missed: string[] };
    lesson: { pattern: string; explanation: string; contrast: string; question: string; answer: string } | null;
  } | null;
  onContinue: () => void;
  onPracticeMissed: () => void;
  onChallengeJump: () => void;
  onFinish: () => void;
  onNavigate: () => void;
}

export default function BreakScreen({
  breakData,
  onContinue,
  onPracticeMissed,
  onChallengeJump,
  onFinish,
  onNavigate,
}: BreakScreenProps) {
  const { theme } = useSpellingTheme();
  const themeContent = THEME_CONTENT[theme];
  const missedCount = breakData?.breakSummary.missed.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-center text-spelling-text">
          Set Complete
        </h2>

        {breakData && (
          <>
            <div className="space-y-4">
              {breakData.breakSummary.correct.length > 0 && (
                <section aria-labelledby="correct-words-heading">
                  <h3 id="correct-words-heading" className="font-medium mb-2 text-spelling-text">Correct ({breakData.breakSummary.correct.length})</h3>
                  <ul role="list" aria-label="Words spelled correctly" className="list-none space-y-1">
                    {breakData.breakSummary.correct.map((word, i) => (
                      <li key={`correct-${i}-${word}`} className="text-spelling-text pl-4">{word}</li>
                    ))}
                  </ul>
                </section>
              )}

              {breakData.breakSummary.missed.length > 0 && (
                <section aria-labelledby="review-words-heading">
                  <h3 id="review-words-heading" className="font-medium mb-2 text-spelling-text">To Review ({breakData.breakSummary.missed.length})</h3>
                  <ul role="list" aria-label="Words to practice" className="list-none space-y-1">
                    {breakData.breakSummary.missed.map((word, i) => (
                      <li key={`missed-${i}-${word}`} className="text-spelling-text pl-4">{word}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {breakData.lesson && (
              <div className="p-6 bg-spelling-lesson-bg rounded-lg space-y-3 border border-spelling-border" style={{ borderStyle: 'var(--spelling-border-style)' }}>
                <h3 className="font-medium text-spelling-text">Note</h3>
                <p className="text-spelling-text">{breakData.lesson.explanation}</p>
                {breakData.lesson.contrast && (
                  <p className="text-sm text-spelling-text-muted">{breakData.lesson.contrast}</p>
                )}
                {breakData.lesson.question && (
                  <p className="text-sm text-spelling-text-muted">
                    {breakData.lesson.question}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {!breakData && (
          <div className="p-6 bg-spelling-lesson-bg rounded-lg space-y-3 border border-spelling-border" style={{ borderStyle: 'var(--spelling-border-style)' }}>
            <h3 className="font-medium text-spelling-text">Note</h3>
            <p className="text-spelling-text">Regular practice strengthens accuracy.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="w-full px-6 py-3 bg-spelling-primary text-spelling-surface rounded-lg hover:bg-spelling-primary-hover transition-colors"
          >
            {themeContent.buttons.keepGoing}
          </button>
          {missedCount > 0 && (
            <button
              onClick={onPracticeMissed}
              className="w-full px-6 py-3 bg-spelling-accent text-spelling-text rounded-lg hover:bg-spelling-tertiary transition-colors"
            >
              {themeContent.buttons.practiceMissed}
            </button>
          )}
          <button
            onClick={onChallengeJump}
            className="w-full px-6 py-3 bg-spelling-tertiary text-spelling-text rounded-lg hover:bg-spelling-secondary transition-colors"
          >
            {themeContent.buttons.harderSet}
          </button>
          <button
            onClick={onFinish}
            className="w-full px-6 py-3 bg-spelling-success-bg text-spelling-success-text rounded-lg hover:bg-spelling-secondary transition-colors"
          >
            {themeContent.buttons.finishSession}
          </button>
          <button
            onClick={onNavigate}
            className="w-full px-6 py-3 bg-spelling-secondary text-spelling-text rounded-lg hover:bg-spelling-tertiary transition-colors"
          >
            {themeContent.buttons.backToSpelling}
          </button>
        </div>
      </div>
    </div>
  );
}
