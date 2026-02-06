'use client';

import { useCallback } from 'react';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

interface MobileKeyboardProps {
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitLabel?: string;
}

export default function MobileKeyboard({
  onKey,
  onBackspace,
  onSubmit,
  submitDisabled = false,
  submitLabel = 'Check',
}: MobileKeyboardProps) {
  const handleKey = useCallback(
    (letter: string) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      onKey(letter);
    },
    [onKey]
  );

  const handleBackspace = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      onBackspace();
    },
    [onBackspace]
  );

  const handleSubmit = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  return (
    <div
      className="w-full select-none"
      role="group"
      aria-label="On-screen keyboard"
    >
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-[3px] mb-[3px]">
          {rowIndex === 2 && (
            <button
              type="button"
              onMouseDown={handleSubmit}
              onTouchStart={handleSubmit}
              disabled={submitDisabled}
              className="flex items-center justify-center h-12 px-2 min-w-[48px] rounded-md bg-spelling-primary text-spelling-surface text-xs font-semibold active:opacity-80 disabled:opacity-40"
              aria-label="Submit"
            >
              {submitLabel}
            </button>
          )}
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              onMouseDown={handleKey(letter)}
              onTouchStart={handleKey(letter)}
              className="flex items-center justify-center h-12 min-w-[30px] flex-1 max-w-[36px] rounded-md bg-spelling-secondary text-spelling-text text-lg font-medium active:bg-spelling-tertiary"
              aria-label={letter.toUpperCase()}
            >
              {letter.toUpperCase()}
            </button>
          ))}
          {rowIndex === 2 && (
            <button
              type="button"
              onMouseDown={handleBackspace}
              onTouchStart={handleBackspace}
              className="flex items-center justify-center h-12 px-2 min-w-[48px] rounded-md bg-spelling-secondary text-spelling-text text-sm font-semibold active:bg-spelling-tertiary"
              aria-label="Backspace"
            >
              &#9003;
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
