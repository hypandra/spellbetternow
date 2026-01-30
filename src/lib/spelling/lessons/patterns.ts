export interface PatternDefinition {
  name: string;
  explanation: string;
  contrast: string;
  question: string;
  answer: string;
}

export const PATTERN_TEMPLATES: Record<string, PatternDefinition> = {
  'silent-e': {
    name: 'silent-e',
    explanation: 'The silent-e changes the vowel sound.',
    contrast: 'cap → cape, tap → tape',
    question: 'Which one says /ā/ like "tape"?',
    answer: 'tape',
  },
  'tion-sion': {
    name: 'tion-sion',
    explanation: 'The -tion and -sion endings sound similar but are spelled differently.',
    contrast: 'action → /ak-shun/, mission → /mish-un/',
    question: 'Which ending makes the /shun/ sound?',
    answer: 'tion',
  },
  'double-consonant': {
    name: 'double-consonant',
    explanation: 'Sometimes we double consonants to keep the vowel sound short.',
    contrast: 'hop → hopped, tap → tapped',
    question: 'Why do we double the "p" in "hopped"?',
    answer: 'To keep the "o" short',
  },
  'ck-ending': {
    name: 'ck-ending',
    explanation: 'After a short vowel, we use "ck" instead of just "k".',
    contrast: 'back, pack, duck',
    question: 'What comes after the short vowel in "back"?',
    answer: 'ck',
  },
  'ee-ea': {
    name: 'ee-ea',
    explanation: 'Both "ee" and "ea" can make the long /ē/ sound.',
    contrast: 'see → sea, meet → meat',
    question: 'Which spelling makes the /ē/ sound in "sea"?',
    answer: 'ea',
  },
};

export function getPatternTemplate(pattern: string): PatternDefinition | null {
  return PATTERN_TEMPLATES[pattern] || null;
}

export function detectPattern(word: string): string | null {
  const lower = word.toLowerCase();

  if (lower.endsWith('e') && lower.length > 3 && !lower.endsWith('ee')) {
    return 'silent-e';
  }
  if (lower.includes('tion')) {
    return 'tion-sion';
  }
  if (lower.includes('sion') && !lower.includes('tion')) {
    return 'tion-sion';
  }
  // Check double-consonant before ck-ending and ee-ea
  // Many words with "ck" or "ee" also have double consonants
  if (/[bcdfghjklmnpqrstvwxyz]{2}/.test(lower)) {
    return 'double-consonant';
  }
  if (lower.endsWith('ck')) {
    return 'ck-ending';
  }
  if (lower.includes('ee') || lower.includes('ea')) {
    return 'ee-ea';
  }

  return null;
}

