'use client';

import type { Word } from '@/lib/spelling/db/words';

interface NoAudioHintPanelProps {
  word: Word;
  maskedDefinition: string;
  maskedSentence: string;
}

export default function NoAudioHintPanel({
  word,
  maskedDefinition,
  maskedSentence,
}: NoAudioHintPanelProps) {
  return (
    <div className="space-y-3 text-left">
      {word.part_of_speech && (
        <div>
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-spelling-secondary text-spelling-text">
            {word.part_of_speech}
          </span>
        </div>
      )}

      {maskedDefinition && (
        <p className="text-sm text-spelling-text">{maskedDefinition}</p>
      )}

      {maskedSentence && (
        <p className="text-sm text-spelling-text-muted italic">
          &ldquo;{maskedSentence}&rdquo;
        </p>
      )}

      {word.not_synonyms && word.not_synonyms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-spelling-text-muted">Not:</span>
          {word.not_synonyms.map((synonym) => (
            <span
              key={synonym}
              className="inline-block px-2 py-0.5 text-xs rounded-full border border-spelling-border border-[style:var(--spelling-border-style)] text-spelling-text-muted"
            >
              {synonym}
            </span>
          ))}
        </div>
      )}

      {word.letter_fragments && word.letter_fragments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-spelling-text-muted">Starts/ends:</span>
          {word.letter_fragments.map((fragment) => (
            <span
              key={fragment}
              className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-spelling-surface border border-spelling-border border-[style:var(--spelling-border-style)] text-spelling-text"
            >
              {fragment}
            </span>
          ))}
        </div>
      )}

      {word.rhyme_hints && word.rhyme_hints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-spelling-text-muted">Rhymes with:</span>
          {word.rhyme_hints.map((hint) => (
            <span
              key={hint}
              className="inline-block px-2 py-0.5 text-xs rounded-full border border-spelling-border border-[style:var(--spelling-border-style)] text-spelling-text-muted"
            >
              {hint}
            </span>
          ))}
        </div>
      )}

      {(word.phonetic || word.ipa) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-spelling-text-muted">Sounds like:</span>
          {word.phonetic && (
            <span className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-spelling-surface border border-spelling-border border-[style:var(--spelling-border-style)] text-spelling-text">
              {word.phonetic}
            </span>
          )}
          {word.ipa && (
            <span className="inline-block px-2 py-0.5 text-xs font-mono rounded text-spelling-text-muted" title="IPA transcription">
              {word.ipa}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
