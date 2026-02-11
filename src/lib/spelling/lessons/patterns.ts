export interface PatternDefinition {
  name: string;
  explanation: string;
  contrast: string[];
  question: string;
  answer: string;
}

const HOMOPHONE_WORDS = new Set([
  'their',
  'there',
  "they're",
  'to',
  'too',
  'two',
  'your',
  "you're",
  'its',
  "it's",
  'hear',
  'here',
  'right',
  'write',
  'no',
  'know',
  'one',
  'won',
  'pair',
  'pear',
  'sea',
  'see',
  'break',
  'brake',
]);

const LONG_O_OW_WORDS = new Set([
  'snow',
  'grow',
  'show',
  'slow',
  'blow',
  'throw',
  'know',
  'crow',
  'flow',
  'glow',
  'row',
  'low',
]);

const OU_OW_WORDS = new Set([
  'cow',
  'now',
  'how',
  'wow',
  'down',
  'town',
  'brown',
  'clown',
  'frown',
]);

export const PATTERN_TEMPLATES: Record<string, PatternDefinition> = {
  'silent-e': {
    name: 'silent-e',
    explanation: 'The silent-e changes the vowel sound.',
    contrast: ['cap → cape', 'tap → tape'],
    question: 'Which one says /ā/ like "tape"?',
    answer: 'tape',
  },
  'tion-sion': {
    name: 'tion-sion',
    explanation: 'The -tion and -sion endings sound similar but are spelled differently.',
    contrast: ['action → mission', 'tension → division'],
    question: 'Which ending usually makes the /shun/ sound?',
    answer: 'tion',
  },
  'double-consonant': {
    name: 'double-consonant',
    explanation: 'Sometimes we double consonants to keep the vowel sound short.',
    contrast: ['hop → hopped', 'tap → tapped'],
    question: 'Why do we double the "p" in "hopped"?',
    answer: 'To keep the "o" short',
  },
  'ck-ending': {
    name: 'ck-ending',
    explanation: 'After a short vowel, we use "ck" instead of just "k".',
    contrast: ['back → pack', 'duck → kick'],
    question: 'What comes after the short vowel in "back"?',
    answer: 'ck',
  },
  'ee-ea': {
    name: 'ee-ea',
    explanation: 'Both "ee" and "ea" can make the long /ē/ sound.',
    contrast: ['see → sea', 'meet → meat'],
    question: 'Which spelling makes the /ē/ sound in "sea"?',
    answer: 'ea',
  },
  'ai-ay': {
    name: 'ai-ay',
    explanation: 'The vowel team ai/ay usually says /ā/. Use ai in the middle, ay at the end.',
    contrast: ['rain → play', 'trail → stay'],
    question: 'Which spelling do we often use at the end of a word?',
    answer: 'ay',
  },
  'oa-ow': {
    name: 'oa-ow',
    explanation: 'The vowel team oa/ow can say the long /ō/ sound.',
    contrast: ['boat → snow', 'road → grow'],
    question: 'Which spelling uses two vowels together in the middle?',
    answer: 'oa',
  },
  'ou-ow': {
    name: 'ou-ow',
    explanation: 'The vowel team ou/ow often says /ou/ like in "cloud" or "cow".',
    contrast: ['cloud → cow', 'round → now'],
    question: 'Which spelling uses two vowels together?',
    answer: 'ou',
  },
  'ight': {
    name: 'ight',
    explanation: 'The pattern -ight usually says /īt/.',
    contrast: ['light → night', 'fight → sight'],
    question: 'What sound does -ight usually make?',
    answer: '/īt/',
  },
  'ough': {
    name: 'ough',
    explanation: 'The spelling -ough can make different sounds depending on the word.',
    contrast: ['though → through', 'tough → cough'],
    question: 'Is -ough always pronounced the same way?',
    answer: 'No, it can sound different',
  },
  'plural-rules': {
    name: 'plural-rules',
    explanation: 'Plurals can end in -s, -es, or -ies depending on the word.',
    contrast: ['cat → cats', 'box → boxes', 'puppy → puppies'],
    question: 'What do we change y to before adding -es?',
    answer: 'i',
  },
  'ie-ei': {
    name: 'ie-ei',
    explanation: 'Many words follow the i-before-e rule except after c.',
    contrast: ['believe → receive', 'field → ceiling'],
    question: 'Which spelling usually follows the letter c?',
    answer: 'ei',
  },
  'soft-cg': {
    name: 'soft-cg',
    explanation: 'C and G sound soft before e, i, or y.',
    contrast: ['city → cycle', 'giant → gym'],
    question: 'Which letters make c and g sound soft?',
    answer: 'e, i, or y',
  },
  'ph-f': {
    name: 'ph-f',
    explanation: 'The letters "ph" can make the /f/ sound.',
    contrast: ['phone → photo', 'graph → elephant'],
    question: 'What sound does "ph" make?',
    answer: '/f/',
  },
  'silent-letters': {
    name: 'silent-letters',
    explanation: 'Some words start with silent letters like kn, wr, or gn.',
    contrast: ['knife → knee', 'write → wrong', 'gnaw → gnome'],
    question: 'Which letter is silent in "knife"?',
    answer: 'k',
  },
  'able-ible': {
    name: 'able-ible',
    explanation: 'Some adjectives end in -able or -ible.',
    contrast: ['washable → edible', 'comfortable → possible'],
    question: 'Which ending is more common in English?',
    answer: '-able',
  },
  'ful-less': {
    name: 'ful-less',
    explanation: 'The suffixes -ful and -less change a word\'s meaning.',
    contrast: ['helpful → joyful', 'careless → painless'],
    question: 'What does -less mean?',
    answer: 'without',
  },
  'homophones': {
    name: 'homophones',
    explanation: 'Some words sound the same but have different spellings and meanings.',
    contrast: ['their ↔ there', 'to ↔ too', 'right ↔ write'],
    question: 'Which spelling means "in that place"?',
    answer: 'there',
  },
  'qu': {
    name: 'qu',
    explanation: 'The letters "qu" usually stick together to make the /kw/ sound.',
    contrast: ['queen → quick', 'squeak → question'],
    question: 'What sound does "qu" usually make?',
    answer: '/kw/',
  },
  'dge': {
    name: 'dge',
    explanation: 'After a short vowel, we often use -dge to make the /j/ sound.',
    contrast: ['bridge → judge', 'badge → edge'],
    question: 'Which ending often follows a short vowel for /j/?',
    answer: 'dge',
  },
};

export function getPatternTemplate(pattern: string): PatternDefinition | null {
  return PATTERN_TEMPLATES[pattern] || null;
}

const PATTERN_DETECTORS: Array<{ id: string; test: (word: string) => boolean }> = [
  {
    id: 'silent-letters',
    test: word => /^(kn|wr|gn)/.test(word),
  },
  {
    id: 'qu',
    test: word => word.includes('qu'),
  },
  {
    id: 'dge',
    test: word => word.endsWith('dge'),
  },
  {
    id: 'ight',
    test: word => word.includes('ight'),
  },
  {
    id: 'ough',
    test: word => word.includes('ough'),
  },
  {
    id: 'tion-sion',
    test: word => word.includes('tion') || word.includes('sion'),
  },
  {
    id: 'able-ible',
    test: word => word.endsWith('able') || word.endsWith('ible'),
  },
  {
    id: 'ful-less',
    test: word => word.endsWith('ful') || word.endsWith('less'),
  },
  {
    id: 'plural-rules',
    test: word => {
      // Only match clear plural transformations, not words that naturally end in s
      if (word.endsWith('ies') && word.length > 4) return true;
      if (word.endsWith('xes') || word.endsWith('shes') || word.endsWith('ches') || word.endsWith('sses') || word.endsWith('zes')) return true;
      return false;
    },
  },
  {
    id: 'ie-ei',
    test: word => word.includes('ie') || word.includes('ei'),
  },
  {
    id: 'ph-f',
    test: word => word.includes('ph'),
  },
  {
    id: 'ck-ending',
    test: word => word.endsWith('ck'),
  },
  {
    id: 'ee-ea',
    test: word => word.includes('ee') || word.includes('ea'),
  },
  {
    id: 'ai-ay',
    test: word => word.includes('ai') || word.endsWith('ay'),
  },
  {
    id: 'oa-ow',
    test: word => word.includes('oa') || (word.endsWith('ow') && LONG_O_OW_WORDS.has(word)),
  },
  {
    id: 'ou-ow',
    test: word => word.includes('ou') || (word.endsWith('ow') && OU_OW_WORDS.has(word)),
  },
  {
    id: 'soft-cg',
    test: word => /^(c[iey]|g[iey])|[aeiou](c[iey]|g[iey])/.test(word) && !/ck/.test(word),
  },
  {
    id: 'homophones',
    test: word => HOMOPHONE_WORDS.has(word),
  },
  {
    id: 'double-consonant',
    test: word => /([bcdfghjklmnpqrstvwxyz])\1/.test(word),
  },
  {
    id: 'silent-e',
    test: word => word.endsWith('e') && word.length > 3 && !word.endsWith('ee'),
  },
];

export function detectPattern(word: string): string | null {
  const lower = word.toLowerCase();

  for (const detector of PATTERN_DETECTORS) {
    if (detector.test(lower)) {
      return detector.id;
    }
  }

  return null;
}
