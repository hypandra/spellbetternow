import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

type LessonRating = 'helped' | 'not_helped' | 'confusing';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { kidId, pattern, rating, feedbackText } = body as {
      kidId: string;
      pattern: string;
      rating: LessonRating;
      feedbackText?: string;
    };

    if (!kidId || !pattern || !rating) {
      return NextResponse.json(
        { error: 'kidId, pattern, and rating are required' },
        { status: 400 }
      );
    }

    console.log('Lesson feedback received', {
      userId: session.user.id,
      kidId,
      pattern,
      rating,
      feedbackText: feedbackText || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lesson feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
