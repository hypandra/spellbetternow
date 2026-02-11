import { detectPattern, getPatternTemplate } from './patterns';
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

export function generateLessonForMiniSet(
  words: Word[],
  attempts: AttemptData[]
): Lesson | null {
  const missedWords = attempts
    .filter(a => !a.correct)
    .map(a => {
      const word = words.find(w => w.id === a.word_id);
      return word?.word;
    })
    .filter((w): w is string => !!w);

  if (missedWords.length === 0) {
    return null;
  }

  const primaryMissed = missedWords[0];
  const pattern = detectPattern(primaryMissed);
  
  if (!pattern) {
    return {
      pattern: 'general',
      explanation: 'Keep practicing these tricky words!',
      contrast: normalizeContrast(null),
      question: '',
      answer: '',
    };
  }

  const template = getPatternTemplate(pattern);
  if (!template) {
    return {
      pattern,
      explanation: 'Keep practicing these tricky words!',
      contrast: normalizeContrast(null),
      question: '',
      answer: '',
    };
  }

  return {
    pattern: template.name,
    explanation: template.explanation,
    contrast: normalizeContrast(template.contrast),
    question: template.question,
    answer: template.answer,
  };
}
