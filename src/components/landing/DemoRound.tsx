'use client';

import { useMemo, useState } from 'react';
import { maskWordInSentence, randomizePlaceholderLength } from '@/lib/spelling/mask-sentence';

type DemoWord = {
  word: string;
  hint: string;
  usage: string;
};

type DemoAttempt = {
  word: string;
  answer: string;
  correct: boolean;
};

const DEMO_WORDS: DemoWord[] = [
  { word: 'harvest', hint: 'Gathering crops or results.', usage: 'The harvest festival began at dusk.' },
  { word: 'anchor', hint: 'Keeps a ship steady.', usage: 'Drop the anchor before nightfall.' },
  { word: 'lantern', hint: 'A portable light.', usage: 'She carried a lantern down the hall.' },
  { word: 'journey', hint: 'A long trip.', usage: 'Their journey crossed three states.' },
  { word: 'meadow', hint: 'A grassy field.', usage: 'Butterflies drifted over the meadow.' },
];

function buildFeedback(word: string, answer: string) {
  const normalizedAnswer = answer.toLowerCase();
  return word.split('').map((letter, index) => {
    const guess = normalizedAnswer[index] || '';
    const isMatch = guess === letter;
    return {
      letter: letter.toUpperCase(),
      isMatch,
      isMissing: guess.length === 0,
    };
  });
}

export default function DemoRound() {
  const [status, setStatus] = useState<'idle' | 'active' | 'complete'>('idle');
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [attempts, setAttempts] = useState<DemoAttempt[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentWord = DEMO_WORDS[index];
  const attemptCount = attempts.length;
  const placeholderLength = useMemo(
    () => randomizePlaceholderLength(currentWord.word.length),
    [currentWord.word]
  );

  const progressLabel = useMemo(() => {
    if (status === 'complete') return 'Round complete';
    if (status === 'active') return `Word ${index + 1} of ${DEMO_WORDS.length}`;
    return 'Start a demo round';
  }, [index, status]);

  function startDemo() {
    setStatus('active');
    setIndex(0);
    setValue('');
    setAttempts([]);
  }

  function resetDemo() {
    setStatus('idle');
    setIndex(0);
    setValue('');
    setAttempts([]);
  }

  function handleSubmit() {
    if (status !== 'active' || !currentWord) return;
    const answer = value.trim().toLowerCase();
    if (!answer) return;
    const correct = answer === currentWord.word;
    setAttempts(prev => [...prev, { word: currentWord.word, answer, correct }]);
    setValue('');
    if (index >= DEMO_WORDS.length - 1) {
      setStatus('complete');
    } else {
      setIndex(prev => prev + 1);
    }
  }

  async function handleSpeak() {
    if (typeof window === 'undefined' || !currentWord) return;
    setIsSpeaking(true);
    const fullText = `Your word is ${currentWord.word}. ${currentWord.hint}. Example: ${currentWord.usage}. Please spell ${currentWord.word}.`;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, voice: 'alloy', speed: 'normal' }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing demo audio:', error);
      setIsSpeaking(false);
    }
  }

  return (
    <div className="rounded-3xl border border-spelling-border bg-spelling-surface p-6 shadow-xl shadow-emerald-900/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-spelling-text-muted">Live demo</p>
          <h3 className="text-xl font-semibold text-spelling-text">{progressLabel}</h3>
        </div>
        {status === 'complete' ? (
          <button
            type="button"
            onClick={resetDemo}
            className="rounded-full border border-spelling-border px-3 py-1 text-xs font-semibold text-spelling-text hover:border-spelling-primary"
          >
            Reset
          </button>
        ) : (
          <span className="text-xs text-spelling-text-muted">{attemptCount} attempts</span>
        )}
      </div>

      {status === 'idle' && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-spelling-text-muted">
            Try a 5-word round. Hear each word, type your best spelling, and see letter-by-letter feedback.
          </p>
          <button
            type="button"
            onClick={startDemo}
            className="w-full rounded-2xl bg-spelling-primary px-4 py-3 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover"
          >
            Start demo round
          </button>
        </div>
      )}

      {status !== 'idle' && currentWord && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-spelling-border bg-spelling-accent px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-spelling-text">Listen and spell</p>
                <p className="text-xs text-spelling-text-muted">{currentWord.hint}</p>
              </div>
              <button
                type="button"
                onClick={handleSpeak}
                className="rounded-full border border-spelling-border px-3 py-1 text-xs font-semibold text-spelling-primary hover:border-spelling-primary"
              >
                {isSpeaking ? 'Playing...' : 'Hear word'}
              </button>
            </div>
            <p className="mt-2 text-xs text-spelling-text-muted italic whitespace-pre-wrap">
              "{maskWordInSentence(currentWord.usage, currentWord.word, placeholderLength)}"
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-spelling-text-muted">
              Your spelling
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={value}
                onChange={event => setValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    handleSubmit();
                  }
                }}
                className="flex-1 rounded-2xl border border-spelling-border-input bg-spelling-surface px-4 py-3 text-sm text-spelling-text shadow-sm focus:border-spelling-primary focus:outline-none"
                placeholder="Type the word"
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-2xl bg-spelling-primary px-4 py-3 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover"
              >
                Check
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-spelling-border bg-spelling-surface px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-spelling-text-muted">
              Letter feedback
            </div>
            {attempts.length === 0 ? (
              <p className="mt-3 text-sm text-spelling-text-muted">Submit a spelling to see feedback.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {attempts.map((attempt, attemptIndex) => {
                  const feedback = buildFeedback(attempt.word, attempt.answer);
                  return (
                    <div
                      key={`${attempt.word}-${attemptIndex}`}
                      className="rounded-xl border border-spelling-border bg-spelling-accent px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1 text-sm font-semibold">
                          {feedback.map((entry, letterIndex) => (
                            <span
                              key={`${attempt.word}-${attemptIndex}-${letterIndex}`}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm ${
                                entry.isMissing
                                  ? 'border-spelling-border bg-spelling-surface text-spelling-text-muted'
                                  : entry.isMatch
                                    ? 'border-spelling-success-text/20 bg-spelling-success-bg text-spelling-success-text'
                                    : 'border-spelling-error-text/20 bg-spelling-error-bg text-spelling-error-text'
                              }`}
                            >
                              {entry.isMissing ? '_' : entry.letter}
                            </span>
                          ))}
                        </div>
                        <div
                          className={`text-xs font-semibold ${
                            attempt.correct
                              ? 'text-spelling-success-text'
                              : 'text-spelling-error-text'
                          }`}
                        >
                          {attempt.correct ? 'Correct' : `Correct: ${attempt.word}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {status === 'complete' && (
            <div className="rounded-2xl border border-spelling-border bg-spelling-accent px-4 py-3 text-sm text-spelling-text">
              Demo complete! Sign in to save progress, adjust difficulty, and track stats for each learner.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
