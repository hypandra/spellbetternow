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
  const [phase, setPhase] = useState<'idle' | 'enriching' | 'adding'>('idle');

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

    try {
      // Step 1: Enrich the word
      setPhase('enriching');
      const enrichResponse = await fetch('/api/spelling/import/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [trimmed] }),
      });

      if (!enrichResponse.ok) {
        const payload = (await enrichResponse.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Could not look up this word. Try again.');
        return;
      }

      const enrichData = (await enrichResponse.json()) as {
        enriched?: Array<{
          word: string;
          definition: string;
          example_sentence: string;
          part_of_speech: string;
          level: number;
          estimated_elo: number;
        }>;
      };
      const enriched = enrichData.enriched?.[0];
      if (!enriched) {
        setError('Could not look up this word. Check the spelling and try again.');
        return;
      }

      // Step 2: Add the enriched word to the list
      setPhase('adding');
      const addResponse = await fetch('/api/spelling/import/add-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          words: [{
            word: enriched.word,
            definition: enriched.definition,
            example_sentence: enriched.example_sentence,
            part_of_speech: enriched.part_of_speech,
            level: enriched.level,
            estimated_elo: enriched.estimated_elo,
          }],
          sourceText: trimmed,
        }),
      });

      if (!addResponse.ok) {
        const payload = (await addResponse.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Could not add this word. Check the spelling and try again.');
        return;
      }

      setWord('');
      setSuccess('Word added!');
      router.refresh();
    } catch (err) {
      console.error('[Spelling Quick Add Word] Error:', err);
      setError(
        phase === 'enriching'
          ? 'Could not look up this word. Check your connection and try again.'
          : 'Could not add this word. Check the spelling and try again.'
      );
    } finally {
      setPhase('idle');
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
          className="flex-1 rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-base text-spelling-text"
        />
        <button
          type="submit"
          disabled={phase !== 'idle' || !word.trim()}
          className="inline-flex min-h-[44px] items-center rounded bg-spelling-primary px-4 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover disabled:opacity-60"
        >
          {phase === 'enriching' ? 'Looking up...' : phase === 'adding' ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-spelling-error-text text-pretty">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-spelling-text">{success}</p> : null}
    </form>
  );
}
