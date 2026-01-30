const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'was',
  'were',
  'has',
  'have',
  'had',
  'not',
  'but',
]);

export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 14;

export function isValidWordLength(word: string): boolean {
  return word.length >= MIN_WORD_LENGTH && word.length <= MAX_WORD_LENGTH;
}

export function normalizeWord(input: string): string {
  if (!input) return '';
  const trimmed = input.toLowerCase().trim();
  if (!trimmed) return '';

  let cleaned = trimmed.replace(/[^a-z'-]/g, '');
  cleaned = cleaned.replace(/^['-]+|['-]+$/g, '');
  if (!cleaned) return '';

  const validPattern = /^[a-z](?:[a-z]|['-](?=[a-z]))*[a-z]$/;
  if (!validPattern.test(cleaned)) return '';

  return cleaned;
}

export function extractCandidatesFromText(text: string): string[] {
  if (!text) return [];

  const tokens = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeWord(token);
    if (!normalized) continue;
    if (!isValidWordLength(normalized)) continue;
    if (STOP_WORDS.has(normalized)) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    candidates.push(normalized);
  }

  return candidates;
}

export { STOP_WORDS };
