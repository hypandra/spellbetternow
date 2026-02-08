import { Glob } from "bun";

const MIGRATIONS_DIR = new URL(
  "../../supabase/migrations/",
  import.meta.url
).pathname;

/**
 * Parse all migration files to extract existing words from spelling_word_bank INSERTs.
 * Returns a Set of lowercase words already in the bank.
 */
export async function loadExistingWords(): Promise<Set<string>> {
  const words = new Set<string>();
  const glob = new Glob("*.sql");

  for await (const file of glob.scan(MIGRATIONS_DIR)) {
    const content = await Bun.file(`${MIGRATIONS_DIR}${file}`).text();

    // Only process files that INSERT into spelling_word_bank
    if (!content.includes("spelling_word_bank")) continue;

    // Match word values in INSERT statements: ('word', ...)
    // The word is always the first value after VALUES or a continuation row
    const insertRegex = /\(\s*'([^']+)'\s*,/g;
    let match;
    while ((match = insertRegex.exec(content)) !== null) {
      words.add(match[1].toLowerCase());
    }
  }

  return words;
}
