/**
 * Word Bank Expansion Pipeline
 *
 * Aggregates words from AVMSS, SVL, UWL academic word lists,
 * scores them for spelling difficulty, assigns levels 4-7,
 * and outputs a review JSON + draft SQL migration.
 *
 * Usage: bun scripts/word-pipeline/index.ts
 */

import type { CandidateWord } from "./types";
import { loadSubtlexMap } from "./sources/subtlex";
import { loadAVMSS } from "./sources/avmss";
import { loadSVL } from "./sources/svl";
import { loadUWL } from "./sources/uwl";
import { loadExistingWords } from "./existing-words";
import { assignLevel } from "./scoring/level-assignment";
import { writeReviewJSON, writeDraftSQL } from "./output";

/** Filter out words we don't want */
function isValidCandidate(word: string): boolean {
  // Multi-word phrases
  if (word.includes(" ") || word.includes("-")) return false;
  // Proper nouns (starts with capital) — we lowercased, so check original
  // Too short (< 3 chars)
  if (word.length < 3) return false;
  // Too long (> 20 chars)
  if (word.length > 20) return false;
  // Contains non-alpha chars
  if (!/^[a-z]+$/.test(word)) return false;

  return true;
}

/** Common British spelling patterns to filter */
const BRITISH_SUFFIXES = [
  /our$/, // colour → color
  /ise$/, // realise → realize
  /isation$/, // realisation → realization
  /yse$/, // analyse → analyze
  /ogue$/, // catalogue → catalog
  /ence$/, // Only flag if American -ense exists
];

/** Proper nouns that get lowercased in our sources */
const PROPER_NOUNS = new Set([
  "christian",
  "roman",
  "greek",
  "latin",
  "french",
  "german",
  "english",
  "jewish",
  "muslim",
  "hindu",
  "buddhist",
  "chinese",
  "japanese",
  "european",
  "african",
  "american",
  "british",
  "spanish",
  "italian",
  "portuguese",
  "russian",
  "arab",
  "persian",
  "turkish",
  "indian",
  "egyptian",
  "biblical",
  "colonial",
  "marxist",
  "newtonian",
  "darwinian",
  "keynesian",
  "cartesian",
  "freudian",
  "victorian",
  "elizabethan",
  "byzantine",
]);

/** Very common words that shouldn't be in levels 4-7 */
const TOO_COMMON = new Set([
  "the",
  "and",
  "that",
  "have",
  "for",
  "not",
  "with",
  "you",
  "this",
  "but",
  "from",
  "they",
  "she",
  "her",
  "him",
  "his",
  "how",
  "all",
  "can",
  "had",
  "one",
  "our",
  "out",
  "are",
  "was",
  "were",
  "been",
  "being",
  "get",
  "got",
  "has",
  "its",
  "may",
  "new",
  "now",
  "old",
  "see",
  "way",
  "who",
  "did",
  "use",
  "said",
  "each",
  "make",
  "like",
  "just",
  "over",
  "such",
  "take",
  "than",
  "them",
  "very",
  "when",
  "what",
  "your",
  "also",
  "back",
  "come",
  "could",
  "good",
  "into",
  "most",
  "only",
  "some",
  "time",
  "will",
  "about",
  "after",
  "many",
  "then",
  "more",
  "other",
  "year",
  "know",
]);

async function main() {
  console.log("🔤 Word Bank Expansion Pipeline\n");

  // Step 1: Load all sources in parallel
  console.log("Loading sources...");
  const [subtlex, avmss, svl, uwl, existing] = await Promise.all([
    loadSubtlexMap(),
    loadAVMSS(),
    loadSVL(),
    loadUWL(),
    loadExistingWords(),
  ]);

  console.log(`  SUBTLEX: ${subtlex.size} words (frequency data)`);
  console.log(`  AVMSS:   ${avmss.size} words`);
  console.log(`  SVL:     ${svl.size} words`);
  console.log(`  UWL:     ${uwl.size} words`);
  console.log(`  Existing word bank: ${existing.size} words\n`);

  // Step 2: Merge unique words from all academic sources
  const allWords = new Set<string>();
  const wordSources = new Map<string, string[]>();

  function addWord(word: string, source: string) {
    const w = word.toLowerCase();
    allWords.add(w);
    const sources = wordSources.get(w) ?? [];
    if (!sources.includes(source)) sources.push(source);
    wordSources.set(w, sources);
  }

  for (const word of avmss) addWord(word, "AVMSS");
  for (const word of svl) addWord(word, "SVL");
  for (const word of uwl) addWord(word, "UWL");

  console.log(`Merged: ${allWords.size} unique words from academic sources`);

  // Step 3: Filter
  let filtered = [...allWords].filter(isValidCandidate);
  console.log(`After validity filter: ${filtered.length}`);

  filtered = filtered.filter((w) => !existing.has(w));
  console.log(`After dedup with existing bank: ${filtered.length}`);

  filtered = filtered.filter((w) => !TOO_COMMON.has(w));
  console.log(`After removing common words: ${filtered.length}`);

  filtered = filtered.filter((w) => !PROPER_NOUNS.has(w));
  console.log(`After removing proper nouns: ${filtered.length}`);

  // Filter out likely British spellings (rough heuristic)
  filtered = filtered.filter((w) => {
    // Skip -ise if the -ize form exists in our candidate set
    if (w.endsWith("ise") && allWords.has(w.replace(/ise$/, "ize")))
      return false;
    if (
      w.endsWith("isation") &&
      allWords.has(w.replace(/isation$/, "ization"))
    )
      return false;
    if (w.endsWith("yse") && allWords.has(w.replace(/yse$/, "yze")))
      return false;
    // Skip -our if American -or form would be standard
    // Common pattern: behaviour→behavior, neighbourhood→neighborhood
    if (/our/.test(w) && !["four", "pour", "your", "our"].includes(w)) {
      const american = w.replace(/our/, "or");
      if (allWords.has(american)) return false;
    }
    // Skip -ogue patterns (catalogue→catalog)
    if (w.endsWith("ogue") && allWords.has(w.replace(/ogue$/, "og")))
      return false;
    // Skip words containing "ae" digraph (haemoglobin→hemoglobin)
    if (/ae/.test(w)) return false;
    return true;
  });
  console.log(`After British spelling filter: ${filtered.length}\n`);

  // Step 4: Score and assign levels
  console.log("Scoring and assigning levels...");
  const subtlexTotal = subtlex.size;
  const allScored: CandidateWord[] = filtered.map((word) => {
    const assignment = assignLevel(word, subtlex, subtlexTotal);
    return {
      word,
      difficultyScore: assignment.difficultyScore,
      frequencyScore: assignment.frequencyScoreValue,
      compositeScore: assignment.compositeScore,
      level: assignment.level,
      elo: assignment.elo,
      pattern: assignment.pattern,
      sources: wordSources.get(word) ?? [],
    };
  });

  // Step 5: Filter to spelling-interesting words
  // Require minimum difficulty > 0 and word length >= 4
  // Short common words with one pattern (tax, mix) aren't interesting enough
  const withDifficulty = allScored.filter(
    (c) => c.difficultyScore > 0 && c.word.length >= 4
  );
  console.log(
    `Words with spelling difficulty > 0: ${withDifficulty.length} (of ${allScored.length})`
  );

  // Step 6: Select best candidates per level
  // Target: ~75 for level 4, ~125 for level 5, ~150 for level 6, ~150 for level 7
  // Prioritize: multi-source words first, then by composite score
  const TARGET_PER_LEVEL: Record<number, number> = {
    4: 75,
    5: 125,
    6: 150,
    7: 150,
  };

  function sortCandidates(words: CandidateWord[]): CandidateWord[] {
    return words.sort((a, b) => {
      // More sources = higher priority
      if (b.sources.length !== a.sources.length)
        return b.sources.length - a.sources.length;
      // Then by composite score (higher = harder = better for upper levels)
      return b.compositeScore - a.compositeScore;
    });
  }

  const candidates: CandidateWord[] = [];
  for (const level of [4, 5, 6, 7]) {
    const levelWords = withDifficulty.filter((c) => c.level === level);
    const sorted = sortCandidates(levelWords);
    const selected = sorted.slice(0, TARGET_PER_LEVEL[level]);
    candidates.push(...selected);
  }

  // Step 7: Print distribution
  const byLevel = { 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const c of candidates) {
    byLevel[c.level as keyof typeof byLevel]++;
  }
  console.log("\nSelected candidates:");
  console.log(`  Level 4: ${byLevel[4]} words (ELO 1550)`);
  console.log(`  Level 5: ${byLevel[5]} words (ELO 1700)`);
  console.log(`  Level 6: ${byLevel[6]} words (ELO 1850)`);
  console.log(`  Level 7: ${byLevel[7]} words (ELO 2000)`);
  console.log(`  Total:   ${candidates.length} words\n`);

  // Step 8: Write outputs
  const jsonPath = await writeReviewJSON(candidates);
  console.log(`Review JSON: ${jsonPath}`);

  const sqlPath = await writeDraftSQL(candidates);
  console.log(`Draft SQL:   ${sqlPath}`);

  // Step 9: Spot check — show 5 sample words per level
  console.log("\n--- Sample words per level ---");
  for (const level of [4, 5, 6, 7]) {
    const sample = candidates
      .filter((c) => c.level === level)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    console.log(
      `\nLevel ${level}:`,
      sample
        .map(
          (s) =>
            `${s.word} (comp=${s.compositeScore}, diff=${s.difficultyScore}, freq=${s.frequencyScore}, src=${s.sources.join("+")})`
        )
        .join("\n  ")
    );
  }
}

main().catch(console.error);
