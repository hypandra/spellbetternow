/**
 * LLM generation of IPA transcriptions (for Wiktionary gaps) and
 * phonetic respellings for all words.
 * Uses Claude Haiku 4.5 via OpenRouter.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4-5';
const BATCH_SIZE = 25;
const CONCURRENCY = 5;

interface PronunciationInput {
  word: string;
  wiktionaryIPA: string | null;
}

interface PronunciationResult {
  word: string;
  ipa: string;
  phonetic: string;
}

function buildPrompt(words: PronunciationInput[]): string {
  const wordList = words
    .map((w) => {
      if (w.wiktionaryIPA) {
        return `- "${w.word}" (IPA from Wiktionary: ${w.wiktionaryIPA})`;
      }
      return `- "${w.word}" (no IPA available — generate it)`;
    })
    .join('\n');

  return `You are generating pronunciation data for a spelling practice app. For each word:

1. **ipa**: IPA transcription in General American English. Format: /transcription/ with slashes.
   - If Wiktionary IPA is provided, use it as-is (just clean up formatting if needed).
   - If no IPA is available, generate an accurate IPA transcription.

2. **phonetic**: A phonetic respelling using common English sounds, with stressed syllables in CAPS.
   - Use hyphens between syllables
   - Stressed syllable in ALL CAPS
   - Use intuitive English letter combinations (not IPA symbols)
   - Examples: "accommodate" → "uh-KOM-uh-dayt", "bureaucracy" → "byoo-ROK-ruh-see"

Words:
${wordList}

Respond with a JSON array. No markdown fences, just raw JSON:
[{"word": "example", "ipa": "/ɪɡˈzæmpəl/", "phonetic": "ig-ZAM-puhl"}]`;
}

async function callLLM(
  words: PronunciationInput[],
  apiKey: string
): Promise<PronunciationResult[]> {
  const prompt = buildPrompt(words);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://spellbetternow.com',
      'X-Title': 'SBN Pronunciation Pipeline',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Empty response from LLM');
  }

  const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(jsonStr) as PronunciationResult[];
  } catch (e) {
    console.error('Failed to parse LLM response:', content.slice(0, 200));
    throw new Error(`JSON parse failed: ${(e as Error).message}`);
  }
}

export async function generatePronunciation(
  words: PronunciationInput[],
  opts?: { dryRun?: boolean }
): Promise<Map<string, PronunciationResult>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in env');
  }

  if (opts?.dryRun) {
    console.log(
      `[dry-run] Would generate pronunciation for ${words.length} words`
    );
    return new Map();
  }

  const batches: PronunciationInput[][] = [];
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    batches.push(words.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Generating pronunciation: ${words.length} words in ${batches.length} batches (concurrency: ${CONCURRENCY})`
  );

  const results = new Map<string, PronunciationResult>();
  let completed = 0;
  let errors = 0;

  const queue = [...batches];
  const active: Promise<void>[] = [];

  async function processBatch(batch: PronunciationInput[], batchIdx: number) {
    try {
      const pronunciations = await callLLM(batch, apiKey);
      for (const p of pronunciations) {
        results.set(p.word.toLowerCase(), p);
      }
      completed++;
      const pct = Math.round((completed / batches.length) * 100);
      process.stdout.write(
        `\r  Progress: ${completed}/${batches.length} batches (${pct}%) — ${results.size} pronunciations`
      );
    } catch (e) {
      errors++;
      const sample = batch.slice(0, 3).map((w) => w.word).join(', ');
      console.error(
        `\n  Batch ${batchIdx} failed (${sample}...): ${(e as Error).message}`
      );
    }
  }

  for (let i = 0; i < queue.length; i++) {
    const p = processBatch(queue[i], i);
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
    `\n  Done: ${results.size} pronunciations generated, ${errors} batch errors`
  );

  return results;
}
