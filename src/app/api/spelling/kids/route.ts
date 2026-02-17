import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getKidPercentile } from '@/lib/spelling/db/kids';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('spelling_kids')
      .select('*')
      .eq('parent_user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const kids = data ?? [];
    const withPercentiles = await Promise.all(
      kids.map(async kid => {
        const percentile = await getKidPercentile(kid.id);
        return { ...kid, percentile: Math.round(percentile * 100) };
      })
    );

    return NextResponse.json({ kids: withPercentiles });
  } catch (error) {
    console.error('[Spelling Kids] GET error:', error);
    return NextResponse.json({ error: 'Failed to load kids' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { parentUserId?: string; displayName?: string };
    const displayName = body.displayName?.trim();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!displayName) {
      return NextResponse.json(
        { error: 'displayName is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('spelling_kids')
      .insert({
        parent_user_id: session.user.id,
        display_name: displayName,
        level_current: 3,
        elo_rating: 1500,
        total_attempts: 0,
        successful_attempts: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ kid: data });
  } catch (error) {
    console.error('[Spelling Kids] POST error:', error);
    return NextResponse.json({ error: 'Failed to create kid' }, { status: 500 });
  }
}
