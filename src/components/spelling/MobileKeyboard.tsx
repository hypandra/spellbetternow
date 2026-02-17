'use client';

import { useCallback, useRef } from 'react';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

// Pixels of horizontal drag to trigger one cursor step
const DRAG_THRESHOLD_PX = 20;

interface MobileKeyboardProps {
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onReplay: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  submitDisabled?: boolean;
  replayDisabled?: boolean;
  hideReplay?: boolean;
  submitLabel?: string;
  replayLabel?: string;
}

export default function MobileKeyboard({
  onKey,
  onBackspace,
  onSubmit,
  onReplay,
  onLeft,
  onRight,
  submitDisabled = false,
  replayDisabled = false,
  hideReplay = false,
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

  // Spacebar trackpad state
  const trackpadStartX = useRef(0);
  const trackpadAccumulated = useRef(0);
  const trackpadActive = useRef(false);

  const handleTrackpadTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    trackpadStartX.current = touch.clientX;
    trackpadAccumulated.current = 0;
    trackpadActive.current = true;
  }, []);

  const handleTrackpadTouchMove = useCallback((e: React.TouchEvent) => {
    if (!trackpadActive.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - trackpadStartX.current;
    const totalDelta = trackpadAccumulated.current + dx;

    if (Math.abs(totalDelta) >= DRAG_THRESHOLD_PX) {
      const steps = Math.trunc(totalDelta / DRAG_THRESHOLD_PX);
      if (steps > 0) {
        for (let i = 0; i < steps; i++) onRight?.();
      } else {
        for (let i = 0; i < -steps; i++) onLeft?.();
      }
      trackpadAccumulated.current = totalDelta - steps * DRAG_THRESHOLD_PX;
      trackpadStartX.current = touch.clientX;
    }
  }, [onLeft, onRight]);

  const handleTrackpadTouchEnd = useCallback(() => {
    trackpadActive.current = false;
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
      {/* Spacebar trackpad: drag left/right to move cursor */}
      {(onLeft || onRight) && (
        <div className="flex justify-center gap-[3px] mb-[3px]">
          <div
            role="none"
            onTouchStart={handleTrackpadTouchStart}
            onTouchMove={handleTrackpadTouchMove}
            onTouchEnd={handleTrackpadTouchEnd}
            onTouchCancel={handleTrackpadTouchEnd}
            className="flex items-center justify-center h-10 flex-1 rounded-md bg-spelling-secondary text-spelling-text-muted text-xs select-none cursor-grab active:cursor-grabbing active:bg-spelling-tertiary"
          >
            slide to move cursor
          </div>
        </div>
      )}
      {/* Bottom row: replay + submit */}
      <div className="flex justify-center gap-[3px]">
        {!hideReplay && (
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
        )}
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
