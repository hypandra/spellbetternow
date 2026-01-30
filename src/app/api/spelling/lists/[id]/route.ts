import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const supabase = await createClient();

    const { data: list, error: listError } = await supabase
      .from('spelling_custom_lists')
      .select('id, owner_user_id, title, description, scope_type, created_at, updated_at')
      .eq('id', id)
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

    const [{ data: items, error: itemsError }, { data: assignments, error: assignError }] =
      await Promise.all([
        supabase
          .from('spelling_custom_list_items')
          .select('id, word_text, word_display, is_active, created_at, updated_at')
          .eq('list_id', id)
          .order('word_text', { ascending: true }),
        supabase
          .from('spelling_kid_list_assignments')
          .select('kid_id, is_enabled, weight, created_at')
          .eq('list_id', id),
      ]);

    if (itemsError || assignError) {
      return NextResponse.json(
        { error: 'Failed to fetch list details', details: itemsError ?? assignError },
        { status: 500 }
      );
    }

    return NextResponse.json({ list, items: items ?? [], assignments: assignments ?? [] });
  } catch (error) {
    console.error('[Spelling List GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
