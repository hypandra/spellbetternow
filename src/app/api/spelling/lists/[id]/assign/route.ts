import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

const AssignSchema = z.object({
  kidId: z.string().uuid(),
  isEnabled: z.boolean().optional(),
  weight: z.number().int().min(1).max(10).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const supabase = await createClient();

    const body: unknown = await request.json().catch(() => null);
    const parsed = AssignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { kidId, isEnabled, weight } = parsed.data;

    const [{ data: list, error: listError }, { data: kid, error: kidError }] =
      await Promise.all([
        supabase
          .from('spelling_custom_lists')
          .select('id, owner_user_id')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('spelling_kids')
          .select('id, parent_user_id')
          .eq('id', kidId)
          .maybeSingle(),
      ]);

    if (listError || kidError) {
      return NextResponse.json(
        { error: 'Failed to validate assignment', details: listError ?? kidError },
        { status: 500 }
      );
    }

    if (!list || !kid) {
      return NextResponse.json({ error: 'List or kid not found' }, { status: 404 });
    }

    if (list.owner_user_id !== session.user.id || kid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: assignment, error: assignError } = await supabase
      .from('spelling_kid_list_assignments')
      .upsert(
        {
          list_id: id,
          kid_id: kidId,
          owner_user_id: session.user.id,
          is_enabled: isEnabled ?? true,
          weight: weight ?? 1,
          created_by_user_id: session.user.id,
        },
        { onConflict: 'kid_id,list_id' }
      )
      .select('kid_id, list_id, is_enabled, weight, created_at')
      .single();

    if (assignError) {
      return NextResponse.json({ error: 'Failed to assign list', details: assignError }, { status: 500 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('[Spelling List Assign POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
