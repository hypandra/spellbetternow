import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { SessionRunner } from '@/lib/spelling/session/session-runner';
import { getKid } from '@/lib/spelling/db/kids';
import { getMaxWordLevel, getWordsByIds } from '@/lib/spelling/db/words';
import { buildPromptData } from '@/lib/spelling/session/prompt';
import { saveSessionRunnerState } from '@/lib/spelling/db/session-runners';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { kidId, wordIds, assessment } = body as {
      kidId?: string;
      wordIds?: string[];
      assessment?: boolean;
    };

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    const resolvedKid = await getKid(kidId, { useServiceRole: true });

    if (!resolvedKid) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }
    if (resolvedKid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    let preselectedWords;
    if (Array.isArray(wordIds)) {
      const sanitized = wordIds
        .map((id: unknown) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean);
      const unique = Array.from(new Set(sanitized));

      if (unique.length === 0 || unique.length > 5) {
        return NextResponse.json(
          { error: 'wordIds must contain between 1 and 5 items' },
          { status: 400 }
        );
      }

      const words = await getWordsByIds(unique);
      if (words.length !== unique.length) {
        return NextResponse.json({ error: 'One or more words not found' }, { status: 404 });
      }
      preselectedWords = words;
    }

    const runner = new SessionRunner();
    const maxLevel = await getMaxWordLevel();
    const result = await runner.start(kidId, resolvedKid.level_current, preselectedWords, {
      assessmentMode: Boolean(assessment),
      maxLevel,
      startElo: resolvedKid.elo_rating ?? 1500,
      totalAttempts: resolvedKid.total_attempts ?? 0,
      successfulAttempts: resolvedKid.successful_attempts ?? 0,
    });
    await saveSessionRunnerState(result.sessionId, runner.getState());
    const currentPrompt = result.currentWord
      ? buildPromptData(result.currentWord, result.level)
      : null;

    return NextResponse.json({
      sessionId: result.sessionId,
      currentWord: result.currentWord,
      currentPrompt,
      wordIndex: result.wordIndex,
      level: result.level,
    });
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
