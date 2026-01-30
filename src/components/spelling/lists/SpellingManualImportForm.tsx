'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SpellingManualImportFormProps {
  listId: string;
}

export default function SpellingManualImportForm({ listId }: SpellingManualImportFormProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedWords = useMemo(
    () => candidates.filter(word => selected[word]),
    [candidates, selected]
  );

  const handleExtract = async () => {
    setError(null);
    setIsExtracting(true);

    try {
      const response = await fetch('/api/spelling/import/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to extract candidates.');
        return;
      }

      const payload = (await response.json()) as { candidates?: string[] };
      const words = Array.isArray(payload.candidates) ? payload.candidates : [];
      const nextSelected: Record<string, boolean> = {};
      for (const word of words) {
        nextSelected[word] = true;
      }
      setCandidates(words);
      setSelected(nextSelected);
    } catch (err) {
      console.error('[Spelling Manual Import] Error:', err);
      setError('Failed to extract candidates.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddWords = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/spelling/import/add-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          words: selectedWords,
          sourceText: text.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to add words.');
        return;
      }

      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err) {
      console.error('[Spelling Add Words] Error:', err);
      setError('Failed to add words.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const word of candidates) {
      next[word] = checked;
    }
    setSelected(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
        <label className="block text-sm font-medium text-spelling-text">Paste your words</label>
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          className="mt-2 w-full rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text"
          rows={6}
          placeholder="Paste a paragraph or list of words"
        />
        <button
          type="button"
          onClick={handleExtract}
          disabled={isExtracting || !text.trim()}
          className="mt-3 rounded bg-spelling-secondary px-4 py-2 text-sm font-semibold text-spelling-text hover:bg-spelling-tertiary disabled:opacity-60"
        >
          {isExtracting ? 'Extracting...' : 'Extract candidates'}
        </button>
      </div>

      <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-spelling-text">Preview candidates</h2>
            <p className="text-sm text-spelling-text-muted">
              {candidates.length} candidates, {selectedWords.length} selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="rounded border border-spelling-border-input px-3 py-1 text-xs text-spelling-text"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="rounded border border-spelling-border-input px-3 py-1 text-xs text-spelling-text"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map(word => (
            <label
              key={word}
              className="flex items-center gap-2 rounded border border-spelling-border-input bg-spelling-lesson-bg px-2 py-1 text-sm text-spelling-text"
            >
              <input
                type="checkbox"
                checked={Boolean(selected[word])}
                onChange={event =>
                  setSelected(current => ({ ...current, [word]: event.target.checked }))
                }
                className="h-4 w-4"
              />
              {word}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddWords}
          disabled={selectedWords.length === 0 || isSubmitting}
          className="mt-4 rounded bg-spelling-primary px-4 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover disabled:opacity-60"
        >
          {isSubmitting ? 'Adding...' : 'Add selected words'}
        </button>
      </div>

      {error ? <p className="text-sm text-spelling-error-text">{error}</p> : null}
    </div>
  );
}
