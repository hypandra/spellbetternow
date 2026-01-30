'use client';

import { useState } from 'react';
import { computeSpellingDiff, getErrorDescription } from '@/lib/spelling/errors/spelling-diff';
import SpellingErrorDiff from '@/components/spelling/SpellingErrorDiff';

const EXAMPLES = [
  {
    correct: 'receive',
    attempt: 'recieve',
    description: 'Common "i before e" error',
  },
  {
    correct: 'necessary',
    attempt: 'neccessary',
    description: 'Double consonant confusion',
  },
  {
    correct: 'friend',
    attempt: 'freind',
    description: 'Transposed letters',
  },
  {
    correct: 'separate',
    attempt: 'seprate',
    description: 'Missing letter',
  },
  {
    correct: 'rhythm',
    attempt: 'rythym',
    description: 'Extra letter added',
  },
  {
    correct: 'accommodate',
    attempt: 'accomodate',
    description: 'Missing double letter',
  },
];

function ExampleCard({
  correct,
  attempt,
  description,
}: {
  correct: string;
  attempt: string;
  description: string;
}) {
  const diff = computeSpellingDiff(correct, attempt);
  const errorDesc = getErrorDescription(diff.summary);

  return (
    <div className="p-4 rounded-lg border border-spelling-border bg-spelling-surface overflow-hidden">
      <p className="text-sm text-spelling-text-muted mb-3">{description}</p>
      <div className="bg-spelling-error-bg/50 rounded-lg p-4 overflow-x-auto">
        <SpellingErrorDiff
          ops={diff.ops}
          summary={diff.summary}
          correctSpelling={correct}
          userSpelling={attempt}
        />
      </div>
      {errorDesc && (
        <p className="text-xs text-spelling-text-muted mt-2 italic break-words">
          Detected: {errorDesc}
        </p>
      )}
    </div>
  );
}

function TryItYourself() {
  const [correctWord, setCorrectWord] = useState('beautiful');
  const [attempt, setAttempt] = useState('beutiful');

  const isIncorrect = correctWord.toLowerCase() !== attempt.toLowerCase();
  const diff = isIncorrect ? computeSpellingDiff(correctWord, attempt) : null;

  return (
    <div className="p-6 rounded-lg border border-spelling-border bg-spelling-lesson-bg">
      <h3 className="text-lg font-semibold text-spelling-text mb-4">Try It</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-spelling-text-muted mb-1">
            Correct spelling
          </label>
          <input
            type="text"
            value={correctWord}
            onChange={(e) => setCorrectWord(e.target.value)}
            className="w-full px-3 py-2 border border-spelling-border-input rounded bg-spelling-surface text-spelling-text"
            placeholder="Enter correct word"
          />
        </div>
        <div>
          <label className="block text-sm text-spelling-text-muted mb-1">
            Attempt (with errors)
          </label>
          <input
            type="text"
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
            className="w-full px-3 py-2 border border-spelling-border-input rounded bg-spelling-surface text-spelling-text"
            placeholder="Enter misspelling"
          />
        </div>
      </div>

      {diff ? (
        <div className="bg-spelling-error-bg/50 rounded-lg p-4">
          <SpellingErrorDiff
            ops={diff.ops}
            summary={diff.summary}
            correctSpelling={correctWord}
            userSpelling={attempt}
          />
          <p className="text-xs text-spelling-text-muted mt-3">
            {getErrorDescription(diff.summary)}
          </p>
        </div>
      ) : (
        <div className="bg-spelling-success-bg/50 rounded-lg p-4 text-center text-spelling-success-text">
          Correct spelling
        </div>
      )}
    </div>
  );
}

export default function WalkthroughPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-spelling-text mb-2">
        Error Feedback
      </h1>
      <p className="text-spelling-text-muted mb-8">
        When a word is spelled incorrectly, learners see exactly which letters
        need attention. This targeted feedback helps identify patterns in mistakes.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-spelling-text mb-4">
          How It Works
        </h2>
        <div className="space-y-3 text-spelling-text">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-spelling-success-bg/50 text-spelling-success-text text-sm font-mono">
              A
            </span>
            <p>
              <strong>Green</strong> letters are correct and in the right position.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-spelling-error-bg text-spelling-error-text text-sm font-mono font-semibold">
              X
            </span>
            <p>
              <strong>Red</strong> letters are substitutions (wrong letter used).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded border-2 border-dashed border-spelling-error-text/40 text-spelling-error-text/40 text-sm font-mono">
              _
            </span>
            <p>
              <strong>Dashed</strong> slots show missing letters (omissions).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-spelling-error-bg text-spelling-error-text text-sm font-mono line-through">
              Z
            </span>
            <p>
              <strong>Strikethrough</strong> letters are extras that shouldn&apos;t be there.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-100 text-amber-800 text-sm font-mono font-semibold">
              AB
            </span>
            <p>
              <strong>Amber</strong> letters are transposed (swapped order).
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-spelling-text mb-4">
          Examples
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXAMPLES.map((example) => (
            <ExampleCard
              key={`${example.correct}-${example.attempt}`}
              correct={example.correct}
              attempt={example.attempt}
              description={example.description}
            />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-spelling-text mb-4">
          Interactive Demo
        </h2>
        <TryItYourself />
      </section>

      <section className="text-sm text-spelling-text-muted">
        <h2 className="text-lg font-semibold text-spelling-text mb-2">
          Why This Matters
        </h2>
        <p className="mb-2">
          Traditional spelling feedback shows only &quot;correct&quot; or &quot;incorrect.&quot;
          This letter-level analysis helps learners:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>See exactly where their attempt went wrong</li>
          <li>Notice patterns in their mistakes (e.g., always swapping &quot;ie&quot;)</li>
          <li>Build muscle memory for correct letter sequences</li>
          <li>Self-correct without external explanation</li>
        </ul>
      </section>
    </div>
  );
}
