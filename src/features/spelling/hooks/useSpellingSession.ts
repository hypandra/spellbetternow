import { useEffect, useRef, useState } from 'react';
import { SpellingSessionClient } from '@/features/spelling/api/session-client';
import type { Word } from '@/lib/spelling/db/words';
import type {
  BreakData,
  InputMode,
  SessionState,
  SpellingPromptData,
} from '@/features/spelling/types/session';

type SessionErrorKind = 'missing-kid' | 'db-unavailable' | 'session-start-failed';

export interface FinishStats {
  attemptsTotal: number;
  correctTotal: number;
  miniSetsCompleted: number;
  levelEnd: number;
}

interface UseSpellingSessionResult {
  state: SessionState;
  sessionId: string | null;
  currentWord: Word | null;
  currentPrompt: SpellingPromptData | null;
  wordIndex: number;
  level: number;
  breakData: BreakData | null;
  finishStats: FinishStats | null;
  assessmentSuggestedLevel: number | null;
  assessmentMaxLevel: number | null;
  loading: boolean;
  error: SessionErrorKind | null;
  errorMessage: string | null;
  handleStart: (wordIdsOverride?: string[]) => Promise<void>;
  clearError: () => void;
  handleSubmit: (
    wordId: string,
    userSpelling: string,
    responseMs: number,
    options?: {
      inputMode?: InputMode;
      replayCount?: number;
      editCount?: number;
      advance?: boolean;
    }
  ) => Promise<void>;
  handleContinueMiniSet: (action: 'CONTINUE' | 'CHALLENGE_JUMP' | 'PRACTICE_MISSED') => Promise<void>;
  handleFinish: () => Promise<void>;
  handleApplyAssessmentLevel: (level: number) => Promise<void>;
}

export function useSpellingSession(
  kidId: string | null,
  options?: { wordIds?: string[]; autoStart?: boolean; assessment?: boolean }
): UseSpellingSessionResult {
  const [state, setState] = useState<SessionState>('START');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<SpellingPromptData | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [level, setLevel] = useState(3);
  const [breakData, setBreakData] = useState<BreakData | null>(null);
  const [finishStats, setFinishStats] = useState<FinishStats | null>(null);
  const [assessmentSuggestedLevel, setAssessmentSuggestedLevel] = useState<number | null>(null);
  const [assessmentMaxLevel, setAssessmentMaxLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SessionErrorKind | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAutoStartedRef = useRef(false);
  const assessmentMode = Boolean(options?.assessment);

  function clearError() {
    setError(null);
    setErrorMessage(null);
  }

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      if (!kidId) {
        if (isActive) {
          setError('missing-kid');
          setLoading(false);
        }
        return;
      }

      if (isActive) {
        setError(null);
        setLoading(false);
      }
    }

    loadSession();

    return () => {
      isActive = false;
    };
  }, [kidId]);

  async function handleStart(wordIdsOverride?: string[]) {
    if (!kidId) return;

    try {
      clearError();
      const wordIds =
        wordIdsOverride?.length
          ? wordIdsOverride
          : options?.wordIds?.length
            ? options.wordIds
            : undefined;
      const data = await SpellingSessionClient.start(kidId, wordIds, {
        assessment: assessmentMode,
      });

      if (data.error) {
        const msg = typeof data.error === 'string' ? data.error : 'Failed to start session';
        if (msg.includes('schema') || msg.includes('database')) {
          setError('db-unavailable');
          setErrorMessage('Database is temporarily unavailable. Please try again in a few minutes.');
        } else {
          setError('session-start-failed');
          setErrorMessage(msg);
        }
        return;
      }

      setFinishStats(null);
      setAssessmentSuggestedLevel(null);
      setAssessmentMaxLevel(null);
      setSessionId(data.sessionId ?? null);
      setCurrentWord(data.currentWord ?? null);
      setCurrentPrompt(data.currentPrompt ?? null);
      setWordIndex(data.wordIndex ?? 0);
      setLevel(prevLevel => data.level ?? prevLevel);
      setState('SPELLING');
    } catch (requestError) {
      console.error('Error starting session:', requestError);
      const msg = requestError instanceof Error ? requestError.message : 'Unknown error';
      if (msg.includes('schema') || msg.includes('database') || msg.includes('fetch')) {
        setError('db-unavailable');
        setErrorMessage('Unable to connect to the database. Please check your connection and try again.');
      } else {
        setError('session-start-failed');
        setErrorMessage(msg);
      }
    }
  }

  async function handleSubmit(
    wordId: string,
    userSpelling: string,
    responseMs: number,
    options?: {
      inputMode?: InputMode;
      replayCount?: number;
      editCount?: number;
      advance?: boolean;
    }
  ) {
    if (!sessionId) return;

    try {
      const data = await SpellingSessionClient.submit(sessionId, {
        wordId,
        userSpelling,
        responseMs,
        inputMode: options?.inputMode,
        replayCount: options?.replayCount,
        editCount: options?.editCount,
        advance: options?.advance,
      });

      if (data.advance === false) {
        if (data.nextWord) {
          setCurrentWord(data.nextWord);
        }
        if (data.nextPrompt) {
          setCurrentPrompt(data.nextPrompt);
        }
        return;
      }

      if (data.nextStep === 'BREAK') {
        if (assessmentMode && (data.attemptsTotal ?? 0) >= 10) {
          await handleFinish();
          return;
        }
        setBreakData({
          breakSummary: data.breakSummary || { correct: [], missed: [] },
          lesson: data.lesson || null,
        });
        setState('BREAK');
        return;
      }

      setCurrentWord(data.nextWord ?? null);
      setCurrentPrompt(data.nextPrompt ?? null);
      setWordIndex(prevIndex => prevIndex + 1);
    } catch (requestError) {
      console.error('Error submitting word:', requestError);
    }
  }

  async function handleContinueMiniSet(action: 'CONTINUE' | 'CHALLENGE_JUMP' | 'PRACTICE_MISSED') {
    if (!sessionId) return;

    try {
      const data = await SpellingSessionClient.continueMiniSet(sessionId, action);

      if (data.error && action !== 'CONTINUE') {
        if (action === 'CHALLENGE_JUMP') {
          alert('Nice try! Back to your level.');
        } else {
          alert('No missed words to practice right now.');
        }
        return;
      }

      setBreakData({
        breakSummary: data.breakSummary || { correct: [], missed: [] },
        lesson: data.lesson || null,
      });
      setCurrentWord(data.nextWords?.[0] ?? null);
      setCurrentPrompt(data.nextWordPrompts?.[0] ?? null);
      setWordIndex(0);
      setLevel(prevLevel => data.nextLevel ?? prevLevel);
      setState('SPELLING');
    } catch (requestError) {
      console.error('Error continuing mini-set:', requestError);
    }
  }

  async function handleFinish() {
    if (!sessionId) return;

    try {
      const data = await SpellingSessionClient.finish(sessionId);
      setFinishStats({
        attemptsTotal: data.attemptsTotal ?? 0,
        correctTotal: data.correctTotal ?? 0,
        miniSetsCompleted: data.miniSetsCompleted ?? 0,
        levelEnd: data.levelEnd ?? level,
      });
      setAssessmentSuggestedLevel(data.assessmentSuggestedLevel ?? null);
      setAssessmentMaxLevel(data.assessmentMaxLevel ?? null);
      setState('COMPLETE');
    } catch (requestError) {
      console.error('Error finishing session:', requestError);
    }
  }

  async function handleApplyAssessmentLevel(targetLevel: number) {
    if (!kidId) return;

    try {
      await SpellingSessionClient.updateKidLevel(kidId, targetLevel);
    } catch (requestError) {
      console.error('Error updating kid level:', requestError);
    }
  }

  useEffect(() => {
    if (!options?.autoStart || state !== 'START' || !kidId) return;
    if (loading || error) return;
    if (sessionId || currentWord) return;
    if (hasAutoStartedRef.current) return;

    hasAutoStartedRef.current = true;
    void handleStart();
  }, [kidId, options?.autoStart, state, loading, error, sessionId, currentWord]);

  return {
    state,
    sessionId,
    currentWord,
    currentPrompt,
    wordIndex,
    level,
    breakData,
    finishStats,
    assessmentSuggestedLevel,
    assessmentMaxLevel,
    loading,
    error,
    errorMessage,
    handleStart,
    handleSubmit,
    handleContinueMiniSet,
    handleFinish,
    handleApplyAssessmentLevel,
    clearError,
  };
}
