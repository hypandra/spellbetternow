'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpellingHistoryClient, type SpellingAttemptRow } from '@/features/spelling/api/history-client';
import type { WordMistakeStat } from '@/lib/spelling/db/attempts';

interface KidHistoryPanelProps {
  kidId: string;
}

interface WordStats {
  wordId: string;
  word: string;
  correct: number;
  incorrect: number;
  total: number;
}

interface HistoryActionsProps {
  selectedCount: number;
  reviewCount: number;
  onPracticeSelected: () => void;
  onPracticeNeedsReview: () => void;
  onClearSelection: () => void;
}

interface HistorySectionProps {
  title: string;
  titleClassName: string;
  rows: WordStats[];
  onPractice: (wordId: string) => void;
  selectedWordIds?: Set<string>;
  onToggleWord?: (wordId: string) => void;
}

const ATTEMPT_LIMIT = 500;
const MAX_SELECTED = 5;

function HistoryActions({
  selectedCount,
  reviewCount,
  onPracticeSelected,
  onPracticeNeedsReview,
  onClearSelection,
}: HistoryActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <button
        type="button"
        onClick={onPracticeSelected}
        disabled={selectedCount === 0}
        className="px-3 py-1.5 rounded bg-spelling-primary text-spelling-surface text-xs disabled:opacity-50"
      >
        Practice selected ({selectedCount}/{MAX_SELECTED})
      </button>
      <button
        type="button"
        onClick={onPracticeNeedsReview}
        disabled={reviewCount === 0}
        className="px-3 py-1.5 rounded bg-spelling-error-bg text-spelling-error-text text-xs disabled:opacity-50"
      >
        Practice needs review ({reviewCount})
      </button>
      <button
        type="button"
        onClick={onClearSelection}
        disabled={selectedCount === 0}
        className="px-3 py-1.5 rounded bg-spelling-surface text-spelling-text text-xs border border-spelling-border border-[style:var(--spelling-border-style)] disabled:opacity-50"
      >
        Clear selection
      </button>
      {selectedCount >= MAX_SELECTED && (
        <span className="text-xs text-spelling-text-muted">Max {MAX_SELECTED} words at a time.</span>
      )}
    </div>
  );
}

function HistorySection({
  title,
  titleClassName,
  rows,
  onPractice,
  selectedWordIds,
  onToggleWord,
}: HistorySectionProps) {
  return (
    <div>
      <div className={`text-xs font-semibold uppercase mb-2 ${titleClassName}`}>{title}</div>
      <div className="grid grid-cols-1 gap-2">
        {rows.map(row => (
          <div
            key={`${title}-${row.wordId}`}
            className="flex items-center justify-between rounded bg-spelling-surface px-3 py-2"
          >
            {selectedWordIds && onToggleWord ? (
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedWordIds.has(row.wordId)}
                  onChange={() => onToggleWord(row.wordId)}
                />
                {row.word}
              </label>
            ) : (
              <span className="font-medium">{row.word}</span>
            )}
            <div className="flex items-center gap-3 text-xs text-spelling-text-muted">
              <span>✅ {row.correct}</span>
              <span>❌ {row.incorrect}</span>
              <span>• {row.total}</span>
              <button
                type="button"
                className={`px-2 py-1 rounded ${
                  selectedWordIds
                    ? 'bg-spelling-error-bg text-spelling-error-text'
                    : 'bg-spelling-success-bg text-spelling-success-text'
                }`}
                onClick={() => onPractice(row.wordId)}
              >
                Practice
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type MistakeStatsState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: WordMistakeStat[];
};

interface MistakeHistorySectionProps {
  title: string;
  titleClassName: string;
  rows: WordStats[];
  onPractice: (wordId: string) => void;
  selectedWordIds: Set<string>;
  onToggleWord: (wordId: string) => void;
  expandedWordIds: string[];
  onExpandedChange: (nextValues: string[]) => void;
  mistakeStatsByWordId: Record<string, MistakeStatsState | undefined>;
}

function MistakeHistorySection({
  title,
  titleClassName,
  rows,
  onPractice,
  selectedWordIds,
  onToggleWord,
  expandedWordIds,
  onExpandedChange,
  mistakeStatsByWordId,
}: MistakeHistorySectionProps) {
  return (
    <div>
      <div className={`text-xs font-semibold uppercase mb-2 ${titleClassName}`}>{title}</div>
      <div className="grid gap-2">
        {rows.map(row => {
          const mistakeState = mistakeStatsByWordId[row.wordId];
          const stats = mistakeState?.data || [];
          const hasMistakes = stats.length > 0;
          const mistakeList = stats.map(item => `'${item.spelling}' (${item.count}x)`).join(', ');
          const isOpen = expandedWordIds.includes(row.wordId);
          const toggleOpen = () => {
            if (isOpen) {
              onExpandedChange(expandedWordIds.filter(id => id !== row.wordId));
              return;
            }
            onExpandedChange([...expandedWordIds, row.wordId]);
          };

          return (
            <div
              key={`${title}-${row.wordId}`}
              className="rounded border border-spelling-border border-[style:var(--spelling-border-style)] bg-spelling-surface"
            >
              <div className="flex items-center justify-between px-3 py-2">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedWordIds.has(row.wordId)}
                    onChange={() => onToggleWord(row.wordId)}
                  />
                  {row.word}
                </label>
                <div className="flex items-center gap-3 text-xs text-spelling-text-muted">
                  <span>✅ {row.correct}</span>
                  <span>❌ {row.incorrect}</span>
                  <span>• {row.total}</span>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-spelling-error-bg text-spelling-error-text"
                    onClick={() => onPractice(row.wordId)}
                  >
                    Practice
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleOpen}
                  aria-expanded={isOpen}
                  aria-label="Toggle common mistakes"
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded border border-spelling-border text-spelling-text-muted transition-colors hover:bg-spelling-secondary"
                >
                  {isOpen ? '^' : 'v'}
                </button>
              </div>
              {isOpen ? (
                <div className="px-3 pb-3 text-xs text-spelling-error-text">
                  {mistakeState?.status === 'loading' && <div>Loading mistakes...</div>}
                  {mistakeState?.status === 'error' && <div>Unable to load mistakes.</div>}
                  {mistakeState?.status === 'success' && !hasMistakes && (
                    <div>No mistakes in the last week.</div>
                  )}
                  {mistakeState?.status === 'success' && hasMistakes && (
                    <div className="rounded bg-spelling-error-bg px-2 py-2 text-spelling-error-text">
                      Common mistakes: {mistakeList}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface KidHistoryPanelContentProps {
  stats: WordStats[];
  recentStats: WordStats[];
  selectedWordIds: Set<string>;
  onToggleWord: (wordId: string) => void;
  onStartPractice: (wordIds: string[]) => void;
  onClearSelection: () => void;
  needsReviewWordIds: string[];
  expandedWordIds: string[];
  onExpandedChange: (nextValues: string[]) => void;
  mistakeStatsByWordId: Record<string, MistakeStatsState | undefined>;
}

function KidHistoryPanelContent({
  stats,
  recentStats,
  selectedWordIds,
  onToggleWord,
  onStartPractice,
  onClearSelection,
  needsReviewWordIds,
  expandedWordIds,
  onExpandedChange,
  mistakeStatsByWordId,
}: KidHistoryPanelContentProps) {
  const totalAttempts = stats.reduce((sum, row) => sum + row.total, 0);
  const selectedCount = selectedWordIds.size;
  const selectedList = Array.from(selectedWordIds).slice(0, MAX_SELECTED);
  const reviewCount = needsReviewWordIds.length;
  const recentWins = [...recentStats]
    .filter(row => row.correct > 0)
    .sort((a, b) => b.correct - a.correct || b.total - a.total || a.word.localeCompare(b.word))
    .slice(0, 6);
  const needsPractice = [...stats]
    .filter(row => row.incorrect > 0)
    .sort((a, b) => b.incorrect - a.incorrect || b.total - a.total || a.word.localeCompare(b.word))
    .slice(0, 6);

  return (
    <div
      className="mt-4 rounded-lg border border-spelling-border border-[style:var(--spelling-border-style)] bg-spelling-lesson-bg p-3 text-sm text-spelling-text"
      onClick={event => event.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Word history</span>
        <span className="text-xs text-spelling-text-muted">
          Showing last {Math.min(totalAttempts, ATTEMPT_LIMIT)} attempts
        </span>
      </div>
      <HistoryActions
        selectedCount={selectedCount}
        reviewCount={reviewCount}
        onPracticeSelected={() => onStartPractice(selectedList)}
        onPracticeNeedsReview={() => {
          const reviewTargets = needsReviewWordIds.slice(0, MAX_SELECTED);
          if (!reviewTargets.length) {
            return;
          }
          const shouldStart = confirm(
            `Start a practice round with ${reviewTargets.length} word${reviewTargets.length === 1 ? '' : 's'} that need review?`
          );
          if (!shouldStart) {
            return;
          }
          onStartPractice(reviewTargets);
        }}
        onClearSelection={onClearSelection}
      />
      <div className="grid grid-cols-1 gap-3">
        {recentWins.length > 0 ? (
          <HistorySection
            title="Recent wins"
            titleClassName="text-spelling-success-text"
            rows={recentWins}
            onPractice={wordId => onStartPractice([wordId])}
          />
        ) : (
          <div>
            <div className="text-xs font-semibold uppercase mb-2 text-spelling-success-text">
              Recent wins
            </div>
            <div className="rounded bg-spelling-surface px-3 py-2 text-xs text-spelling-text-muted">
              No recent wins yet.
            </div>
          </div>
        )}
        <MistakeHistorySection
          title="Needs practice"
          titleClassName="text-spelling-error-text"
          rows={needsPractice}
          onPractice={wordId => onStartPractice([wordId])}
          selectedWordIds={selectedWordIds}
          onToggleWord={onToggleWord}
          expandedWordIds={expandedWordIds}
          onExpandedChange={onExpandedChange}
          mistakeStatsByWordId={mistakeStatsByWordId}
        />
      </div>
      {stats.length > 6 && (
        <div className="mt-2 text-xs text-spelling-text-muted">
          Showing top 6 each for recent wins and practice.
        </div>
      )}
    </div>
  );
}

export function shouldIncludeInSmartReview(attempts: boolean[]) {
  if (attempts.length === 0) return false;

  let streak = 0;
  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    if (attempts[i]) {
      streak += 1;
      if (streak >= 2) {
        return false;
      }
    } else {
      return true;
    }
  }

  return false;
}

// eslint-disable-next-line max-lines-per-function -- Complex UI component with state management
export default function KidHistoryPanel({ kidId }: KidHistoryPanelProps) {
  const router = useRouter();
  const [stats, setStats] = useState<WordStats[]>([]);
  const [recentStats, setRecentStats] = useState<WordStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [needsReviewWordIds, setNeedsReviewWordIds] = useState<string[]>([]);
  const [expandedWordIds, setExpandedWordIds] = useState<string[]>([]);
  const [mistakeStatsByWordId, setMistakeStatsByWordId] = useState<
    Record<string, MistakeStatsState | undefined>
  >({});
  const mistakeRequestControllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    mistakeRequestControllers.current.forEach(controller => controller.abort());
    mistakeRequestControllers.current.clear();
    setSelectedWordIds(new Set());
    setExpandedWordIds([]);
    setMistakeStatsByWordId({});
  }, [kidId]);

  useEffect(() => {
    return () => {
      mistakeRequestControllers.current.forEach(controller => controller.abort());
      mistakeRequestControllers.current.clear();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    function loadFromAttempts(attempts: SpellingAttemptRow[]) {
      const map = new Map<
        string,
        { word: string; correct: number; incorrect: number; attempts: boolean[] }
      >();
      const recentMap = new Map<string, { word: string; correct: number; incorrect: number }>();
      const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      attempts.forEach(attempt => {
        const wordId = attempt.word_id || '';
        const word = attempt.word_presented || 'Unknown';
        if (!wordId) return;
        const entry = map.get(wordId) || { word, correct: 0, incorrect: 0, attempts: [] };
        const isCorrect = attempt.correct === true;
        if (isCorrect) {
          entry.correct += 1;
        } else {
          entry.incorrect += 1;
        }
        entry.attempts.unshift(isCorrect);
        map.set(wordId, entry);

        if (attempt.created_at) {
          const attemptDate = new Date(attempt.created_at);
          if (attemptDate >= recentCutoff) {
            const recentEntry = recentMap.get(wordId) || { word, correct: 0, incorrect: 0 };
            if (isCorrect) {
              recentEntry.correct += 1;
            } else {
              recentEntry.incorrect += 1;
            }
            recentMap.set(wordId, recentEntry);
          }
        }
      });

      const rows = Array.from(map.entries()).map(([wordId, counts]) => {
        const total = counts.correct + counts.incorrect;
        return {
          wordId,
          word: counts.word,
          correct: counts.correct,
          incorrect: counts.incorrect,
          total,
        };
      });

      const recentRows = Array.from(recentMap.entries()).map(([wordId, counts]) => {
        const total = counts.correct + counts.incorrect;
        return {
          wordId,
          word: counts.word,
          correct: counts.correct,
          incorrect: counts.incorrect,
          total,
        };
      });

      const reviewWordIds = Array.from(map.entries())
        .filter(([, counts]) => shouldIncludeInSmartReview(counts.attempts))
        .map(([wordId]) => wordId);

      rows.sort((a, b) => {
        if (b.incorrect !== a.incorrect) return b.incorrect - a.incorrect;
        if (b.total !== a.total) return b.total - a.total;
        return a.word.localeCompare(b.word);
      });

      return { rows, recentRows, reviewWordIds };
    }

    async function loadHistory() {
      setLoading(true);
      setLoadError(null);

      try {
        const attempts = await SpellingHistoryClient.getKidAttempts(kidId);
        const { rows, recentRows, reviewWordIds } = loadFromAttempts(attempts);

        if (isActive) {
          setStats(rows);
          setRecentStats(recentRows);
          setNeedsReviewWordIds(reviewWordIds);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading kid history:', error);
        if (isActive) {
          setLoadError('Unable to load history right now.');
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isActive = false;
    };
  }, [kidId]);

  const hasAttempts = stats.length > 0;

  if (loading) {
    return <div className="text-sm text-spelling-text-muted mt-3">Loading history...</div>;
  }

  if (loadError) {
    return <div className="text-sm text-spelling-error-text mt-3">{loadError}</div>;
  }

  if (!hasAttempts) {
    return <div className="text-sm text-spelling-text-muted mt-3">No attempts yet.</div>;
  }

  function toggleWord(wordId: string) {
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
        return next;
      }
      if (next.size >= MAX_SELECTED) {
        return next;
      }
      next.add(wordId);
      return next;
    });
  }

  function startPractice(wordIds: string[]) {
    if (!wordIds.length) return;
    const param = encodeURIComponent(wordIds.join(','));
    router.push(`/session?kidId=${kidId}&wordIds=${param}`);
  }

  function cancelMistakeRequest(wordId: string) {
    const controller = mistakeRequestControllers.current.get(wordId);
    if (!controller) return;
    controller.abort();
    mistakeRequestControllers.current.delete(wordId);
    setMistakeStatsByWordId(prev => {
      const current = prev[wordId];
      if (!current || current.status !== 'loading') return prev;
      return { ...prev, [wordId]: { status: 'idle', data: [] } };
    });
  }

  async function loadMistakeStats(wordId: string) {
    let shouldStart = false;
    setMistakeStatsByWordId(prev => {
      const current = prev[wordId];
      if (current?.status === 'loading' || current?.status === 'success') {
        return prev;
      }
      shouldStart = true;
      return { ...prev, [wordId]: { status: 'loading', data: [] } };
    });

    if (!shouldStart) return;

    const existingController = mistakeRequestControllers.current.get(wordId);
    if (existingController) {
      existingController.abort();
    }
    const controller = new AbortController();
    mistakeRequestControllers.current.set(wordId, controller);

    try {
      const data = await SpellingHistoryClient.getWordMistakeStats(kidId, wordId, controller.signal);
      if (mistakeRequestControllers.current.get(wordId) !== controller) {
        return;
      }
      mistakeRequestControllers.current.delete(wordId);
      setMistakeStatsByWordId(prev => ({
        ...prev,
        [wordId]: { status: 'success', data },
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      if (mistakeRequestControllers.current.get(wordId) !== controller) {
        return;
      }
      mistakeRequestControllers.current.delete(wordId);
      console.error('Error loading word mistakes:', error);
      setMistakeStatsByWordId(prev => ({
        ...prev,
        [wordId]: { status: 'error', data: [] },
      }));
    }
  }

  return (
    <KidHistoryPanelContent
      stats={stats}
      recentStats={recentStats}
      selectedWordIds={selectedWordIds}
      onToggleWord={toggleWord}
      onStartPractice={startPractice}
      onClearSelection={() => setSelectedWordIds(new Set())}
      needsReviewWordIds={needsReviewWordIds}
      expandedWordIds={expandedWordIds}
      onExpandedChange={nextValues => {
        setExpandedWordIds(prev => {
          const newlyOpened = nextValues.filter(value => !prev.includes(value));
          const newlyClosed = prev.filter(value => !nextValues.includes(value));
          newlyClosed.forEach(wordId => {
            cancelMistakeRequest(wordId);
          });
          newlyOpened.forEach(wordId => {
            void loadMistakeStats(wordId);
          });
          return nextValues;
        });
      }}
      mistakeStatsByWordId={mistakeStatsByWordId}
    />
  );
}
