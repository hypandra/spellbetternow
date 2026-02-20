import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { SessionRunner } from '@/lib/spelling/session/session-runner';
import { getKid } from '@/lib/spelling/db/kids';
import { getMaxWordLevel, getWordsByIds } from '@/lib/spelling/db/words';
import { getWordsForList } from '@/lib/spelling/db/custom-lists-db';
import { buildPromptData } from '@/lib/spelling/session/prompt';
import { saveSessionRunnerState } from '@/lib/spelling/db/session-runners';
import { createClient } from '@supabase/supabase-js';
import type { PromptMode } from '@/features/spelling/types/session';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { kidId, wordIds, listId, assessment, mode } = body as {
      kidId?: string;
      wordIds?: string[];
      listId?: string;
      assessment?: boolean;
      mode?: PromptMode;
    };

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    if (listId && Array.isArray(wordIds) && wordIds.length > 0) {
      return NextResponse.json(
        { error: 'listId and wordIds are mutually exclusive' },
        { status: 400 }
      );
    }

    const resolvedKid = await getKid(kidId, { useServiceRole: true });

    if (!resolvedKid) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }
    if (resolvedKid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    let preselectedWords;
    let studyListId: string | undefined;

    if (listId) {
      // Validate list exists and belongs to the user
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: list, error: listError } = await supabase
        .from('spelling_custom_lists')
        .select('id, created_by')
        .eq('id', listId)
        .single();

      if (listError || !list) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      if (list.created_by !== session.user.id) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }

      const listWords = await getWordsForList(listId);
      if (listWords.length === 0) {
        return NextResponse.json({ error: 'List has no active words' }, { status: 400 });
      }

      // Shuffle and take first min(5, total) as initial mini-set
      const shuffled = [...listWords].sort(() => Math.random() - 0.5);
      preselectedWords = shuffled.slice(0, Math.min(5, shuffled.length));
      studyListId = listId;
    } else if (Array.isArray(wordIds)) {
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
      studyListId,
    });
    // Resolve prompt mode: explicit param > kid preference > default
    const promptMode: PromptMode = mode ?? resolvedKid.audio_mode ?? 'audio';

    // Store prompt mode in runner state for subsequent actions
    const runnerState = runner.getState();
    runnerState.promptMode = promptMode;
    await saveSessionRunnerState(result.sessionId, runnerState);

    const currentPrompt = result.currentWord
      ? buildPromptData(result.currentWord, result.level, promptMode)
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
