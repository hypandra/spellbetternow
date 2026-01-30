'use client';

import SessionStart from '@/components/spelling/SessionStart';
import SpellPrompt from '@/components/spelling/SpellPrompt';
import BreakScreen from '@/components/spelling/BreakScreen';
import SessionComplete from '@/components/spelling/SessionComplete';
import { SpellingErrorBoundary } from '@/components/spelling/SpellingErrorBoundary';
import { SpellPromptErrorFallback } from '@/components/spelling/SpellPromptErrorFallback';
import type { Word } from '@/lib/spelling/db/words';
import type {
  BreakData,
  InputMode,
  SessionState,
  SpellingPromptData,
} from '@/features/spelling/types/session';

interface StateMachineProps {
  state: SessionState;
  kidId: string;
  selectedWordIds?: string[];
  currentWord: Word | null;
  currentPrompt: SpellingPromptData | null;
  wordIndex: number;
  breakData: BreakData | null;
  assessmentSuggestedLevel: number | null;
  assessmentMaxLevel: number | null;
  onApplyAssessmentLevel: (level: number) => Promise<void>;
  onStart: (wordIds?: string[]) => void;
  onSubmit: (
    wordId: string,
    userSpelling: string,
    responseMs: number,
    options?: {
      inputMode?: InputMode;
      replayCount?: number;
      editCount?: number;
    }
  ) => Promise<void>;
  onContinueMiniSet: (action: 'CONTINUE' | 'CHALLENGE_JUMP' | 'PRACTICE_MISSED') => void;
  onFinish: () => void;
  onNavigate: () => void;
}

export default function StateMachine({
  state,
  kidId,
  selectedWordIds,
  currentWord,
  currentPrompt,
  wordIndex,
  breakData,
  assessmentSuggestedLevel,
  assessmentMaxLevel,
  onApplyAssessmentLevel,
  onStart,
  onSubmit,
  onContinueMiniSet,
  onFinish,
  onNavigate,
}: StateMachineProps) {
  switch (state) {
    case 'START':
      return <SessionStart kidId={kidId} onStart={onStart} wordIds={selectedWordIds} />;
    case 'SPELLING':
      return (
        <SpellingErrorBoundary
          componentName="SpellPrompt"
          fallback={
            <SpellPromptErrorFallback
              onRetry={() => window.location.reload()}
              word={currentWord?.word ?? ''}
            />
          }
          onNavigate={onNavigate}
        >
          {currentWord ? (
            <SpellPrompt
              word={currentWord}
              wordIndex={wordIndex}
              prompt={currentPrompt}
              onSubmit={onSubmit}
            />
          ) : null}
        </SpellingErrorBoundary>
      );
    case 'BREAK':
      return (
        <BreakScreen
          breakData={breakData}
          onContinue={() => onContinueMiniSet('CONTINUE')}
          onPracticeMissed={() => onContinueMiniSet('PRACTICE_MISSED')}
          onChallengeJump={() => onContinueMiniSet('CHALLENGE_JUMP')}
          onFinish={onFinish}
          onNavigate={onNavigate}
        />
      );
    case 'COMPLETE':
      return (
        <SessionComplete
          kidId={kidId}
          assessmentSuggestedLevel={assessmentSuggestedLevel}
          assessmentMaxLevel={assessmentMaxLevel}
          onApplyAssessmentLevel={onApplyAssessmentLevel}
        />
      );
    default:
      return null;
  }
}
