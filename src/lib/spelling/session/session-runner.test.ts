import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all DB dependencies before importing SessionRunner
const mockWord = {
  id: 'word-1',
  word: 'friend',
  level: 3,
  definition: 'A person you like',
  example_sentence: 'She is my friend.',
  current_elo: 1500,
};

const mockWords = [
  mockWord,
  { id: 'word-2', word: 'because', level: 3, definition: '', example_sentence: '', current_elo: 1500 },
  { id: 'word-3', word: 'people', level: 3, definition: '', example_sentence: '', current_elo: 1500 },
  { id: 'word-4', word: 'would', level: 3, definition: '', example_sentence: '', current_elo: 1500 },
  { id: 'word-5', word: 'their', level: 3, definition: '', example_sentence: '', current_elo: 1500 },
];

vi.mock('../db/sessions', () => ({
  createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
  updateSessionState: vi.fn().mockResolvedValue(undefined),
  endSession: vi.fn().mockResolvedValue(undefined),
  logAttempt: vi.fn().mockResolvedValue('attempt-id'),
  createMiniSetSummary: vi.fn().mockResolvedValue(undefined),
  getSessionWordIds: vi.fn().mockResolvedValue([]),
}));

vi.mock('../db/mastery', () => ({
  updateMastery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db/kids', () => ({
  getKidPercentile: vi.fn().mockResolvedValue(50),
  updateKidElo: vi.fn().mockResolvedValue(undefined),
  updateKidLevel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db/words', () => ({
  getWord: vi.fn().mockImplementation((id: string) => {
    return Promise.resolve(mockWords.find(w => w.id === id) ?? null);
  }),
  updateWordElo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../adaptivity/word-selector', () => ({
  selectMiniSetWords: vi.fn().mockResolvedValue([]),
  selectChallengeJumpWords: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lessons/generate-lesson', () => ({
  generateLessonFromMissedWords: vi.fn().mockReturnValue(null),
}));

import { SessionRunner } from './session-runner';
import type { Word } from '../db/words';

describe('SessionRunner retry bug', () => {
  let runner: SessionRunner;

  beforeEach(async () => {
    vi.clearAllMocks();
    runner = new SessionRunner();
    await runner.start('kid-1', 3, mockWords as Word[]);
  });

  it('break screen shows missed word when kid misspells then corrects', async () => {
    // Words 1-4: spell correctly
    for (let i = 0; i < 4; i++) {
      const result = await runner.submitWord(
        mockWords[i].id,
        mockWords[i].word,
        1000,
        0,
        undefined,
        true
      );
      expect(result.correct).toBe(true);
      expect(result.nextStep).toBe('NEXT_WORD');
    }

    // Word 5: misspell first (advance=false, simulating the retry flow)
    const retryResult = await runner.submitWord(
      'word-5',
      'thier', // misspelling
      1000,
      0,
      undefined,
      false // advance=false: show feedback, don't advance
    );
    expect(retryResult.correct).toBe(false);
    expect(retryResult.nextStep).toBe('RETRY');

    // Word 5: correct it (advance=true, kid typed it right this time)
    const correctionResult = await runner.submitWord(
      'word-5',
      'their', // correct spelling
      2000,
      0,
      undefined,
      true
    );

    // The break screen should reflect FIRST-ATTEMPT accuracy:
    // "their" was misspelled on first attempt, so it should show as missed
    expect(correctionResult.nextStep).toBe('BREAK');
    expect(correctionResult.breakSummary).toBeDefined();
    expect(correctionResult.breakSummary!.correct).toHaveLength(4);
    expect(correctionResult.breakSummary!.missed).toHaveLength(1);
    expect(correctionResult.breakSummary!.missed[0].word).toBe('their');
    expect(correctionResult.breakSummary!.missed[0].userSpelling).toBe('thier');
  });

  it('word spelled correctly on first attempt shows as correct', async () => {
    // All 5 words spelled correctly on first attempt
    for (let i = 0; i < 4; i++) {
      await runner.submitWord(mockWords[i].id, mockWords[i].word, 1000, 0, undefined, true);
    }

    const lastResult = await runner.submitWord(
      'word-5',
      'their',
      1000,
      0,
      undefined,
      true
    );

    expect(lastResult.nextStep).toBe('BREAK');
    expect(lastResult.breakSummary!.correct).toHaveLength(5);
    expect(lastResult.breakSummary!.missed).toHaveLength(0);
  });
});
