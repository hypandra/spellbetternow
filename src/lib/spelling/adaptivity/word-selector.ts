import { getWordsForMiniSetByElo, getEasierWordsByElo, type Word } from '../db/words';

export interface WordSelectionResult {
  words: Word[];
  confidenceLadderApplied: boolean;
}

export async function selectMiniSetWords(
  targetElo: number,
  kidId: string,
  excludeWordIds: string[],
  recentSeenWindowDays = 7
): Promise<Word[]> {
  const words = await getWordsForMiniSetByElo(
    targetElo,
    kidId,
    excludeWordIds,
    recentSeenWindowDays
  );
  
  if (words.length < 5) {
    const additional = await getWordsForMiniSetByElo(targetElo, kidId, excludeWordIds, 0);
    words.push(...additional.slice(0, 5 - words.length));
  }

  return words.slice(0, 5);
}

export async function applyConfidenceLadder(
  targetElo: number,
  recentMisses: string[],
  excludeWordIds: string[]
): Promise<Word[]> {
  if (recentMisses.length < 2 || targetElo <= 1100) {
    return [];
  }

  const easierWords = await getEasierWordsByElo(targetElo, 2, excludeWordIds);
  
  const retryWord = recentMisses[0];
  const retryWordObj = easierWords.find(w => w.word === retryWord);
  
  const result: Word[] = [];
  
  if (easierWords.length > 0) {
    result.push(...easierWords.slice(0, 2));
  }
  
  if (retryWordObj) {
    result.push(retryWordObj);
  }

  return result;
}

export async function selectChallengeJumpWords(
  targetElo: number,
  excludeWordIds: string[],
  kidId: string
): Promise<Word[]> {
  if (targetElo >= 2000) {
    return [];
  }

  const challengeElo = Math.min(targetElo + 150, 2200);
  const words = await getWordsForMiniSetByElo(challengeElo, kidId, excludeWordIds, 0);
  return words.slice(0, 5);
}

export function shouldApplyConfidenceLadder(recentAttempts: Array<{ correct: boolean }>): boolean {
  if (recentAttempts.length < 3) {
    return false;
  }

  const lastThree = recentAttempts.slice(-3);
  const missCount = lastThree.filter(a => !a.correct).length;
  
  return missCount >= 2;
}
