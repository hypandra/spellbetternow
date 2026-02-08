const DATA_PATH = new URL("../data/uwl.json", import.meta.url).pathname;

type UWLData = Record<string, string[]>;

/** Load all unique words from UWL (University Word List) */
export async function loadUWL(): Promise<Set<string>> {
  const raw: UWLData = await Bun.file(DATA_PATH).json();
  const words = new Set<string>();

  for (const wordList of Object.values(raw)) {
    for (const word of wordList) {
      words.add(word.toLowerCase());
    }
  }

  return words;
}
