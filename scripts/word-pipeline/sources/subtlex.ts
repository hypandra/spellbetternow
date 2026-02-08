import type { SubtlexEntry, SubtlexMap } from "../types";

const DATA_PATH = new URL("../data/subtlex-us.json", import.meta.url).pathname;

/** Build a map of word → rank (1-based, lower = more frequent) */
export async function loadSubtlexMap(): Promise<SubtlexMap> {
  const raw: SubtlexEntry[] = await Bun.file(DATA_PATH).json();

  // Already sorted by count descending — assign ranks
  const map: SubtlexMap = new Map();
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i].word.toLowerCase();
    if (!map.has(w)) {
      map.set(w, i + 1);
    }
  }
  return map;
}

/**
 * Convert SUBTLEX rank to a 0-100 frequency score using log scale.
 * Word frequency follows Zipf's law, so linear normalization compresses
 * most words into a narrow band. Log scale spreads them better.
 *
 * Lower rank (more common) → lower score.
 * Not found → 95 (treat as very rare).
 */
export function frequencyScore(
  word: string,
  subtlex: SubtlexMap,
  totalWords: number
): number {
  const rank = subtlex.get(word.toLowerCase());
  if (rank === undefined) return 95;
  // Log-scale: rank 1 → 0, rank 74286 → 100
  const logRank = Math.log(rank);
  const logTotal = Math.log(totalWords);
  return Math.min(100, Math.round((logRank / logTotal) * 100));
}
