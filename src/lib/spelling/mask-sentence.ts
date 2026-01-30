export function randomizePlaceholderLength(wordLength: number): number {
  const offsets = [-2, -1, 0, 1, 2];
  const offset = offsets[Math.floor(Math.random() * offsets.length)] ?? 0;
  return Math.max(3, wordLength + offset);
}

export function maskWordInSentence(
  sentence: string,
  word: string,
  placeholderLength?: number
): string {
  if (!sentence || !word) return sentence;

  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
  const resolvedLength = Math.max(3, placeholderLength ?? word.length);
  const placeholder = `{${' '.repeat(resolvedLength)}}`;

  if (!regex.test(sentence)) {
    return sentence;
  }

  return sentence.replace(regex, placeholder);
}
