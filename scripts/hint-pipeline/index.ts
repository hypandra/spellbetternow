/**
 * Hint pipeline orchestrator.
 * Generates text hints (part_of_speech, not_synonyms, letter_fragments, rhyme_hints)
 * for spelling_word_bank words to support no-audio spelling mode.
 *
 * Usage:
 *   bun scripts/hint-pipeline/index.ts [flags]
 *
 * Flags:
 *   --force          Fetch all words, not just those missing hints
 *   --dry-run        Skip LLM calls, show what would be generated
 *   --words w1,w2    Only process specific words
 *   --validate-only  Skip fetch/generate, validate existing data/hints-*.json
 */

import { fetchWords } from './fetch-words';
import { generateAllFragments } from './generate-fragments';
import { generateHints } from './generate-hints';
import { validate } from './validate';
import { writeReviewJSON, writeLeakyJSON, writeMigrationSQL } from './output';
import type { HintResult } from './types';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    validateOnly: args.includes('--validate-only'),
    words: args
      .find((a) => a.startsWith('--words=') || a.startsWith('--words '))
      ?.split('=')[1]
      ?.split(',')
      ?? (args.includes('--words')
        ? args[args.indexOf('--words') + 1]?.split(',')
        : undefined),
  };
}

async function main() {
  const opts = parseArgs();
  console.log('=== SBN Hint Pipeline ===\n');
  console.log('Options:', {
    force: opts.force,
    dryRun: opts.dryRun,
    validateOnly: opts.validateOnly,
    words: opts.words ?? 'all',
  });
  console.log('');

  // --- Validate-only mode ---
  if (opts.validateOnly) {
    const OUTPUT_DIR = new URL('./data/', import.meta.url).pathname;
    const glob = new Bun.Glob('hints-*.json');
    const files: string[] = [];
    for await (const file of glob.scan(OUTPUT_DIR)) {
      files.push(`${OUTPUT_DIR}${file}`);
    }
    if (files.length === 0) {
      console.error('No hints-*.json files found in data/');
      process.exit(1);
    }
    // Use most recent
    files.sort();
    const latest = files[files.length - 1];
    console.log(`Validating: ${latest}`);
    const data = JSON.parse(await Bun.file(latest).text());
    const result = validate(data.words as HintResult[]);
    if (result.leaky.length > 0) {
      console.log('\nLeaky words:');
      for (const l of result.leaky) {
        console.log(`  ${l.word}: ${l.failures.join('; ')}`);
      }
    }
    return;
  }

  // --- Step 1: Fetch words ---
  console.log('--- Step 1: Fetch words ---');
  const words = await fetchWords({ force: opts.force, words: opts.words });
  if (words.length === 0) {
    console.log('No words need hint enrichment. Use --force to regenerate all.');
    return;
  }

  // Level distribution
  const levels = new Map<number, number>();
  for (const w of words) {
    levels.set(w.level, (levels.get(w.level) ?? 0) + 1);
  }
  for (const [level, count] of [...levels.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  Level ${level}: ${count} words`);
  }
  console.log('');

  // --- Step 2: Generate letter fragments (deterministic) ---
  console.log('--- Step 2: Generate letter fragments ---');
  const fragmentMap = generateAllFragments(words);
  console.log('');

  // --- Step 3: Generate LLM hints ---
  console.log('--- Step 3: Generate LLM hints ---');
  const llmHints = await generateHints(words, { dryRun: opts.dryRun });

  if (opts.dryRun) {
    console.log('\n[dry-run] Skipping validation and output.');
    return;
  }
  console.log('');

  // --- Step 4: Merge results ---
  console.log('--- Step 4: Merge results ---');
  const merged: HintResult[] = [];
  let missing = 0;

  for (const w of words) {
    const llm = llmHints.get(w.word.toLowerCase());
    const fragments = fragmentMap.get(w.word) ?? [];

    if (!llm) {
      missing++;
      continue;
    }

    merged.push({
      id: w.id,
      word: w.word,
      level: w.level,
      part_of_speech: llm.part_of_speech,
      not_synonyms: llm.not_synonyms,
      letter_fragments: fragments,
      rhyme_hints: llm.rhyme_hints,
    });
  }

  console.log(`Merged: ${merged.length} complete, ${missing} missing LLM data`);
  console.log('');

  // --- Step 5: Validate ---
  console.log('--- Step 5: Validate ---');
  const result = validate(merged);

  if (result.leaky.length > 0) {
    console.log('\nLeaky words:');
    for (const l of result.leaky.slice(0, 20)) {
      console.log(`  ${l.word}: ${l.failures.join('; ')}`);
    }
    if (result.leaky.length > 20) {
      console.log(`  ... and ${result.leaky.length - 20} more`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    for (const w of result.warnings.slice(0, 10)) {
      console.log(`  ${w.word}: ${w.issues.join('; ')}`);
    }
    if (result.warnings.length > 10) {
      console.log(`  ... and ${result.warnings.length - 10} more`);
    }
  }
  console.log('');

  // --- Step 6: Output ---
  console.log('--- Step 6: Output ---');
  await writeReviewJSON(result);
  await writeLeakyJSON(result);
  await writeMigrationSQL(result.clean);

  console.log(`\n=== Done ===`);
  console.log(`Clean words: ${result.clean.length}`);
  console.log(`Leaky words: ${result.leaky.length}`);
  console.log(`Next steps:`);
  console.log(`  1. Review data/hints-*.json`);
  console.log(`  2. If leaky file exists, fix and re-run with --words`);
  console.log(`  3. Copy migration to supabase/migrations/ and apply`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
