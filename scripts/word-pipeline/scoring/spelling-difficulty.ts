/**
 * Spelling difficulty heuristic: scores words 0-100 based on
 * patterns that make English words hard to spell.
 */

interface DifficultyResult {
  score: number;
  topCategory: string;
}

interface CategoryScore {
  name: string;
  points: number;
}

/** Silent letter patterns */
const SILENT_PATTERNS: [RegExp, number][] = [
  [/^kn/, 3], // know, knight
  [/^gn/, 3], // gnaw, gnat
  [/^wr/, 3], // write, wrong
  [/^ps/, 3], // psalm, psychology
  [/mb$/, 3], // climb, thumb
  [/mn$/, 3], // autumn, column
  [/ght/, 4], // thought, night
  [/^pn/, 3], // pneumonia
];

/** Double consonant patterns */
const DOUBLE_CONSONANTS = /([bcdfgklmnprstv])\1/g;

/** Unstressed vowel ambiguity patterns */
const VOWEL_AMBIGUITY: [RegExp, number][] = [
  [/[ae]nt$/, 3], // -ent/-ant
  [/[ae]nce$/, 3], // -ence/-ance
  [/[ai]ble$/, 3], // -ible/-able
  [/[ae]ry$/, 2], // -ery/-ary
  [/[ae]l$/, 2], // -el/-al
  [/[oe]us$/, 2], // -ous/-eous
];

/** Unusual digraph patterns */
const DIGRAPH_PATTERNS: [RegExp, number][] = [
  [/ph/, 4], // phone → /f/
  [/gh[^t]/, 3], // ghost (not -ght, handled in silent)
  [/ch(?=[aeiou]r)/, 3], // chronic, character → /k/
  [/sch/, 3], // schedule, schism
  [/rh/, 2], // rhythm, rhetoric
];

/** Loan word patterns */
const LOAN_PATTERNS: [RegExp, number][] = [
  [/ette$/, 2], // silhouette
  [/eur$/, 2], // entrepreneur
  [/esque$/, 3], // picturesque
  [/ology$/, 2], // psychology
  [/oire$/, 3], // repertoire
  [/eau/, 3], // bureau, chateau
  [/aise$|aise/, 2], // mayonnaise
  [/ous$/, 1], // various (common but tricky)
];

/** ie/ei patterns */
const IE_EI_PATTERNS: [RegExp, number][] = [
  [/ei/, 4], // receive, weird
  [/ie/, 3], // believe, field
];

/** Uncommon letter sequences */
const UNCOMMON_SEQUENCES: [RegExp, number][] = [
  [/qu/, 2], // queen, unique
  [/[aeiou]{3,}/, 3], // 3+ consecutive vowels
  [/x/, 2], // exam, auxiliary
  [/z/, 2], // realize, pizza
];

function countSilentLetters(word: string): number {
  let score = 0;
  for (const [pattern, pts] of SILENT_PATTERNS) {
    if (pattern.test(word)) score += pts;
  }
  return Math.min(15, score);
}

function countDoubleConsonants(word: string): number {
  const matches = word.match(DOUBLE_CONSONANTS);
  if (!matches) return 0;
  // 4 pts per double, max 12
  return Math.min(12, matches.length * 4);
}

function countVowelAmbiguity(word: string): number {
  let score = 0;
  for (const [pattern, pts] of VOWEL_AMBIGUITY) {
    if (pattern.test(word)) score += pts;
  }
  return Math.min(15, score);
}

function countDigraphs(word: string): number {
  let score = 0;
  for (const [pattern, pts] of DIGRAPH_PATTERNS) {
    if (pattern.test(word)) score += pts;
  }
  return Math.min(12, score);
}

function countLoanPatterns(word: string): number {
  let score = 0;
  for (const [pattern, pts] of LOAN_PATTERNS) {
    if (pattern.test(word)) score += pts;
  }
  return Math.min(10, score);
}

function countIeEi(word: string): number {
  let score = 0;
  for (const [pattern, pts] of IE_EI_PATTERNS) {
    if (pattern.test(word)) score += pts;
  }
  return Math.min(8, score);
}

function countUncommonSequences(word: string): number {
  let score = 0;
  for (const [pattern, pts] of UNCOMMON_SEQUENCES) {
    if (pattern.test(word)) score += pts;
  }
  return Math.min(8, score);
}

function lengthScore(word: string): number {
  let score = 0;
  if (word.length > 8) score += Math.min(6, (word.length - 8) * 2);

  // Rough syllable count: count vowel groups
  const syllables = word.match(/[aeiouy]+/gi)?.length ?? 1;
  if (syllables > 3) score += Math.min(6, (syllables - 3) * 2);

  return Math.min(12, score);
}

export function spellingDifficulty(word: string): DifficultyResult {
  const w = word.toLowerCase();

  const categories: CategoryScore[] = [
    { name: "silent_letters", points: countSilentLetters(w) },
    { name: "double_consonants", points: countDoubleConsonants(w) },
    { name: "vowel_ambiguity", points: countVowelAmbiguity(w) },
    { name: "unusual_digraphs", points: countDigraphs(w) },
    { name: "loan_words", points: countLoanPatterns(w) },
    { name: "ie_ei", points: countIeEi(w) },
    { name: "uncommon_sequences", points: countUncommonSequences(w) },
    { name: "length", points: lengthScore(w) },
  ];

  const rawScore = categories.reduce((sum, c) => sum + c.points, 0);
  // For top category, prefer specific patterns over "length" which is generic
  const specificCategories = categories.filter((c) => c.name !== "length");
  const topSpecific = specificCategories.reduce((best, c) =>
    c.points > best.points ? c : best
  );
  const topCategory =
    topSpecific.points > 0
      ? topSpecific
      : categories.reduce((best, c) =>
          c.points > best.points ? c : best
        );

  // Raw scores max out around 20-25 in practice. Scale to 0-100 range
  // using a curve that spreads common scores (0-15) across 0-80
  // and reserves 80-100 for truly difficult words.
  const scaled = Math.min(100, Math.round((rawScore / 20) * 100));

  return {
    score: scaled,
    topCategory: topCategory.points > 0 ? topCategory.name : "general",
  };
}
