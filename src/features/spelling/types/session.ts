import type { Word } from '@/lib/spelling/db/words';
import type { DiffOp, DiffSummary } from '@/lib/spelling/errors/spelling-diff';

export type SessionState = 'START' | 'SPELLING' | 'BREAK' | 'COMPLETE';

export interface ErrorDetails {
  ops: DiffOp[];
  summary: DiffSummary;
}

export type InputMode = 'tap_letters' | 'typed';
export type PromptMode = 'audio' | 'no-audio';

export interface SpellingPromptData {
  prompt_id: string;
  input_mode: InputMode;
  target_length: number;
  letter_tray?: string[];
  prompt_mode?: PromptMode;
}

export interface MissedWordData {
  word: string;
  userSpelling: string;
}

export interface BreakData {
  breakSummary: {
    correct: string[];
    missed: MissedWordData[];
  };
  lesson: {
    pattern: string;
    explanation: string;
    contrast: string[];
    question: string;
    answer: string;
  } | null;
}

export interface SessionResponse {
  sessionId?: string;
  currentWord?: Word | null;
  currentPrompt?: SpellingPromptData | null;
  wordIndex?: number;
  level?: number;
  nextStep?: 'NEXT_WORD' | 'BREAK' | 'RETRY';
  advance?: boolean;
  nextWord?: Word | null;
  nextPrompt?: SpellingPromptData | null;
  breakSummary?: BreakData['breakSummary'];
  lesson?: BreakData['lesson'];
  nextLevel?: number;
  nextWords?: Word[];
  nextWordPrompts?: SpellingPromptData[];
  correct?: boolean;
  correctSpelling?: string;
  errorDetails?: ErrorDetails;
  attemptId?: string;
  attemptsTotal?: number;
  correctTotal?: number;
  miniSetsCompleted?: number;
  levelEnd?: number;
  assessmentSuggestedLevel?: number;
  assessmentMaxLevel?: number;
  error?: string;
}
