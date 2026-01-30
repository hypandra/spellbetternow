import type { Word } from '@/lib/spelling/db/words';

export function buildSpellingBeeAnnouncement(word: Word): string {
  const parts: string[] = [];

  parts.push(`Your word is ${word.word}`);

  if (word.definition) {
    parts.push(word.definition);
  }

  if (word.example_sentence) {
    parts.push(`Example: ${word.example_sentence}`);
  }

  parts.push(`Please spell ${word.word}`);

  return parts.join('. ');
}
