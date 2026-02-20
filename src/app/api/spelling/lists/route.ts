import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const CreateListSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  scopeType: z.string().max(40).optional(),
});

// TODO: These API routes (GET/POST) for spelling lists are not yet used in the frontend.
// They are part of the custom lists feature implementation and will be integrated
// when the UI for managing custom spelling lists is built.
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('spelling_custom_lists')
      .select('id, title, description, scope_type, created_at, updated_at')
      .eq('owner_user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch lists', details: error }, { status: 500 });
    }

    return NextResponse.json({ lists: data ?? [] });
  } catch (error) {
    console.error('[Spelling Lists GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const supabase = getServiceClient();

    const body: unknown = await request.json().catch(() => null);
    const parsed = CreateListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, scopeType } = parsed.data;
    const { data, error } = await supabase
      .from('spelling_custom_lists')
      .insert({
        owner_user_id: session.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        scope_type: scopeType?.trim() || 'personal',
      })
      .select('id, title, description, scope_type, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create list', details: error }, { status: 500 });
    }

    return NextResponse.json({ list: data }, { status: 201 });
  } catch (error) {
    console.error('[Spelling Lists POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
