/**
 * Assemble definitions from agent transcripts into a final migration SQL.
 * Reads JSONL agent output files, extracts SQL VALUES, validates for
 * definition leaks (word appearing in definition/example), and outputs
 * a clean migration + a list of entries needing fixup.
 *
 * Usage: bun scripts/word-pipeline/assemble.ts
 */

const AGENT_OUTPUT_DIR =
  "/private/tmp/claude-501/-Users-dsg-projects-cb-builds-spellbetternow/tasks/";
const OUTPUT_DIR = new URL("./data/", import.meta.url).pathname;

interface WordRow {
  word: string;
  level: number;
  definition: string;
  example: string;
  elo: number;
  hasLeak: boolean;
  leakDetails?: string;
}

type TranscriptToolInput = {
  content?: string;
  command?: string;
};

type TranscriptContentBlock = {
  type: string;
  text?: string;
  input?: TranscriptToolInput;
};

type TranscriptJsonLine = {
  message?: {
    content?: string | TranscriptContentBlock[];
  };
};

/** Extract SQL VALUES lines from agent JSONL transcript */
async function extractFromTranscript(filePath: string): Promise<string[]> {
  const raw = await Bun.file(filePath).text();
  const results: string[] = [];

  // Parse each JSONL line to get text content
  for (const jsonLine of raw.split("\n")) {
    if (!jsonLine.trim()) continue;
    let parsed: TranscriptJsonLine;
    try {
      parsed = JSON.parse(jsonLine) as TranscriptJsonLine;
    } catch {
      continue;
    }

    // Extract text from message content (assistant messages with text or tool_use)
    const content = parsed?.message?.content;
    if (!content) continue;

    let textBlob = "";
    if (typeof content === "string") {
      textBlob = content;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text") textBlob += block.text + "\n";
        // Also check tool_use inputs (Write tool content, Bash command)
        if (block.type === "tool_use" && block.input) {
          if (block.input.content) textBlob += block.input.content + "\n";
          if (block.input.command) textBlob += block.input.command + "\n";
        }
      }
    }

    if (!textBlob) continue;

    // Match SQL VALUES lines
    const sqlPattern =
      /\('([^']+)',\s*(\d+),\s*'([^']*(?:''[^']*)*)',\s*'([^']*(?:''[^']*)*)',\s*(\d+)\),?/g;
    let match;
    while ((match = sqlPattern.exec(textBlob)) !== null) {
      results.push(match[0]);
    }
  }

  return results;
}

/** Parse a SQL VALUES line into a WordRow */
function parseRow(line: string): WordRow | null {
  const m = line.match(
    /\('([^']+)',\s*(\d+),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+)\)/
  );
  if (!m) return null;

  const word = m[1];
  const level = parseInt(m[2]);
  const definition = m[3].replace(/''/g, "'");
  const example = m[4].replace(/''/g, "'");
  const elo = parseInt(m[5]);

  // Check for definition leaks — only exact word matches
  // Stem matching causes too many false positives (e.g., "chemical" in definition of "chemically")
  const leaks: string[] = [];
  const wordLower = word.toLowerCase();

  // Use word boundary regex to match the exact word
  const wordRegex = new RegExp(`\\b${wordLower}\\b`, "i");
  if (wordRegex.test(definition)) {
    leaks.push(`def contains "${word}"`);
  }
  if (wordRegex.test(example)) {
    leaks.push(`example contains "${word}"`);
  }

  return {
    word,
    level,
    definition,
    example,
    elo,
    hasLeak: leaks.length > 0,
    leakDetails: leaks.length > 0 ? leaks.join("; ") : undefined,
  };
}

async function main() {
  console.log("Assembling definitions from agent transcripts...\n");

  // Known agent IDs from this pipeline run
  const AGENT_IDS = [
    "a1d1e70", // L4
    "a7c627e", // L5a
    "a8efbf4", // L5b
    "a1b28d3", // L6a
    "a010c31", // L6b
    "a9f3963", // L7a
    "af4605f", // L7b
    "a97491d", // 3-letter
  ];
  const files = AGENT_IDS.map((id) => `${AGENT_OUTPUT_DIR}${id}.output`);
  console.log(`Processing ${files.length} agent output files`);

  // Extract SQL from all transcripts
  const allLines: string[] = [];
  for (const file of files) {
    const lines = await extractFromTranscript(file);
    if (lines.length > 0) {
      console.log(
        `  ${file.split("/").pop()}: ${lines.length} SQL rows found`
      );
      allLines.push(...lines);
    }
  }
  console.log(`\nTotal SQL rows extracted: ${allLines.length}`);

  // Parse and deduplicate
  const rowMap = new Map<string, WordRow>();
  let parseErrors = 0;
  for (const line of allLines) {
    const row = parseRow(line);
    if (row) {
      // Keep first occurrence (don't overwrite)
      if (!rowMap.has(row.word)) {
        rowMap.set(row.word, row);
      }
    } else {
      parseErrors++;
    }
  }
  console.log(
    `Parsed: ${rowMap.size} unique words (${parseErrors} parse errors)\n`
  );

  const rows = [...rowMap.values()].sort(
    (a, b) => a.level - b.level || a.word.localeCompare(b.word)
  );

  // Report leaks
  const clean = rows.filter((r) => !r.hasLeak);
  const leaky = rows.filter((r) => r.hasLeak);
  console.log(`Clean rows: ${clean.length}`);
  console.log(`Rows with definition leaks: ${leaky.length}\n`);

  if (leaky.length > 0) {
    console.log("--- Definition leaks ---");
    for (const r of leaky.slice(0, 20)) {
      console.log(`  ${r.word} (L${r.level}): ${r.leakDetails}`);
    }
    if (leaky.length > 20) {
      console.log(`  ... and ${leaky.length - 20} more`);
    }
  }

  // Level distribution
  console.log("\n--- Level distribution ---");
  for (const level of [3, 4, 5, 6, 7]) {
    const levelRows = rows.filter((r) => r.level === level);
    const levelClean = levelRows.filter((r) => !r.hasLeak);
    if (levelRows.length > 0) {
      console.log(
        `  Level ${level}: ${levelRows.length} total, ${levelClean.length} clean, ${levelRows.length - levelClean.length} leaky`
      );
    }
  }

  // Write clean migration
  const migrationLines: string[] = [
    `-- Word bank expansion - ${new Date().toISOString().slice(0, 10)}`,
    `-- ${clean.length} new words with definitions (levels 3-7)`,
    `-- Generated by word-pipeline, definitions by LLM`,
    ``,
    `INSERT INTO spelling_word_bank (word, level, definition, example_sentence, current_elo) VALUES`,
  ];

  const values = clean.map((r) => {
    const def = r.definition.replace(/'/g, "''");
    const ex = r.example.replace(/'/g, "''");
    return `  ('${r.word}', ${r.level}, '${def}', '${ex}', ${r.elo})`;
  });

  migrationLines.push(values.join(",\n"));
  migrationLines.push("ON CONFLICT (word) DO NOTHING;");
  migrationLines.push("");

  const cleanPath = `${OUTPUT_DIR}migration-clean-${new Date().toISOString().slice(0, 10)}.sql`;
  await Bun.write(cleanPath, migrationLines.join("\n"));
  console.log(`\nClean migration: ${cleanPath}`);

  // Write leaky rows to a separate file for fixup
  if (leaky.length > 0) {
    const leakyData = leaky.map((r) => ({
      word: r.word,
      level: r.level,
      definition: r.definition,
      example: r.example,
      elo: r.elo,
      leakDetails: r.leakDetails,
    }));
    const leakyPath = `${OUTPUT_DIR}leaky-rows-${new Date().toISOString().slice(0, 10)}.json`;
    await Bun.write(leakyPath, JSON.stringify(leakyData, null, 2));
    console.log(`Leaky rows for fixup: ${leakyPath}`);
  }
}

main().catch(console.error);
