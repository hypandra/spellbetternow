'use client';

import { useState, useEffect } from 'react';
import type { Kid } from '@/lib/spelling/db/kids';
import type { PromptMode } from '@/features/spelling/types/session';
import { createClient } from '@/utils/supabase/client';
import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { THEME_CONTENT } from '@/features/spelling/constants/theme-content';
import { useSession } from '@/lib/auth-client';

interface SessionStartProps {
  kidId: string;
  onStart: (wordIds?: string[]) => void;
  wordIds?: string[];
  onEnableSound?: () => void;
}

type WordSelection = {
  id: string;
  word: string;
};

export default function SessionStart({ kidId, onStart, wordIds, onEnableSound }: SessionStartProps) {
  const { theme } = useSpellingTheme();
  const themeContent = THEME_CONTENT[theme];
  const [kid, setKid] = useState<Kid | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWords, setSelectedWords] = useState<WordSelection[]>([]);
  const [audioMode, setAudioMode] = useState<PromptMode>('audio');
  const [togglingMode, setTogglingMode] = useState(false);
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
      setAudioMode(kidData.audio_mode ?? 'audio');

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

  async function toggleAudioMode() {
    if (!kid || togglingMode) return;
    const newMode: PromptMode = audioMode === 'audio' ? 'no-audio' : 'audio';
    setTogglingMode(true);
    try {
      const res = await fetch(`/api/spelling/kids/${kid.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_mode: newMode }),
      });
      if (res.ok) {
        setAudioMode(newMode);
      }
    } catch (err) {
      console.error('Failed to update audio mode:', err);
    } finally {
      setTogglingMode(false);
    }
  }

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
          {audioMode === 'no-audio'
            ? 'Read the hints, then spell the word. 5 words per set.'
            : 'Listen to each word, then spell it. 5 words per set.'}
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
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${audioMode === 'audio' ? 'text-spelling-text font-medium' : 'text-spelling-text-muted'}`}>
            Audio
          </span>
          <button
            type="button"
            onClick={toggleAudioMode}
            disabled={togglingMode}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              audioMode === 'no-audio'
                ? 'bg-spelling-primary'
                : 'bg-spelling-tertiary'
            } disabled:opacity-50`}
            role="switch"
            aria-checked={audioMode === 'no-audio'}
            aria-label="Toggle text hints mode"
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-spelling-surface transition-transform ${
                audioMode === 'no-audio' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${audioMode === 'no-audio' ? 'text-spelling-text font-medium' : 'text-spelling-text-muted'}`}>
            Text hints
          </span>
          <span className="text-[10px] uppercase tracking-wider text-spelling-text-muted bg-spelling-secondary px-1.5 py-0.5 rounded">
            Beta
          </span>
        </div>

        <button
          onClick={() => {
            if (audioMode === 'audio') {
              onEnableSound?.();
            }
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
