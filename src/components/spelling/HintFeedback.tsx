'use client';

import { useState, useCallback } from 'react';

interface HintFeedbackProps {
  attemptId: string | null;
  wordId: string;
  kidId: string;
}

export default function HintFeedback({ attemptId, wordId, kidId }: HintFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const sendFeedback = useCallback(
    async (rating: boolean, text?: string) => {
      setSubmitted(true);
      try {
        await fetch('/api/spelling/hint-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            wordId,
            kidId,
            rating,
            feedbackText: text || undefined,
          }),
        });
      } catch {
        // Fire-and-forget — don't block the user
      }
    },
    [attemptId, wordId, kidId]
  );

  if (submitted) {
    return (
      <div className="text-xs text-spelling-text-muted text-center py-1">
        Thanks for the feedback
      </div>
    );
  }

  if (showTextInput) {
    return (
      <div className="flex items-center gap-2 justify-center">
        <input
          type="text"
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="What was wrong?"
          className="px-2 py-1 text-xs border border-spelling-border border-[style:var(--spelling-border-style)] rounded bg-spelling-surface text-spelling-text w-48"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void sendFeedback(false, feedbackText);
            }
          }}
        />
        <button
          type="button"
          onClick={() => void sendFeedback(false, feedbackText)}
          className="text-xs px-2 py-1 rounded bg-spelling-secondary text-spelling-text hover:bg-spelling-tertiary"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => {
            setShowTextInput(false);
            void sendFeedback(false);
          }}
          className="text-xs text-spelling-text-muted hover:text-spelling-text"
        >
          Skip
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 justify-center py-1">
      <span className="text-xs text-spelling-text-muted">Hints helpful?</span>
      <button
        type="button"
        onClick={() => void sendFeedback(true)}
        className="text-lg hover:scale-110 transition-transform"
        aria-label="Hints were helpful"
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => setShowTextInput(true)}
        className="text-lg hover:scale-110 transition-transform"
        aria-label="Hints were not helpful"
      >
        👎
      </button>
    </div>
  );
}
