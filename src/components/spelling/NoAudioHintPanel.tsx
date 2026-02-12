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
        word.level >= 5 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-spelling-text-muted">Sounds like:</span>
            {word.phonetic && (
              <span className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-spelling-surface border border-spelling-border border-[style:var(--spelling-border-style)] text-spelling-text">
                {word.phonetic}
              </span>
            )}
            {word.ipa && (
              <span className="inline-block px-2 py-0.5 text-xs rounded text-spelling-text-muted" style={{ fontFamily: 'var(--font-doulos-sil)' }} title="IPA transcription">
                {word.ipa}
              </span>
            )}
          </div>
        ) : (
          <details className="text-left">
            <summary className="text-xs font-medium text-spelling-text-muted cursor-pointer hover:text-spelling-text select-none">
              Pronunciation
            </summary>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-1">
              {word.phonetic && (
                <span className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-spelling-surface border border-spelling-border border-[style:var(--spelling-border-style)] text-spelling-text">
                  {word.phonetic}
                </span>
              )}
              {word.ipa && (
                <span className="inline-block px-2 py-0.5 text-xs rounded text-spelling-text-muted" style={{ fontFamily: 'var(--font-doulos-sil)' }} title="IPA transcription">
                  {word.ipa}
                </span>
              )}
            </div>
          </details>
        )
      )}
    </div>
  );
}
