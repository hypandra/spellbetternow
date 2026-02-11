'use client';

import { useState, useCallback, useMemo } from 'react';

type FeedbackOption = {
  value: string;
  label: string;
  icon?: string;
};

interface FeedbackPromptProps {
  prompt: string;
  options: FeedbackOption[];
  textInputOn: string[];
  textPlaceholder?: string;
  endpoint: string;
  payload: Record<string, unknown>;
  confirmText?: string;
  startOpen?: boolean;
  ratingKey?: string;
}

export default function FeedbackPrompt({
  prompt,
  options,
  textInputOn,
  textPlaceholder,
  endpoint,
  payload,
  confirmText = 'Thanks for the feedback',
  startOpen = true,
  ratingKey = 'rating',
}: FeedbackPromptProps) {
  const [open, setOpen] = useState(startOpen);
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const needsText = useCallback(
    (value: string) => textInputOn.includes(value),
    [textInputOn]
  );

  const sendFeedback = useCallback(
    async (rating: string, text?: string) => {
      setSubmitted(true);
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            [ratingKey]: rating,
            feedbackText: text || undefined,
          }),
        });
      } catch {
        // Fire-and-forget
      }
    },
    [endpoint, payload, ratingKey]
  );

  const hasIcons = useMemo(() => options.some((option) => Boolean(option.icon)), [options]);

  if (submitted) {
    return (
      <div className="text-xs text-spelling-text-muted text-center py-1">{confirmText}</div>
    );
  }

  if (!open) {
    return (
      <div className="text-center py-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-spelling-text-muted hover:text-spelling-text transition-colors"
          aria-label={prompt}
        >
          {prompt}
        </button>
      </div>
    );
  }

  if (selected && needsText(selected)) {
    return (
      <div className="flex items-center gap-2 justify-center py-1">
        <input
          type="text"
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder={textPlaceholder || 'Any details? (optional)'}
          className="px-2 py-1 text-xs border border-spelling-border border-[style:var(--spelling-border-style)] rounded bg-spelling-surface text-spelling-text w-48"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void sendFeedback(selected, feedbackText);
            }
          }}
        />
        <button
          type="button"
          onClick={() => void sendFeedback(selected, feedbackText)}
          className="text-xs px-2 py-1 rounded bg-spelling-secondary text-spelling-text hover:bg-spelling-tertiary"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => void sendFeedback(selected)}
          className="text-xs text-spelling-text-muted hover:text-spelling-text"
        >
          Skip
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center py-1 ${
        hasIcons ? 'gap-3' : 'flex-wrap gap-2'
      }`}
    >
      {startOpen ? <span className="text-xs text-spelling-text-muted">{prompt}</span> : null}
      {options.map((option) => {
        const isIcon = Boolean(option.icon);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (needsText(option.value)) {
                setSelected(option.value);
                return;
              }
              void sendFeedback(option.value);
            }}
            className={
              isIcon
                ? 'text-lg hover:scale-110 transition-transform'
                : 'text-xs px-2 py-1 border border-spelling-border border-[style:var(--spelling-border-style)] rounded bg-spelling-surface text-spelling-text-muted hover:text-spelling-text hover:bg-spelling-secondary transition-colors'
            }
            aria-label={option.label}
          >
            {option.icon ?? option.label}
          </button>
        );
      })}
      {!startOpen ? (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSelected(null);
            setFeedbackText('');
          }}
          className="text-xs text-spelling-text-muted hover:text-spelling-text"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
