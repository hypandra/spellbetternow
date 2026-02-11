import { detectPattern, getPatternTemplate, findErrorAwarePattern, ERROR_TYPE_FRAMING } from './patterns';
import { normalizeContrast } from './normalize-contrast';
import type { Word } from '../db/words';
import type { AttemptData } from '../db/sessions';

export interface Lesson {
  pattern: string;
  explanation: string;
  contrast: string[];
  question: string;
  answer: string;
}

export interface MissedWord {
  word: string;
  userSpelling: string;
}

export function generateLessonForMiniSet(
  words: Word[],
  attempts: AttemptData[]
): Lesson | null {
  const missedWords: MissedWord[] = attempts
    .filter(a => !a.correct)
    .map(a => {
      const word = words.find(w => w.id === a.word_id);
      return word ? { word: word.word, userSpelling: a.user_spelling ?? '' } : null;
    })
    .filter((m): m is MissedWord => !!m);

  if (missedWords.length === 0) {
    return null;
  }

  return generateLessonFromMissedWords(missedWords);
}

/**
 * Generate a lesson from missed words with error-aware pattern matching.
 * Scans all missed words and picks the one with the strongest error-pattern overlap.
 */
export function generateLessonFromMissedWords(
  missedWords: MissedWord[]
): Lesson | null {
  if (missedWords.length === 0) {
    return null;
  }

  // Try error-aware matching across all missed words
  let bestResult: { patternId: string; framing: string | null } | null = null;
  let bestOverlap = -1;

  for (const missed of missedWords) {
    if (!missed.userSpelling) continue;

    const result = findErrorAwarePattern(missed.word, missed.userSpelling);
    if (result && result.overlapScore > bestOverlap) {
      bestOverlap = result.overlapScore;
      const framing = result.overlapScore > 0
        ? ERROR_TYPE_FRAMING[result.primaryOpType] ?? null
        : null;
      bestResult = { patternId: result.pattern.id, framing };
    }
  }

  // Fall back to first missed word's pattern detection (original behavior)
  if (!bestResult) {
    const patternId = detectPattern(missedWords[0].word);
    if (!patternId) {
      return {
        pattern: 'general',
        explanation: 'Keep practicing these tricky words!',
        contrast: normalizeContrast(null),
        question: '',
        answer: '',
      };
    }
    bestResult = { patternId, framing: null };
  }

  const template = getPatternTemplate(bestResult.patternId);
  if (!template) {
    return {
      pattern: bestResult.patternId,
      explanation: 'Keep practicing these tricky words!',
      contrast: normalizeContrast(null),
      question: '',
      answer: '',
    };
  }

  const explanation = bestResult.framing
    ? `${bestResult.framing} ${template.explanation}`
    : template.explanation;

  return {
    pattern: template.name,
    explanation,
    contrast: normalizeContrast(template.contrast),
    question: template.question,
    answer: template.answer,
  };
}
