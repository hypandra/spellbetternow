'use client';

import { useState, useEffect } from 'react';
import type { Kid } from '@/lib/spelling/db/kids';
import { createClient } from '@/utils/supabase/client';
import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { THEME_CONTENT } from '@/features/spelling/constants/theme-content';
import { useSession } from '@/lib/auth-client';

interface SessionStartProps {
  kidId: string;
  onStart: (wordIds?: string[]) => void;
  wordIds?: string[];
}

type WordSelection = {
  id: string;
  word: string;
};

export default function SessionStart({ kidId, onStart, wordIds }: SessionStartProps) {
  const { theme } = useSpellingTheme();
  const themeContent = THEME_CONTENT[theme];
  const [kid, setKid] = useState<Kid | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWords, setSelectedWords] = useState<WordSelection[]>([]);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    async function loadKid() {
      if (isPending) {
        return;
      }

      if (!session?.user) {
        setKid(null);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const response = await fetch(`/api/spelling/kids/${kidId}`);

      if (!response.ok) {
        console.error('Error loading kid:', response.status);
        setKid(null);
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as { kid?: Kid };
      const kidData = payload.kid ?? null;
      if (!kidData) {
        setKid(null);
        setLoading(false);
        return;
      }

      setKid(kidData);

      if (wordIds?.length) {
        const { data: wordsData, error: wordsError } = await supabase
          .from('spelling_word_bank')
          .select('id, word')
          .in('id', wordIds)
          .eq('is_active', true);

        if (wordsError) {
          console.error('Error loading selected words:', wordsError);
        } else {
          setSelectedWords((wordsData || []) as WordSelection[]);
        }
      } else {
        setSelectedWords([]);
      }

      setLoading(false);
    }

    loadKid();
  }, [isPending, kidId, session, wordIds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === 'button' || tagName === 'input' || tagName === 'textarea') return;
      }
      if (loading || !kid) return;
      event.preventDefault();
      if (selectedWords.length > 0) {
        onStart(selectedWords.map(word => word.id));
        return;
      }
      onStart();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [kid, loading, onStart, selectedWords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!kid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Kid not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-spelling-text">Ready to Spell?</h1>
        <p className="text-sm text-spelling-text-muted">
          Listen to each word, then spell it. 5 words per set.
        </p>
        <div className="text-2xl">
          <p className="font-semibold text-spelling-text">{kid.display_name}</p>
          <p className="text-spelling-text-muted mt-2">
            Score {typeof kid.percentile === 'number' ? kid.percentile : '—'}
          </p>
        </div>
        {selectedWords.length > 0 && (
          <div className="rounded-lg border border-spelling-border border-[style:var(--spelling-border-style)] bg-spelling-lesson-bg p-4 text-left">
            <div className="text-sm font-semibold text-spelling-text mb-2">
              Practice set ({selectedWords.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map(word => (
                <div
                  key={word.id}
                  className="flex items-center gap-2 rounded-full bg-spelling-surface border border-spelling-border border-[style:var(--spelling-border-style)] px-3 py-1 text-sm text-spelling-text"
                >
                  <span>{word.word}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedWords(current => current.filter(item => item.id !== word.id))
                    }
                    className="text-spelling-text-muted hover:text-spelling-text"
                    aria-label={`Remove ${word.word}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-spelling-text-muted mt-3">
              Review practice words.
            </p>
          </div>
        )}
        <button
          onClick={() => {
            if (selectedWords.length > 0) {
              onStart(selectedWords.map(word => word.id));
              return;
            }
            onStart();
          }}
          className="px-8 py-4 bg-spelling-primary text-spelling-surface text-xl rounded-lg hover:bg-spelling-primary-hover transition-colors"
        >
          {selectedWords.length > 0
            ? themeContent.buttons.startPracticeSet
            : themeContent.buttons.start}
        </button>
      </div>
    </div>
  );
}
