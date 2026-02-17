import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { SessionRunner } from '@/lib/spelling/session/session-runner';
import { getSessionAttempts, getSessionState } from '@/lib/spelling/db/sessions';
import { getKid } from '@/lib/spelling/db/kids';
import {
  deleteSessionRunnerState,
  getSessionRunnerState,
  saveSessionRunnerState,
} from '@/lib/spelling/db/session-runners';
import { acquireSessionLock, releaseSessionLock } from '@/lib/spelling/db/session-locks';
import { buildPromptData } from '@/lib/spelling/session/prompt';
import type { PromptMode } from '@/features/spelling/types/session';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, type, payload } = body;

    if (!sessionId || !type) {
      return NextResponse.json({ error: 'sessionId and type are required' }, { status: 400 });
    }

    const spellingSession = await getSessionState(sessionId);
    if (!spellingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const resolvedKid = await getKid(spellingSession.kid_id, { useServiceRole: true });
    if (!resolvedKid || resolvedKid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const lock = await acquireSessionLock(sessionId);
    if (!lock.acquired || !lock.token) {
      return NextResponse.json({ error: 'Session is busy, try again' }, { status: 409 });
    }

    try {
      const runner = new SessionRunner();
      const storedState = await getSessionRunnerState(sessionId);
      if (storedState) {
        runner.loadState(storedState);
      } else {
        const attempts = await getSessionAttempts(spellingSession.id);
        const kid = resolvedKid ?? (await getKid(spellingSession.kid_id, { useServiceRole: true }));
        runner.resumeFromSession(spellingSession, attempts, kid ?? undefined);
        await saveSessionRunnerState(sessionId, runner.getState());
      }

      const promptMode: PromptMode = runner.getState().promptMode ?? 'audio';

      switch (type) {
        case 'PLAY':
          return NextResponse.json({ success: true });

        case 'SUBMIT': {
          if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ error: 'payload is required' }, { status: 400 });
          }
          const { wordId, userSpelling, responseMs, replayCount, editCount, advance } = payload;
          if (!wordId || !userSpelling) {
            return NextResponse.json(
              { error: 'wordId and userSpelling are required' },
              { status: 400 }
            );
          }

          // Validate wordId matches current word index
          const expectedWordId = spellingSession.current_word_ids[spellingSession.current_word_index];
          if (wordId !== expectedWordId) {
            return NextResponse.json(
              { error: 'Invalid wordId for current word index' },
              { status: 400 }
            );
          }

          const result = await runner.submitWord(
            wordId,
            userSpelling,
            responseMs || 0,
            replayCount || 0,
            editCount,
            advance !== false
          );
          await saveSessionRunnerState(sessionId, runner.getState());
          const nextLevel = runner.getState().currentLevel;
          const nextPrompt = result.nextWord && result.advance !== false
            ? buildPromptData(result.nextWord, nextLevel, promptMode)
            : null;

          return NextResponse.json({
            correct: result.correct,
            correctSpelling: result.correctSpelling,
            errorDetails: result.errorDetails,
            attemptId: result.attemptId,
            nextStep: result.nextStep,
            advance: result.advance,
            nextWord: result.nextWord,
            nextPrompt,
            breakSummary: result.breakSummary,
            lesson: result.lesson,
            attemptsTotal: result.attemptsTotal,
          });
        }

        case 'COMPLETE_MINISET': {
          if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ error: 'payload is required' }, { status: 400 });
          }
          const { action } = payload;
          if (
            !action ||
            (action !== 'CONTINUE' && action !== 'CHALLENGE_JUMP' && action !== 'PRACTICE_MISSED')
          ) {
            return NextResponse.json(
              { error: 'action must be CONTINUE, CHALLENGE_JUMP, or PRACTICE_MISSED' },
              { status: 400 }
            );
          }

          const result = await runner.completeMiniSet(action);
          await saveSessionRunnerState(sessionId, runner.getState());
          const nextWordPrompts = result.nextWords.map(word =>
            buildPromptData(word, result.nextLevel, promptMode)
          );

          if (
            (action === 'CHALLENGE_JUMP' || action === 'PRACTICE_MISSED') &&
            result.nextWords.length === 0
          ) {
            return NextResponse.json({
              error:
                action === 'CHALLENGE_JUMP'
                  ? 'No words available at challenge level'
                  : 'No missed words available to practice',
              breakSummary: result.breakSummary,
              lesson: result.lesson,
              nextLevel: result.nextLevel,
            });
          }

          return NextResponse.json({
            breakSummary: result.breakSummary,
            lesson: result.lesson,
            nextLevel: result.nextLevel,
            nextWords: result.nextWords,
            nextWordPrompts,
            attemptsTotal: result.attemptsTotal,
          });
        }

        case 'FINISH': {
          const result = await runner.finish();
          await deleteSessionRunnerState(sessionId);
          return NextResponse.json(result);
        }

        default:
          return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
      }
    } finally {
      try {
        await releaseSessionLock(sessionId, lock.token);
      } catch (releaseError) {
        console.error('Failed to release session lock:', releaseError);
      }
    }
  } catch (error) {
    console.error('Session action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
