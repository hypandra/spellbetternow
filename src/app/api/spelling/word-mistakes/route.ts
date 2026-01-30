import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getKid } from '@/lib/spelling/db/kids';
import { getWordMistakeStats } from '@/lib/spelling/db/attempts';

const MISTAKE_LOOKBACK_DAYS = 7;

type WordMistakeRequestBody = {
  kidId: string;
  wordId: string;
};

function isWordMistakeRequestBody(value: unknown): value is WordMistakeRequestBody {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.kidId !== 'string' || typeof record.wordId !== 'string') return false;
  return record.kidId.trim().length > 0 && record.wordId.trim().length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    if (!isWordMistakeRequestBody(body)) {
      return NextResponse.json({ error: 'kidId and wordId are required' }, { status: 400 });
    }
    const { kidId, wordId } = body;

    const kid = await getKid(kidId, { useServiceRole: true });
    if (!kid) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }
    if (kid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    const since = new Date(Date.now() - MISTAKE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const stats = await getWordMistakeStats({
      kidId,
      wordId,
      since,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Spelling Word Mistakes] Error:', error);
    return NextResponse.json({ error: 'Failed to load mistakes' }, { status: 500 });
  }
}
