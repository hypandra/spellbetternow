'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SpellingQuickAddWordFormProps {
  listId: string;
}

export default function SpellingQuickAddWordForm({ listId }: SpellingQuickAddWordFormProps) {
  const router = useRouter();
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!success) return;

    const timeoutId = setTimeout(() => {
      setSuccess(null);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [success]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = word.trim();
    if (!trimmed) {
      setError('Enter a word to add.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/spelling/import/add-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          words: [trimmed],
          sourceText: trimmed,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to add word.');
        return;
      }

      setWord('');
      setSuccess('Word added!');
      router.refresh();
    } catch (err) {
      console.error('[Spelling Quick Add Word] Error:', err);
      setError('Failed to add word.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded border border-spelling-border-input bg-spelling-lesson-bg p-3">
      <label className="block text-xs font-medium text-spelling-text-muted">Quick add one word</label>
      <div className="mt-2 flex gap-2">
        <input
          value={word}
          onChange={event => setWord(event.target.value)}
          placeholder="Enter one word"
          className="flex-1 rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text"
        />
        <button
          type="submit"
          disabled={isSubmitting || !word.trim()}
          className="rounded bg-spelling-primary px-4 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover disabled:opacity-60"
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-spelling-error-text text-pretty">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-spelling-text">{success}</p> : null}
    </form>
  );
}
