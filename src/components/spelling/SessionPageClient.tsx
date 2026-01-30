'use client';

import { useRouter } from 'next/navigation';
import { SpellingErrorBoundary } from '@/components/spelling/SpellingErrorBoundary';
import { SessionPageErrorFallback } from '@/components/spelling/SessionPageErrorFallback';
import SessionLoading from '@/components/spelling/session/SessionLoading';
import SessionError from '@/components/spelling/session/SessionError';
import StateMachine from '@/components/spelling/session/StateMachine';
import { useSessionParams } from '@/features/spelling/hooks/useSessionParams';
import { useSpellingSession } from '@/features/spelling/hooks/useSpellingSession';

function SessionPageContent() {
  const router = useRouter();
  const { kidId, wordIds, autoStart, assessment } = useSessionParams();
  const {
    state,
    currentWord,
    currentPrompt,
    wordIndex,
    breakData,
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
  } = useSpellingSession(kidId, { wordIds, autoStart, assessment });

  if (loading) {
    return <SessionLoading />;
  }

  if (error === 'missing-kid') {
    return (
      <SessionError
        title="No learner selected"
        message="Choose a learner to start a spelling session."
      />
    );
  }

  if (error === 'db-unavailable') {
    return (
      <SessionError
        title="Database unavailable"
        message={errorMessage || 'Unable to connect to the database. Please try again in a few minutes.'}
        actionLabel="Try again"
        onAction={() => {
          clearError();
          handleStart();
        }}
      />
    );
  }

  if (error === 'session-start-failed') {
    return (
      <SessionError
        title="Could not start session"
        message={errorMessage || 'Something went wrong. Please try again.'}
        actionLabel="Try again"
        onAction={() => {
          clearError();
          handleStart();
        }}
      />
    );
  }

  if (!kidId) {
    return null;
  }

  return (
    <StateMachine
      state={state}
      kidId={kidId}
      selectedWordIds={wordIds}
      currentWord={currentWord}
      currentPrompt={currentPrompt}
      wordIndex={wordIndex}
      breakData={breakData}
      assessmentSuggestedLevel={assessmentSuggestedLevel}
      assessmentMaxLevel={assessmentMaxLevel}
      onApplyAssessmentLevel={handleApplyAssessmentLevel}
      onStart={handleStart}
      onSubmit={handleSubmit}
      onContinueMiniSet={handleContinueMiniSet}
      onFinish={handleFinish}
      onNavigate={() => router.push('/app')}
    />
  );
}

export default function SessionPageClient() {
  const router = useRouter();
  const { kidId } = useSessionParams();

  return (
    <SpellingErrorBoundary
      componentName="SessionPage"
      fallback={
        <SessionPageErrorFallback
          onRetry={() => window.location.reload()}
          kidId={kidId}
        />
      }
      onNavigate={() => router.push('/app')}
    >
      <SessionPageContent />
    </SpellingErrorBoundary>
  );
}
