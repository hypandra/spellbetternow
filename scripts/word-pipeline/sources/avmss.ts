import type { AVMSSEntry } from "../types";

const DATA_PATH = new URL("../data/avmss.json", import.meta.url).pathname;

type AVMSSData = Record<string, Record<string, AVMSSEntry>>;

/** Load all unique words from AVMSS (Academic Vocabulary) */
export async function loadAVMSS(): Promise<Set<string>> {
  const raw: AVMSSData = await Bun.file(DATA_PATH).json();
  const words = new Set<string>();

  for (const discipline of Object.values(raw)) {
    for (const [lemma, entry] of Object.entries(discipline)) {
      words.add(lemma.toLowerCase());
      for (const variant of entry.words) {
        words.add(variant.toLowerCase());
      }
    }
  }

  return words;
}
