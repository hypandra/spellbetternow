import type { CandidateWord } from "./types";

const DATA_DIR = new URL("./data/", import.meta.url).pathname;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Write the review JSON file with full scored data */
export async function writeReviewJSON(
  candidates: CandidateWord[]
): Promise<string> {
  const path = `${DATA_DIR}candidates-${today()}.json`;
  const summary = {
    generated: new Date().toISOString(),
    totalCandidates: candidates.length,
    byLevel: {
      4: candidates.filter((c) => c.level === 4).length,
      5: candidates.filter((c) => c.level === 5).length,
      6: candidates.filter((c) => c.level === 6).length,
      7: candidates.filter((c) => c.level === 7).length,
    },
    candidates: candidates.sort(
      (a, b) => a.level - b.level || a.compositeScore - b.compositeScore
    ),
  };

  await Bun.write(path, JSON.stringify(summary, null, 2));
  return path;
}

/** Write a draft SQL migration with NULLs for definition/example_sentence */
export async function writeDraftSQL(
  candidates: CandidateWord[]
): Promise<string> {
  const path = `${DATA_DIR}migration-draft-${today()}.sql`;

  const sorted = [...candidates].sort(
    (a, b) => a.level - b.level || a.word.localeCompare(b.word)
  );

  const lines: string[] = [
    `-- Draft word bank expansion - ${today()}`,
    `-- ${candidates.length} new words (levels 4-7)`,
    `-- definition and example_sentence left NULL for LLM pass`,
    ``,
    `INSERT INTO spelling_word_bank (word, level, current_elo, pattern) VALUES`,
  ];

  const values = sorted.map((c) => {
    const escapedWord = c.word.replace(/'/g, "''");
    const escapedPattern = c.pattern.replace(/'/g, "''");
    return `  ('${escapedWord}', ${c.level}, ${c.elo}, '${escapedPattern}')`;
  });

  lines.push(values.join(",\n"));
  lines.push("ON CONFLICT (word) DO NOTHING;");
  lines.push("");

  await Bun.write(path, lines.join("\n"));
  return path;
}
