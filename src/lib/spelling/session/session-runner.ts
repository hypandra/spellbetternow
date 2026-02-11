import { SessionStateMachineImpl, type SessionState } from './state-machine';
import {
  createSession,
  updateSessionState,
  endSession,
  type Session,
  logAttempt,
  createMiniSetSummary,
  getSessionWordIds,
  type AttemptData,
} from '../db/sessions';
import { selectMiniSetWords, selectChallengeJumpWords } from '../adaptivity/word-selector';
import { calculateConfidenceScore, type MiniSetResult } from '../adaptivity/level-adjuster';
import { updateMastery } from '../db/mastery';
import { getKidPercentile, updateKidElo, updateKidLevel } from '../db/kids';
import { getWord, updateWordElo } from '../db/words';
import type { Word } from '../db/words';
import { calculateEloUpdate, levelToBaseElo, percentileToLevel } from '../elo';
import {
  computeSpellingDiff,
  type SpellingDiffResult,
} from '../errors/spelling-diff';
import { detectPattern, getPatternTemplate } from '../lessons/patterns';
import { normalizeContrast } from '../lessons/normalize-contrast';

export interface SessionRunnerState {
  sessionId: string;
  kidId: string;
  currentLevel: number;
  currentElo: number;
  kidTotalAttempts: number;
  kidSuccessfulAttempts: number;
  currentWordIds: string[];
  wordIndex: number;
  state: SessionState;
  attempts: AttemptData[];
  miniSetResults: MiniSetResult[];
  confidenceScore: number;
  assessmentMode: boolean;
  maxLevel: number;
  promptMode?: 'audio' | 'no-audio';
}

export class SessionRunner {
  private stateMachine: SessionStateMachineImpl;
  private state: SessionRunnerState;

  constructor() {
    this.stateMachine = new SessionStateMachineImpl();
    this.state = {
      sessionId: '',
      kidId: '',
      currentLevel: 3,
      currentElo: 1500,
      kidTotalAttempts: 0,
      kidSuccessfulAttempts: 0,
      currentWordIds: [],
      wordIndex: 0,
      state: 'IDLE',
      attempts: [],
      miniSetResults: [],
      confidenceScore: 0,
      assessmentMode: false,
      maxLevel: 7,
    };
  }

  getState(): SessionRunnerState {
    return JSON.parse(JSON.stringify(this.state)) as SessionRunnerState;
  }

  loadState(state: SessionRunnerState): void {
    this.state = {
      ...state,
      assessmentMode: state.assessmentMode ?? false,
      maxLevel: state.maxLevel ?? 7,
      currentElo: state.currentElo ?? levelToBaseElo(state.currentLevel ?? 3),
      kidTotalAttempts: state.kidTotalAttempts ?? 0,
      kidSuccessfulAttempts: state.kidSuccessfulAttempts ?? 0,
      attempts: [...state.attempts],
      miniSetResults: [...state.miniSetResults],
      currentWordIds: [...state.currentWordIds],
    };
    this.stateMachine.state = state.state;
    this.stateMachine.wordIndex = state.wordIndex;
  }

  resumeFromSession(
    session: Session,
    attempts: AttemptData[],
    kid?: { elo_rating?: number; total_attempts?: number; successful_attempts?: number }
  ): void {
    this.state.sessionId = session.id;
    this.state.kidId = session.kid_id;
    this.state.currentLevel = session.current_level ?? session.level_start;
    this.state.currentElo = kid?.elo_rating ?? levelToBaseElo(this.state.currentLevel);
    this.state.kidTotalAttempts = kid?.total_attempts ?? 0;
    this.state.kidSuccessfulAttempts = kid?.successful_attempts ?? 0;
    this.state.currentWordIds = session.current_word_ids ?? [];
    this.state.wordIndex = session.current_word_index ?? 0;
    this.state.attempts = attempts;
    this.state.confidenceScore = 0;
    this.state.assessmentMode = this.state.assessmentMode ?? false;
    this.state.maxLevel = this.state.maxLevel ?? 7;

    const breakPending =
      session.attempts_total > 0 &&
      session.attempts_total % 5 === 0 &&
      session.attempts_total !== session.mini_sets_completed * 5;
    const currentMiniSetCount = breakPending ? 5 : this.state.wordIndex;
    const recentAttempts = attempts.slice(-currentMiniSetCount);
    this.state.miniSetResults = recentAttempts.map(attempt => ({
      wordId: attempt.word_id,
      correct: attempt.correct,
    }));

    this.stateMachine.state = breakPending ? 'BREAK' : 'IN_MINISET';
    this.stateMachine.wordIndex = this.state.wordIndex;
    this.state.state = this.stateMachine.state;
  }

  async start(
    kidId: string,
    level: number,
    preselectedWords?: Word[],
    options?: {
      assessmentMode?: boolean;
      maxLevel?: number;
      startElo?: number;
      totalAttempts?: number;
      successfulAttempts?: number;
    }
  ): Promise<{
    sessionId: string;
    currentWord: Word | null;
    wordIndex: number;
    level: number;
  }> {
    const assessmentMode = options?.assessmentMode ?? false;
    const maxLevel = options?.maxLevel ?? 7;
    const startLevel = Math.min(level, maxLevel);
    const startElo = options?.startElo ?? levelToBaseElo(startLevel);
    const wordIds = preselectedWords?.length
      ? preselectedWords
      : await selectMiniSetWords(startElo, kidId, []);
    
    if (wordIds.length === 0) {
      throw new Error('No words available for this level');
    }

    const session = await createSession(kidId, startLevel, wordIds.map(w => w.id));
    
    this.state.sessionId = session.id;
    this.state.kidId = kidId;
    this.state.currentLevel = startLevel;
    this.state.currentElo = startElo;
    this.state.kidTotalAttempts = options?.totalAttempts ?? 0;
    this.state.kidSuccessfulAttempts = options?.successfulAttempts ?? 0;
    this.state.currentWordIds = wordIds.map(w => w.id);
    this.state.wordIndex = 0;
    this.state.attempts = [];
    this.state.miniSetResults = [];
    this.state.confidenceScore = 0;
    this.state.assessmentMode = assessmentMode;
    this.state.maxLevel = maxLevel;

    this.stateMachine.transition({ type: 'START' });
    this.state.state = this.stateMachine.state;

    const currentWord = wordIds[0] || null;

    return {
      sessionId: session.id,
      currentWord,
      wordIndex: 0,
      level: startLevel,
    };
  }

  async submitWord(
    wordId: string,
    userSpelling: string,
    responseMs: number,
    replayCount = 0,
    editCount?: number,
    advance = true
  ): Promise<{
    correct: boolean;
    correctSpelling: string;
    errorDetails?: SpellingDiffResult;
    nextStep: 'NEXT_WORD' | 'BREAK' | 'RETRY';
    advance: boolean;
    nextWord?: Word | null;
    attemptId?: string;
    breakSummary?: {
      correct: string[];
      missed: Array<{ word: string; userSpelling: string }>;
    };
    lesson?: {
      pattern: string;
      explanation: string;
      contrast: string[];
      question: string;
      answer: string;
    } | null;
    attemptsTotal: number;
  }> {
    const word = await getWord(wordId);
    if (!word) {
      throw new Error('Word not found');
    }

    const correct = word.word.toLowerCase() === userSpelling.toLowerCase().trim();
    const errorDetails = correct
      ? undefined
      : computeSpellingDiff(word.word, userSpelling.trim());

    // Retry attempts (typed while looking at the answer) are not scored
    if (!advance) {
      return {
        correct,
        correctSpelling: word.word,
        errorDetails,
        nextStep: 'RETRY' as const,
        advance: false,
        nextWord: word,
        attemptsTotal: this.state.attempts.length,
      };
    }

    const wordEloBefore = word.current_elo ?? levelToBaseElo(word.level);
    const update = calculateEloUpdate(this.state.currentElo, wordEloBefore, correct);
    const userEloBefore = this.state.currentElo;
    const userEloAfter = update.newUserElo;
    const wordEloAfter = update.newWordElo;

    const attemptData: AttemptData = {
      word_id: wordId,
      word_presented: word.word,
      user_spelling: userSpelling,
      correct,
      response_ms: responseMs,
      replay_count: replayCount,
      edit_count: editCount,
      prompt_mode: this.state.promptMode,
    };

    const attemptId = await logAttempt(this.state.sessionId, this.state.kidId, attemptData, {
      userEloBefore,
      userEloAfter,
      wordEloBefore,
      wordEloAfter,
    });
    await updateMastery(this.state.kidId, wordId, correct);
    await updateWordElo(wordId, wordEloAfter);

    this.state.attempts.push(attemptData);
    this.upsertMiniSetResult(wordId, correct);
    this.state.currentElo = userEloAfter;
    this.state.kidTotalAttempts += 1;
    if (correct) {
      this.state.kidSuccessfulAttempts += 1;
    }
    await updateKidElo(
      this.state.kidId,
      userEloAfter,
      this.state.kidTotalAttempts,
      this.state.kidSuccessfulAttempts
    );

    const wordIndex = this.state.wordIndex + 1;
    const isLastWord = wordIndex >= this.state.currentWordIds.length;

    if (!isLastWord) {
      this.stateMachine.transition({ type: 'SUBMIT_WORD' });
      this.state.wordIndex = wordIndex;
      this.state.state = this.stateMachine.state;

      const nextWordId = this.state.currentWordIds[wordIndex];
      const nextWord = await getWord(nextWordId);

      await updateSessionState(
        this.state.sessionId,
        this.state.currentWordIds,
        wordIndex
      );

      return {
        correct,
        correctSpelling: word.word,
        errorDetails,
        nextStep: 'NEXT_WORD' as const,
        advance: true,
        nextWord: nextWord || null,
        attemptId,
        attemptsTotal: this.state.attempts.length,
      };
    } else {
      this.stateMachine.transition({ type: 'REACH_BREAK' });
      this.state.state = this.stateMachine.state;

      const correctWords: string[] = [];
      const missedWords: Array<{ word: string; userSpelling: string }> = [];

      for (const result of this.state.miniSetResults) {
        const w = await getWord(result.wordId);
        if (w) {
          if (result.correct) {
            correctWords.push(w.word);
          } else {
            const attempt = this.state.attempts.find(a => a.word_id === result.wordId && !a.correct);
            missedWords.push({
              word: w.word,
              userSpelling: attempt?.user_spelling ?? '',
            });
          }
        }
      }

      const lesson = await this.generateLesson(missedWords.map(m => m.word));

      return {
        correct,
        correctSpelling: word.word,
        errorDetails,
        nextStep: 'BREAK' as const,
        advance: true,
        attemptId,
        breakSummary: {
          correct: correctWords,
          missed: missedWords,
        },
        lesson,
        attemptsTotal: this.state.attempts.length,
      };
    }
  }

  private upsertMiniSetResult(wordId: string, correct: boolean) {
    const index = this.state.miniSetResults.findIndex(result => result.wordId === wordId);
    if (index >= 0) {
      const existing = this.state.miniSetResults[index];
      this.state.miniSetResults[index] = {
        wordId,
        correct: existing.correct && correct,
      };
      return;
    }
    this.state.miniSetResults.push({ wordId, correct });
  }

  async completeMiniSet(action: 'CONTINUE' | 'CHALLENGE_JUMP' | 'PRACTICE_MISSED'): Promise<{
    breakSummary: {
      correct: string[];
      missed: Array<{ word: string; userSpelling: string }>;
    };
    lesson: {
      pattern: string;
      explanation: string;
      contrast: string[];
      question: string;
      answer: string;
    } | null;
    nextLevel: number;
    nextWords: Word[];
    attemptsTotal: number;
  }> {
    const confidenceScore = calculateConfidenceScore(this.state.miniSetResults);
    this.state.confidenceScore += confidenceScore;

    let newLevel = this.state.currentLevel;
    if (action !== 'PRACTICE_MISSED') {
      newLevel = await this.refreshLevelFromPercentile();
    }

    const sessionWordIds = await getSessionWordIds(this.state.sessionId);
    const excludeWordIds = [...new Set([...this.state.currentWordIds, ...sessionWordIds])];

    let nextWords: Word[] = [];
    if (action === 'PRACTICE_MISSED') {
      const missedWordIds = this.state.miniSetResults.filter(r => !r.correct).map(r => r.wordId);
      const practiceWordIds: string[] = [];

      if (missedWordIds.length > 0) {
        for (let index = 0; index < 5; index += 1) {
          const nextId = missedWordIds[index % missedWordIds.length];
          practiceWordIds.push(nextId);
        }
      }

      const missedWords = await Promise.all(practiceWordIds.map(wordId => getWord(wordId)));
      nextWords = missedWords.filter((word): word is Word => Boolean(word));
    } else if (action === 'CHALLENGE_JUMP') {
      nextWords = await selectChallengeJumpWords(
        this.state.currentElo,
        excludeWordIds,
        this.state.kidId
      );
    } else {
      nextWords = await selectMiniSetWords(this.state.currentElo, this.state.kidId, excludeWordIds);
    }

    const correctWords: string[] = [];
    const missedWords: Array<{ word: string; userSpelling: string }> = [];

    for (const result of this.state.miniSetResults) {
      const w = await getWord(result.wordId);
      if (w) {
        if (result.correct) {
          correctWords.push(w.word);
        } else {
          const attempt = [...this.state.attempts].reverse().find(a => a.word_id === result.wordId);
          missedWords.push({
            word: w.word,
            userSpelling: attempt?.user_spelling ?? '',
          });
        }
      }
    }

    const lesson = await this.generateLesson(missedWords.map(m => m.word));

    await createMiniSetSummary(this.state.sessionId, {
      index: Math.floor((this.state.attempts.length - 1) / 5),
      level_effective: this.state.currentLevel,
      correct_count: this.state.miniSetResults.filter(r => r.correct).length,
      words_json: this.state.miniSetResults.map(r => ({
        word_id: r.wordId,
        correct: r.correct,
      })),
      lesson_json: lesson ?? undefined,
    });

    this.state.currentWordIds = nextWords.map(w => w.id);
    this.state.wordIndex = 0;
    this.state.miniSetResults = [];
    this.stateMachine.transition({ type: 'CONTINUE' });
    this.state.state = this.stateMachine.state;

    await updateSessionState(
      this.state.sessionId,
      this.state.currentWordIds,
      0,
      newLevel
    );

    return {
      breakSummary: {
        correct: correctWords,
        missed: missedWords,
      },
      lesson,
      nextLevel: newLevel,
      nextWords,
      attemptsTotal: this.state.attempts.length,
    };
  }

  async finish(): Promise<{
    attemptsTotal: number;
    correctTotal: number;
    miniSetsCompleted: number;
    levelEnd: number;
    assessmentSuggestedLevel?: number;
    assessmentMaxLevel?: number;
  }> {
    const correctTotal = this.state.attempts.filter(a => a.correct).length;
    const miniSetsCompleted = Math.floor(this.state.attempts.length / 5);
    const levelEnd = await this.refreshLevelFromPercentile();

    await endSession(this.state.sessionId, {
      levelEnd,
      miniSetsCompleted,
      attemptsTotal: this.state.attempts.length,
      correctTotal,
    });

    this.stateMachine.transition({ type: 'FINISH' });
    this.state.state = this.stateMachine.state;

    return {
      attemptsTotal: this.state.attempts.length,
      correctTotal,
      miniSetsCompleted,
      levelEnd,
      assessmentSuggestedLevel: this.state.assessmentMode ? levelEnd : undefined,
      assessmentMaxLevel: this.state.assessmentMode ? this.state.maxLevel : undefined,
    };
  }

  private async refreshLevelFromPercentile(): Promise<number> {
    const percentile = await getKidPercentile(this.state.kidId);
    const nextLevel = percentileToLevel(percentile);
    if (nextLevel !== this.state.currentLevel) {
      if (!this.state.assessmentMode) {
        await updateKidLevel(this.state.kidId, nextLevel);
      }
      this.state.currentLevel = nextLevel;
    }
    return nextLevel;
  }

  private async generateLesson(missedWords: string[]): Promise<{
    pattern: string;
    explanation: string;
    contrast: string[];
    question: string;
    answer: string;
  } | null> {
    if (missedWords.length === 0) {
      return null;
    }

    const pattern = detectPattern(missedWords[0]);
    if (!pattern) {
      return null;
    }

    const template = getPatternTemplate(pattern);
    if (!template) {
      return null;
    }

    return {
      pattern: template.name,
      explanation: template.explanation,
      contrast: normalizeContrast(template.contrast),
      question: template.question,
      answer: template.answer,
    };
  }
}
