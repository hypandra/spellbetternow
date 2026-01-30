'use client';

import type { DiffOp, DiffSummary } from '@/lib/spelling/errors/spelling-diff';
import { getErrorDescription } from '@/lib/spelling/errors/spelling-diff';

interface SpellingErrorDiffProps {
  ops: DiffOp[];
  summary: DiffSummary;
  correctSpelling: string;
  userSpelling: string;
}

/**
 * Displays a letter-by-letter comparison of correct vs user spelling.
 * Highlights substitutions, omissions, additions, and transpositions.
 */
export default function SpellingErrorDiff({
  ops,
  summary,
  correctSpelling,
  userSpelling,
}: SpellingErrorDiffProps) {
  const errorDescription = getErrorDescription(summary);

  return (
    <div className="mt-3 space-y-2">
      {/* Letter comparison grid */}
      <div className="flex flex-col gap-0.5 font-mono text-base">
        {/* User's attempt */}
        <div className="flex items-center">
          <span className="text-xs text-spelling-text-muted w-12 text-right mr-1 shrink-0">You:</span>
          <div className="flex">
            {ops.map((op, index) => {
              if (op.type === 'omission') {
                // User missed this letter - show empty slot
                return (
                  <span
                    key={`user-${index}`}
                    className="inline-flex items-center justify-center w-5 h-6 rounded border border-dashed border-spelling-error-text/40 text-spelling-error-text/40 text-sm"
                    aria-label="missing letter"
                  >
                    _
                  </span>
                );
              }

              const char = op.userChar ?? '';
              const displayChar = op.type === 'transposition' ? char : char;

              let className = 'inline-flex items-center justify-center w-5 h-6 rounded text-sm ';

              switch (op.type) {
                case 'match':
                  className += 'bg-spelling-success-bg/50 text-spelling-success-text';
                  break;
                case 'substitution':
                  className += 'bg-spelling-error-bg text-spelling-error-text font-semibold';
                  break;
                case 'addition':
                  className += 'bg-spelling-error-bg text-spelling-error-text line-through';
                  break;
                case 'transposition':
                  className += 'bg-amber-100 text-amber-800 font-semibold';
                  break;
              }

              return (
                <span key={`user-${index}`} className={className}>
                  {displayChar.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>

        {/* Correct spelling */}
        <div className="flex items-center">
          <span className="text-xs text-spelling-text-muted w-12 text-right mr-1 shrink-0">Correct:</span>
          <div className="flex">
            {ops
              .filter((op) => op.type !== 'addition')
              .map((op, index) => {
                const char = op.correctChar ?? '';

                let className = 'inline-flex items-center justify-center w-5 h-6 rounded text-sm ';

                switch (op.type) {
                  case 'match':
                    className += 'bg-spelling-success-bg/50 text-spelling-success-text';
                    break;
                  case 'substitution':
                  case 'omission':
                    className += 'bg-spelling-success-bg text-spelling-success-text font-semibold';
                    break;
                  case 'transposition':
                    className += 'bg-amber-100 text-amber-800 font-semibold';
                    break;
                }

                return (
                  <span key={`correct-${index}`} className={className}>
                    {char.toUpperCase()}
                  </span>
                );
              })}
          </div>
        </div>
      </div>

      {/* Error summary */}
      {errorDescription && (
        <p className="text-sm text-spelling-text-muted mt-2 break-words">
          {errorDescription.charAt(0).toUpperCase() + errorDescription.slice(1)}
        </p>
      )}
    </div>
  );
}
