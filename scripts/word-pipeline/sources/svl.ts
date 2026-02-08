import type { SVLEntry } from "../types";

const DATA_PATH = new URL("../data/svl.json", import.meta.url).pathname;

type SVLData = Record<string, SVLEntry[]>;

/** Load all unique words from SVL (Science Vocabulary) */
export async function loadSVL(): Promise<Set<string>> {
  const raw: SVLData = await Bun.file(DATA_PATH).json();
  const words = new Set<string>();

  for (const entries of Object.values(raw)) {
    for (const entry of entries) {
      words.add(entry.lemma.toLowerCase());
    }
  }

  return words;
}
