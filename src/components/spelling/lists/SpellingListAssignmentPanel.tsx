'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Learner = {
  id: string;
  display_name: string;
  level_current: number;
  percentile?: number;
};

type Assignment = {
  kid_id: string;
  is_enabled: boolean | null;
  weight: number | null;
};

type AssignmentState = {
  isEnabled: boolean;
  weight: number;
};

interface SpellingListAssignmentPanelProps {
  listId: string;
  learners: Learner[];
  assignments: Assignment[];
}

export default function SpellingListAssignmentPanel({
  listId,
  learners,
  assignments,
}: SpellingListAssignmentPanelProps) {
  const initialAssignments = useMemo(() => {
    const map: Record<string, AssignmentState> = {};
    for (const assignment of assignments) {
      map[assignment.kid_id] = {
        isEnabled: assignment.is_enabled ?? true,
        weight: assignment.weight ?? 1,
      };
    }
    return map;
  }, [assignments]);

  const router = useRouter();
  const [state, setState] = useState<Record<string, AssignmentState>>(initialAssignments);
  const [pendingKidId, setPendingKidId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateAssignment = async (kidId: string, next: AssignmentState) => {
    setPendingKidId(kidId);
    setError(null);

    try {
      const response = await fetch(`/api/spelling/lists/${listId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, isEnabled: next.isEnabled, weight: next.weight }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Could not save this change. Try again.');
      }
    } catch (err) {
      console.error('[Spelling List Assignment] Error:', err);
      setError('Could not save this change. Try again.');
    } finally {
      setPendingKidId(null);
    }
  };

  const handleToggle = (kidId: string, enabled: boolean) => {
    setState(current => {
      const next = { ...current, [kidId]: { isEnabled: enabled, weight: current[kidId]?.weight ?? 1 } };
      updateAssignment(kidId, next[kidId]);
      return next;
    });
  };

  const handleWeight = (kidId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const weight = Number.isNaN(parsed) ? 1 : Math.min(10, Math.max(1, parsed));
    setState(current => {
      const next = { ...current, [kidId]: { isEnabled: current[kidId]?.isEnabled ?? true, weight } };
      updateAssignment(kidId, next[kidId]);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
      <h2 className="text-lg font-semibold text-spelling-text">Assign to learners</h2>
      <p className="mt-1 text-sm text-spelling-text-muted">
        Toggle which learners should receive this list and adjust the weight.
        Higher weight (1–10) means words from this list appear more often in practice.
      </p>
      {learners.length === 0 && (
        <p className="mt-4 text-sm text-spelling-text-muted">
          No learners found. Add a learner from the dashboard first.
        </p>
      )}
      <div className="mt-4 space-y-3">
        {learners.length > 0 &&
          learners.map(kid => {
            const assignment = state[kid.id] ?? { isEnabled: false, weight: 1 };
            const isPending = pendingKidId === kid.id;

            return (
              <div
                key={kid.id}
                className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 rounded border border-spelling-border-input bg-spelling-lesson-bg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-spelling-text">{kid.display_name}</p>
                  <p className="text-xs text-spelling-text-muted">
                    Score {typeof kid.percentile === 'number' ? kid.percentile : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex min-h-[44px] items-center gap-2 text-sm text-spelling-text">
                    <input
                      type="checkbox"
                      checked={assignment.isEnabled}
                      onChange={event => handleToggle(kid.id, event.target.checked)}
                      disabled={isPending}
                      className="h-4 w-4"
                    />
                    Enabled
                  </label>
                  <label className="flex min-h-[44px] items-center gap-2 text-sm text-spelling-text">
                    Weight
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={assignment.weight}
                      onChange={event => handleWeight(kid.id, event.target.value)}
                      disabled={isPending}
                      className="min-h-[44px] w-16 rounded border border-spelling-border-input bg-spelling-surface px-2 py-1 text-base text-spelling-text"
                    />
                  </label>
                  {isPending ? (
                    <span className="text-xs text-spelling-text-muted">Saving...</span>
                  ) : null}
                  {assignment.isEnabled && !isPending && (
                    <button
                      onClick={() =>
                        router.push(`/session?kidId=${kid.id}&listId=${listId}&autoStart=1`)
                      }
                      className="min-h-[44px] rounded bg-spelling-primary px-3 py-1 text-sm text-spelling-surface hover:bg-spelling-primary-hover transition-colors flex items-center gap-1.5"
                    >
                      <span className="inline-block rounded bg-spelling-surface/20 px-1.5 py-0.5 text-xs font-medium">List</span>
                      Study
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      {error ? <p className="mt-3 text-sm text-spelling-error-text">{error}</p> : null}
    </div>
  );
}
