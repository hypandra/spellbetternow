import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { wordId, kidId, category, feedbackText, attemptId } = body as {
      wordId: string;
      kidId: string;
      category: string;
      feedbackText?: string;
      attemptId?: string;
    };

    const validCategories = ['hide_word', 'bad_definition', 'bad_example', 'bad_audio'];
    if (!wordId || !kidId || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'wordId, kidId, and valid category are required' },
        { status: 400 }
      );
    }

    // Log for now — DB table will come later
    console.log('[word-feedback]', {
      userId: session.user.id,
      wordId,
      kidId,
      category,
      feedbackText: feedbackText || null,
      attemptId: attemptId || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Word feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
