/**
 * LLM batch generation of part_of_speech, not_synonyms, and rhyme_hints.
 * Uses Claude Haiku 4.5 via OpenRouter.
 */

import type { WordRecord } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4-5';
const BATCH_SIZE = 20;
const CONCURRENCY = 5;

interface LLMHintResult {
  word: string;
  part_of_speech: string;
  not_synonyms: string[];
  rhyme_hints: string[];
}

function buildPrompt(words: WordRecord[]): string {
  const wordList = words
    .map((w) => {
      const def = w.definition || '';
      return `- "${w.word}" (level ${w.level}): ${def}`;
    })
    .join('\n');

  return `You are generating spelling hints for a spelling practice app. For each word below, provide:

1. **part_of_speech**: One of: noun, verb, adjective, adverb, preposition, conjunction, pronoun, interjection
2. **not_synonyms**: 2-3 semantically related words that are NOT the target word. These help disambiguate meaning. Rules:
   - Must be real, common English words
   - Must be semantically related (same domain/concept) but different words
   - NO morphological variants of the target (no adding -ing, -ed, -ly, -tion, etc.)
   - NO words that share the same root/stem
3. **rhyme_hints**: 0-2 words that rhyme with the target but spell the rhyming sound differently. Rules:
   - Must actually rhyme (same ending sound)
   - Should spell the sound differently when possible (e.g., "great" rhymes with "late" — different spelling of the "-ate" sound)
   - Use an empty array [] if no good rhymes exist
   - NO words that share the last 3+ letters with the target word

**CRITICAL**: The target word must NEVER appear in any of your hints. Never use the word itself as a synonym or rhyme.

Words:
${wordList}

Respond with a JSON array. No markdown fences, just the raw JSON:
[{"word": "example", "part_of_speech": "noun", "not_synonyms": ["instance", "sample"], "rhyme_hints": ["trample"]}]`;
}

async function callLLM(
  words: WordRecord[],
  apiKey: string
): Promise<LLMHintResult[]> {
  const prompt = buildPrompt(words);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://spellbetternow.com',
      'X-Title': 'SBN Hint Pipeline',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
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

  // Strip markdown fences if present
  const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(jsonStr) as LLMHintResult[];
  } catch (e) {
    console.error('Failed to parse LLM response:', content.slice(0, 200));
    throw new Error(`JSON parse failed: ${(e as Error).message}`);
  }
}

/**
 * Process words in batches with concurrency control.
 */
export async function generateHints(
  words: WordRecord[],
  opts?: { dryRun?: boolean }
): Promise<Map<string, LLMHintResult>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in env');
  }

  if (opts?.dryRun) {
    console.log(`[dry-run] Would generate hints for ${words.length} words in ${Math.ceil(words.length / BATCH_SIZE)} batches`);
    return new Map();
  }

  // Split into batches
  const batches: WordRecord[][] = [];
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    batches.push(words.slice(i, i + BATCH_SIZE));
  }

  console.log(`Generating LLM hints: ${words.length} words in ${batches.length} batches (concurrency: ${CONCURRENCY})`);

  const results = new Map<string, LLMHintResult>();
  let completed = 0;
  let errors = 0;

  // Process batches with concurrency limit
  const queue = [...batches];
  const active: Promise<void>[] = [];

  async function processBatch(batch: WordRecord[], batchIdx: number) {
    try {
      const hints = await callLLM(batch, apiKey);

      for (const hint of hints) {
        results.set(hint.word.toLowerCase(), hint);
      }

      completed++;
      const pct = Math.round((completed / batches.length) * 100);
      process.stdout.write(`\r  Progress: ${completed}/${batches.length} batches (${pct}%) — ${results.size} hints`);
    } catch (e) {
      errors++;
      const wordSample = batch.slice(0, 3).map((w) => w.word).join(', ');
      console.error(`\n  Batch ${batchIdx} failed (${wordSample}...): ${(e as Error).message}`);
    }
  }

  for (let i = 0; i < queue.length; i++) {
    const p = processBatch(queue[i], i);
    active.push(p);

    if (active.length >= CONCURRENCY) {
      await Promise.race(active);
      // Remove settled promises
      for (let j = active.length - 1; j >= 0; j--) {
        const settled = await Promise.race([
          active[j].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) active.splice(j, 1);
      }
    }
  }

  // Wait for remaining
  await Promise.all(active);

  console.log(`\n  Done: ${results.size} hints generated, ${errors} batch errors`);
  return results;
}
