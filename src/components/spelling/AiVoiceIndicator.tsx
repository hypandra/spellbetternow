'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AiVoiceIndicator() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-[0.65rem] text-spelling-text-muted hover:text-spelling-text transition-colors inline-flex items-center gap-1"
        aria-expanded={expanded}
      >
        <span aria-hidden="true">🔊</span> AI voice
        <span className="text-[0.6rem]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 text-left text-xs text-spelling-text-muted bg-spelling-surface border border-spelling-border border-[style:var(--spelling-border-style)] rounded-lg p-3 max-w-sm mx-auto space-y-2">
          <p>
            <strong className="text-spelling-text">Voice:</strong> A computer-generated voice reads each word aloud — not a human recording. It&apos;s generally accurate but may stumble on unusual words.
          </p>
          <p>
            <strong className="text-spelling-text">Difficulty:</strong> Words adapt to your learner. Get words right and they get harder; miss words and they ease back.
          </p>
          <p>
            <strong className="text-spelling-text">Tips:</strong> Spelling tips come from a <Link href="/patterns" className="underline hover:text-spelling-text">curated library</Link> of common patterns, not AI. We match your missed word to the most relevant tip.
          </p>
        </div>
      )}
    </div>
  );
}
