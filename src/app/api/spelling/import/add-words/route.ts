import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { normalizeWord, isValidWordLength } from '@/lib/spelling/custom-lists';

const AddWordsSchema = z.object({
  listId: z.string().uuid(),
  words: z.array(z.string()).min(1),
  sourceText: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const supabase = await createClient();

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

    const deduped = new Map<string, string>();

    for (const rawWord of words) {
      const display = rawWord.trim();
      if (!display) continue;

      const normalized = normalizeWord(display);
      if (!normalized) continue;
      if (!isValidWordLength(normalized)) continue;

      if (!deduped.has(normalized)) {
        deduped.set(normalized, display);
      }
    }

    if (deduped.size === 0) {
      return NextResponse.json({ error: 'No valid words provided' }, { status: 400 });
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

    const payload = Array.from(deduped.entries()).map(([wordText, wordDisplay]) => ({
      list_id: listId,
      owner_user_id: session.user.id,
      source_id: source.id,
      word_text: wordText,
      word_display: wordDisplay,
      is_active: true,
      created_by_user_id: session.user.id,
    }));

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
