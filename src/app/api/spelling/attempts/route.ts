import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { getKid } from '@/lib/spelling/db/kids';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kidId = new URL(request.url).searchParams.get('kidId');
    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    const kid = await getKid(kidId, { useServiceRole: true });
    if (!kid || kid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('spelling_attempts')
      .select('word_id, word_presented, correct, created_at, user_spelling, user_elo_before, user_elo_after')
      .eq('kid_id', kidId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (error) {
    console.error('[Spelling Attempts GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
