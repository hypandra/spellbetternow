import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId, wordId, kidId, rating, feedbackText } = body as {
      attemptId?: string;
      wordId: string;
      kidId: string;
      rating: boolean;
      feedbackText?: string;
    };

    if (!wordId || !kidId || typeof rating !== 'boolean') {
      return NextResponse.json(
        { error: 'wordId, kidId, and rating are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify kid belongs to this user
    const { data: kid } = await supabase
      .from('spelling_kids')
      .select('id, parent_user_id')
      .eq('id', kidId)
      .maybeSingle();

    if (!kid || kid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase.from('spelling_hint_feedback').insert({
      attempt_id: attemptId || null,
      word_id: wordId,
      kid_id: kidId,
      rating,
      feedback_text: feedbackText || null,
    });

    if (error) {
      console.error('Failed to save hint feedback:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hint feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
