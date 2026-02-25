import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { normalizeWord, isValidWordLength } from '@/lib/spelling/custom-lists';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const WordWithMetadataSchema = z.object({
  word: z.string().min(1),
  definition: z.string().max(500).optional(),
  example_sentence: z.string().max(500).optional(),
  part_of_speech: z.string().max(50).optional(),
  level: z.number().int().min(1).max(7).optional(),
  estimated_elo: z.number().int().min(800).max(2200).optional(),
});

const AddWordsSchema = z.object({
  listId: z.string().uuid(),
  words: z.array(z.union([z.string(), WordWithMetadataSchema])).min(1),
  sourceText: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const supabase = getServiceClient();

    const body: unknown = await request.json().catch(() => null);
    const parsed = AddWordsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { listId, words, sourceText } = parsed.data;

    const { data: list, error: listError } = await supabase
      .from('spelling_custom_lists')
      .select('id, owner_user_id')
      .eq('id', listId)
      .maybeSingle();

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch list', details: listError }, { status: 500 });
    }

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    if (list.owner_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    type PendingWord = {
      wordDisplay: string;
      definition?: string;
      example_sentence?: string;
      part_of_speech?: string;
      level?: number;
      estimated_elo?: number;
    };
    const deduped = new Map<string, PendingWord>();

    for (const rawEntry of words) {
      const payloadWord = typeof rawEntry === 'string' ? rawEntry : rawEntry.word;
      const display = payloadWord.trim();
      if (!display) continue;

      const normalized = normalizeWord(display);
      if (!normalized) continue;
      if (!isValidWordLength(normalized)) continue;

      const existing = deduped.get(normalized);
      const metadata =
        typeof rawEntry === 'string'
          ? {}
          : {
              definition: rawEntry.definition?.trim() || undefined,
              example_sentence: rawEntry.example_sentence?.trim() || undefined,
              part_of_speech: rawEntry.part_of_speech?.trim() || undefined,
              level: rawEntry.level,
              estimated_elo: rawEntry.estimated_elo,
            };

      deduped.set(normalized, {
        wordDisplay: existing?.wordDisplay ?? display,
        definition: existing?.definition ?? metadata.definition,
        example_sentence: existing?.example_sentence ?? metadata.example_sentence,
        part_of_speech: existing?.part_of_speech ?? metadata.part_of_speech,
        level: existing?.level ?? metadata.level,
        estimated_elo: existing?.estimated_elo ?? metadata.estimated_elo,
      });
    }

    if (deduped.size === 0) {
      return NextResponse.json({ error: 'No valid words provided' }, { status: 400 });
    }

    // Promote enriched words to the word bank (non-fatal)
    const enrichedEntries = Array.from(deduped.entries()).filter(
      ([, entry]) => entry.definition
    );
    if (enrichedEntries.length > 0) {
      const bankPayload = enrichedEntries.map(([wordText, entry]) => ({
        word: wordText,
        definition: entry.definition!,
        example_sentence: entry.example_sentence ?? null,
        part_of_speech: entry.part_of_speech ?? null,
        level: entry.level ?? 3,
        base_elo: entry.estimated_elo ?? 1500,
        current_elo: entry.estimated_elo ?? 1500,
        is_active: true,
      }));

      const { error: bankError } = await supabase
        .from('spelling_word_bank')
        .upsert(bankPayload, { onConflict: 'word', ignoreDuplicates: true });

      if (bankError) {
        console.warn('[Spelling Add Words] Word bank promotion failed (non-fatal):', bankError);
      }
    }

    const { data: source, error: sourceError } = await supabase
      .from('spelling_custom_list_sources')
      .insert({
        list_id: listId,
        owner_user_id: session.user.id,
        source_type: 'manual_text',
        source_text: sourceText ?? null,
        created_by_user_id: session.user.id,
      })
      .select('id')
      .single();

    if (sourceError) {
      return NextResponse.json({ error: 'Failed to store source', details: sourceError }, { status: 500 });
    }

    const payload = Array.from(deduped.entries()).map(([wordText, entry]) => {
      return {
        list_id: listId,
        owner_user_id: session.user.id,
        source_id: source.id,
        word_text: wordText,
        word_display: entry.wordDisplay,
        definition: entry.definition ?? null,
        example_sentence: entry.example_sentence ?? null,
        part_of_speech: entry.part_of_speech ?? null,
        level: entry.level ?? null,
        estimated_elo: entry.estimated_elo ?? null,
        is_active: true,
        created_by_user_id: session.user.id,
      };
    });

    const { data: items, error: itemsError } = await supabase
      .from('spelling_custom_list_items')
      .upsert(payload, { onConflict: 'list_id,word_text', ignoreDuplicates: true })
      .select('id, word_text, word_display, is_active');

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to add words', details: itemsError }, { status: 500 });
    }

    return NextResponse.json({ items: items ?? [], addedCount: items?.length ?? 0 });
  } catch (error) {
    console.error('[Spelling Add Words POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
