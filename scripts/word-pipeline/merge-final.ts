/**
 * Merge clean rows + fixup rows into final migration SQL.
 * Also fixes broken 3-letter word example sentences.
 *
 * Usage: bun scripts/word-pipeline/merge-final.ts
 */

const OUTPUT_DIR = new URL("./data/", import.meta.url).pathname;
const AGENT_OUTPUT_DIR =
  "/private/tmp/claude-501/-Users-dsg-projects-cb-builds-spellbetternow/tasks/";

// Fixup agent IDs
const FIXUP_AGENTS = ["af0e9f7", "ac46e81", "afd2dd7"];

// Fixed 3-letter word examples (the originals had blank-space issues)
const THREE_LETTER_FIXES: Record<string, string> = {
  add: "When you put five and three together, you get eight.",
  awe: "The canyon filled us with wonder and deep respect.",
  ebb: "The ocean water slowly pulled back from the sandy shore.",
  emu: "The tall flightless bird ran quickly across the desert.",
  err: "Even careful people sometimes make a mistake now and then.",
  foe: "The knight prepared to face his greatest enemy in battle.",
  hue: "The sunset sky turned a deep orange and purple shade.",
  ill: "He felt very sick and stayed home from school all week.",
  inn: "The travelers rested at a cozy small hotel by the river.",
  ire: "His constant lateness filled the teacher with deep anger.",
  odd: "That strange sound in the attic seemed very peculiar indeed.",
  oar: "She used the long wooden paddle to push the boat forward.",
  owe: "After buying lunch, she still had a debt to pay back.",
  pew: "They sat together on the long wooden bench during the service.",
  roe: "The sushi chef carefully prepared the tiny orange fish eggs.",
  rue: "He came to deeply regret his decision to quit the team.",
  rut: "The old wagon left a deep groove in the muddy road.",
  urn: "The antique ceramic vase held flowers on the mantelpiece.",
  vie: "The two runners competed fiercely for first place in the race.",
  jig: "The dancers performed a lively traditional folk dance on stage.",
  coy: "Her shy and playful smile caught everyone's attention immediately.",
  cue: "The director gave the signal for the actor to begin speaking.",
  doe: "The gentle female deer stood quietly at the forest edge.",
  dye: "She used blue coloring to change the fabric's appearance completely.",
  rye: "The farmer harvested a field of grain used for dark bread.",
  vim: "The team played with great energy and fierce determination today.",
};

interface WordRow {
  word: string;
  level: number;
  definition: string;
  example: string;
  elo: number;
}

interface LeakyWordRowJson {
  word: string;
  level: number;
  definition: string;
  example: string;
  elo: number;
}

/** Parse fixup agent output (WORD|sentence format) */
async function parseFixups(): Promise<Map<string, string>> {
  const fixes = new Map<string, string>();

  for (const agentId of FIXUP_AGENTS) {
    const raw = await Bun.file(`${AGENT_OUTPUT_DIR}${agentId}.output`).text();
    for (const jsonLine of raw.split("\n")) {
      if (!jsonLine.trim()) continue;
      try {
        const parsed = JSON.parse(jsonLine);
        const content = parsed?.message?.content;
        if (!content) continue;

        let text = "";
        if (typeof content === "string") text = content;
        else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") text += block.text + "\n";
          }
        }

        // Parse WORD|sentence lines
        for (const line of text.split("\n")) {
          const m = line.match(/^(\w+)\|(.+)$/);
          if (m) {
            fixes.set(m[1].toLowerCase(), m[2].trim());
          }
        }
      } catch {}
    }
  }

  return fixes;
}

/** Read clean migration and parse rows */
async function parseCleanMigration(): Promise<WordRow[]> {
  const sql = await Bun.file(
    `${OUTPUT_DIR}migration-clean-2026-02-08.sql`
  ).text();
  const rows: WordRow[] = [];

  const pattern =
    /\('([^']+)',\s*(\d+),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+)\)/g;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    rows.push({
      word: match[1],
      level: parseInt(match[2]),
      definition: match[3].replace(/''/g, "'"),
      example: match[4].replace(/''/g, "'"),
      elo: parseInt(match[5]),
    });
  }
  return rows;
}

/** Read leaky rows */
async function parseLeakyRows(): Promise<WordRow[]> {
  const data = (await Bun.file(
    `${OUTPUT_DIR}leaky-rows-2026-02-08.json`
  ).json()) as LeakyWordRowJson[];
  return data.map((r) => ({
    word: r.word,
    level: r.level,
    definition: r.definition,
    example: r.example,
    elo: r.elo,
  }));
}

async function main() {
  console.log("Merging final migration...\n");

  const [cleanRows, leakyRows, fixups] = await Promise.all([
    parseCleanMigration(),
    parseLeakyRows(),
    parseFixups(),
  ]);

  console.log(`Clean rows: ${cleanRows.length}`);
  console.log(`Leaky rows: ${leakyRows.length}`);
  console.log(`Fixup sentences: ${fixups.size}`);

  // Apply 3-letter fixes to clean rows
  let threeLetterFixed = 0;
  for (const row of cleanRows) {
    if (THREE_LETTER_FIXES[row.word]) {
      row.example = THREE_LETTER_FIXES[row.word];
      threeLetterFixed++;
    }
  }
  console.log(`3-letter fixes applied: ${threeLetterFixed}`);

  // Apply fixup sentences to leaky rows
  let fixupsApplied = 0;
  let fixupsMissing = 0;
  for (const row of leakyRows) {
    const fixed = fixups.get(row.word.toLowerCase());
    if (fixed) {
      row.example = fixed;
      fixupsApplied++;
    } else {
      fixupsMissing++;
      console.log(`  MISSING fixup for: ${row.word}`);
    }
  }
  console.log(`Fixups applied: ${fixupsApplied}, missing: ${fixupsMissing}`);

  // Merge all rows
  const allRows = [...cleanRows, ...leakyRows].sort(
    (a, b) => a.level - b.level || a.word.localeCompare(b.word)
  );

  // Validate: check for remaining leaks
  let remainingLeaks = 0;
  for (const row of allRows) {
    const wordRegex = new RegExp(`\\b${row.word.toLowerCase()}\\b`, "i");
    if (wordRegex.test(row.example)) {
      remainingLeaks++;
      if (remainingLeaks <= 5) {
        console.log(
          `  STILL LEAKY: ${row.word} → "${row.example.slice(0, 60)}..."`
        );
      }
    }
  }
  console.log(`\nRemaining leaks after fixup: ${remainingLeaks}`);

  // Level distribution
  console.log("\n--- Final distribution ---");
  for (const level of [3, 4, 5, 6, 7]) {
    const count = allRows.filter((r) => r.level === level).length;
    if (count > 0) console.log(`  Level ${level}: ${count} words`);
  }
  console.log(`  Total: ${allRows.length} words`);

  // Write final migration
  const lines: string[] = [
    `-- Word bank expansion - ${new Date().toISOString().slice(0, 10)}`,
    `-- ${allRows.length} new words with definitions (levels 3-7)`,
    `-- Generated by word-pipeline + LLM definitions`,
    ``,
    `INSERT INTO spelling_word_bank (word, level, definition, example_sentence, current_elo) VALUES`,
  ];

  const values = allRows.map((r) => {
    const def = r.definition.replace(/'/g, "''");
    const ex = r.example.replace(/'/g, "''");
    return `  ('${r.word}', ${r.level}, '${def}', '${ex}', ${r.elo})`;
  });

  lines.push(values.join(",\n"));
  lines.push("ON CONFLICT (word) DO NOTHING;");
  lines.push("");

  const outPath = `${OUTPUT_DIR}migration-final-${new Date().toISOString().slice(0, 10)}.sql`;
  await Bun.write(outPath, lines.join("\n"));
  console.log(`\nFinal migration: ${outPath}`);
}

main().catch(console.error);
