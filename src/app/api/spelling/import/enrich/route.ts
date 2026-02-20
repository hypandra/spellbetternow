import { NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { isValidWordLength, normalizeWord } from '@/lib/spelling/custom-lists';

type EnrichedWord = {
  word: string;
  definition: string;
  example_sentence: string;
  part_of_speech: string;
  level: number;
  estimated_elo: number;
  source: 'word_bank' | 'llm';
};

const EnrichSchema = z.object({
  words: z.array(z.string()).min(1).max(20),
});

const MODEL = 'gpt-4o-mini';
const ENRICHMENT_FAILED_ERROR = 'Word enrichment failed — please try again';

function toBoundedInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function toSafeText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function normalizeInputWords(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawWord of words) {
    const normalized = normalizeWord(rawWord);
    if (!normalized) continue;
    if (!isValidWordLength(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function buildWordBankEntry(row: {
  word: string;
  definition: string | null;
  example_sentence: string | null;
  part_of_speech: string | null;
  level: number | null;
  current_elo: number | null;
}): EnrichedWord {
  return {
    word: row.word,
    definition: row.definition ?? '',
    example_sentence: row.example_sentence ?? '',
    part_of_speech: row.part_of_speech ?? '',
    level: toBoundedInteger(row.level, 1, 7, 3),
    estimated_elo: toBoundedInteger(row.current_elo, 800, 2200, 1500),
    source: 'word_bank',
  };
}

async function enrichWithLlm(words: string[]): Promise<EnrichedWord[]> {
  if (words.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are enriching spelling words for spelling learners. Return only JSON with shape { "enriched": [ ... ] }. For each input word include word, definition (one age-appropriate sentence), example_sentence, part_of_speech, level (1-7), estimated_elo (800-2200).',
        },
        {
          role: 'user',
          content: JSON.stringify({ words }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Failed to read OpenAI error');
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response missing content');
  }

  let parsed: {
    enriched?: Array<{
      word?: unknown;
      definition?: unknown;
      example_sentence?: unknown;
      part_of_speech?: unknown;
      level?: unknown;
      estimated_elo?: unknown;
    }>;
  };
  try {
    parsed = JSON.parse(content) as {
      enriched?: Array<{
        word?: unknown;
        definition?: unknown;
        example_sentence?: unknown;
        part_of_speech?: unknown;
        level?: unknown;
        estimated_elo?: unknown;
      }>;
    };
  } catch {
    throw new Error(ENRICHMENT_FAILED_ERROR);
  }

  const byWord = new Map<string, EnrichedWord>();
  for (const item of parsed.enriched ?? []) {
    const normalizedWord = normalizeWord(toSafeText(item.word));
    if (!normalizedWord || !words.includes(normalizedWord)) continue;

    byWord.set(normalizedWord, {
      word: normalizedWord,
      definition: toSafeText(item.definition),
      example_sentence: toSafeText(item.example_sentence),
      part_of_speech: toSafeText(item.part_of_speech),
      level: toBoundedInteger(item.level, 1, 7, 3),
      estimated_elo: toBoundedInteger(item.estimated_elo, 800, 2200, 1500),
      source: 'llm',
    });
  }

  return words.map(word => {
    const enriched = byWord.get(word);
    if (enriched) return enriched;

    return {
      word,
      definition: '',
      example_sentence: '',
      part_of_speech: '',
      level: 3,
      estimated_elo: 1500,
      source: 'llm',
    };
  });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = EnrichSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const inputWords = normalizeInputWords(parsed.data.words);
    if (inputWords.length === 0) {
      return NextResponse.json({ error: 'No valid words provided' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: bankMatches, error: bankError } = await supabase
      .from('spelling_word_bank')
      .select('word, definition, example_sentence, part_of_speech, level, current_elo')
      .in('word', inputWords)
      .eq('is_active', true);

    if (bankError) {
      return NextResponse.json(
        { error: 'Failed to fetch word bank matches', details: bankError },
        { status: 500 }
      );
    }

    const bankByWord = new Map<string, EnrichedWord>();
    for (const row of bankMatches ?? []) {
      bankByWord.set(row.word, buildWordBankEntry(row));
    }

    const novelWords = inputWords.filter(word => !bankByWord.has(word));
    let llmResults: EnrichedWord[];
    try {
      llmResults = await enrichWithLlm(novelWords);
    } catch (error) {
      if (error instanceof Error && error.message === ENRICHMENT_FAILED_ERROR) {
        return NextResponse.json({ error: ENRICHMENT_FAILED_ERROR }, { status: 502 });
      }
      throw error;
    }
    const llmByWord = new Map(llmResults.map(item => [item.word, item]));

    const enriched = inputWords
      .map(word => bankByWord.get(word) ?? llmByWord.get(word))
      .filter((item): item is EnrichedWord => Boolean(item));

    return NextResponse.json({ enriched });
  } catch (error) {
    console.error('[Spelling Enrich POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
