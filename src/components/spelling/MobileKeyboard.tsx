'use client';

import { useCallback, useRef } from 'react';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

interface MobileKeyboardProps {
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onReplay: () => void;
  submitDisabled?: boolean;
  replayDisabled?: boolean;
  submitLabel?: string;
  replayLabel?: string;
}

export default function MobileKeyboard({
  onKey,
  onBackspace,
  onSubmit,
  onReplay,
  submitDisabled = false,
  replayDisabled = false,
  submitLabel = 'Check',
  replayLabel = 'Listen',
}: MobileKeyboardProps) {
  // Track whether a touch event fired so we can skip the subsequent mouse event.
  // On touch devices, browsers fire touchstart → mousedown → click for the same tap.
  const touchedRef = useRef(false);

  const guard = useCallback((fn: () => void) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (e.type === 'touchstart') {
      touchedRef.current = true;
      fn();
    } else {
      if (!touchedRef.current) {
        fn();
      }
      touchedRef.current = false;
    }
  }, []);

  return (
    <div
      className="w-full select-none"
      role="group"
      aria-label="On-screen keyboard"
    >
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-[3px] mb-[3px]">
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              onMouseDown={guard(() => onKey(letter))}
              onTouchStart={guard(() => onKey(letter))}
              className="flex items-center justify-center h-12 min-w-[30px] flex-1 max-w-[36px] rounded-md bg-spelling-secondary text-spelling-text text-lg font-medium active:bg-spelling-tertiary"
              aria-label={letter.toUpperCase()}
            >
              {letter.toUpperCase()}
            </button>
          ))}
          {rowIndex === 2 && (
            <button
              type="button"
              onMouseDown={guard(onBackspace)}
              onTouchStart={guard(onBackspace)}
              className="flex items-center justify-center h-12 px-2 min-w-[48px] rounded-md bg-spelling-secondary text-spelling-text text-sm font-semibold active:bg-spelling-tertiary"
              aria-label="Backspace"
            >
              &#9003;
            </button>
          )}
        </div>
      ))}
      {/* Bottom row: replay + submit */}
      <div className="flex justify-center gap-[3px]">
        <button
          type="button"
          onMouseDown={guard(onReplay)}
          onTouchStart={guard(onReplay)}
          disabled={replayDisabled}
          className="flex items-center justify-center h-12 flex-1 rounded-md bg-spelling-accent text-spelling-text text-sm font-semibold active:bg-spelling-tertiary disabled:opacity-50"
          aria-label="Listen again"
        >
          {replayLabel}
        </button>
        <button
          type="button"
          onMouseDown={guard(onSubmit)}
          onTouchStart={guard(onSubmit)}
          disabled={submitDisabled}
          className="flex items-center justify-center h-12 flex-1 rounded-md bg-spelling-primary text-spelling-surface text-sm font-semibold active:opacity-80 disabled:opacity-40"
          aria-label="Submit"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
