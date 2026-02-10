/**
 * Fetch IPA transcriptions from Wiktionary for English words.
 * Prefers General American (GA) pronunciation when available.
 * Returns a map of word -> IPA string.
 */

import type { WordRecord } from './types';

const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';
const USER_AGENT = 'SBN-HintPipeline/1.0 (spellbetternow.com)';
const CONCURRENCY = 5;
const DELAY_MS = 100; // Be nice to Wiktionary

interface WikiResult {
  word: string;
  ipa: string | null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOneIPA(word: string): Promise<WikiResult> {
  const url = `${WIKTIONARY_API}?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      return { word, ipa: null };
    }

    const data = await res.json();
    const wikitext: string = data.parse?.wikitext?.['*'] || '';

    // Match {{IPA|en|/transcription/|...}}
    const ipaMatches = [...wikitext.matchAll(/\{\{IPA\|en\|([^}]+)\}\}/g)];
    if (ipaMatches.length === 0) {
      return { word, ipa: null };
    }

    // Prefer General American (GA) over Received Pronunciation (RP)
    const gaMatch = ipaMatches.find((m) => m[1].includes('a=GA'));
    const pick = gaMatch || ipaMatches[0];

    // Extract the first IPA transcription (before any |a=XX or second transcription)
    const raw = pick[1];
    const parts = raw.split('|');
    // Find the first part that looks like an IPA transcription
    const ipa = parts.find((p) => p.startsWith('/') || p.startsWith('['));

    return { word, ipa: ipa || null };
  } catch {
    return { word, ipa: null };
  }
}

export async function fetchIPAFromWiktionary(
  words: WordRecord[]
): Promise<Map<string, string>> {
  console.log(`Fetching IPA from Wiktionary for ${words.length} words (concurrency: ${CONCURRENCY})...`);

  const results = new Map<string, string>();
  let completed = 0;
  let found = 0;

  // Process with concurrency limit
  const queue = [...words];
  const active: Promise<void>[] = [];

  async function processWord(w: WordRecord) {
    const result = await fetchOneIPA(w.word);
    if (result.ipa) {
      results.set(w.word, result.ipa);
      found++;
    }
    completed++;
    if (completed % 50 === 0 || completed === words.length) {
      process.stdout.write(
        `\r  Wiktionary: ${completed}/${words.length} checked, ${found} IPA found`
      );
    }
    await sleep(DELAY_MS);
  }

  for (let i = 0; i < queue.length; i++) {
    const p = processWord(queue[i]);
    active.push(p);

    if (active.length >= CONCURRENCY) {
      await Promise.race(active);
      for (let j = active.length - 1; j >= 0; j--) {
        const settled = await Promise.race([
          active[j].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) active.splice(j, 1);
      }
    }
  }

  await Promise.all(active);
  console.log(
    `\n  Done: ${found}/${words.length} IPA found on Wiktionary (${words.length - found} missing)`
  );

  return results;
}
