import { getWordsForMiniSetByElo, getEasierWordsByElo, type Word } from '../db/words';
import { getCustomListWordsForKid } from '../db/custom-lists-db';

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
  const customWords = await getCustomListWordsForKid(kidId);
  
  if (words.length < 5) {
    const additional = await getWordsForMiniSetByElo(targetElo, kidId, excludeWordIds, 0);
    words.push(...additional.slice(0, 5 - words.length));
  }

  const wordBankWords = words.slice(0, 5);

  if (customWords.length === 0) {
    return wordBankWords;
  }

  const shuffledCustomWords = [...customWords];
  for (let index = shuffledCustomWords.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledCustomWords[index], shuffledCustomWords[swapIndex]] = [
      shuffledCustomWords[swapIndex],
      shuffledCustomWords[index],
    ];
  }

  const preferredCustomCount =
    shuffledCustomWords.length >= 5
      ? 4
      : Math.min(shuffledCustomWords.length, 3);

  const selectedCustomWords = shuffledCustomWords.slice(0, preferredCustomCount);
  const selectedCustomIds = new Set(selectedCustomWords.map(word => word.id));
  const availableWordBankWords = wordBankWords.filter(word => !selectedCustomIds.has(word.id));
  const selectedWordBankWords = availableWordBankWords.slice(0, 5 - selectedCustomWords.length);

  if (selectedWordBankWords.length < 5 - selectedCustomWords.length) {
    const additionalCustomWords = shuffledCustomWords.slice(
      preferredCustomCount,
      preferredCustomCount + (5 - selectedCustomWords.length - selectedWordBankWords.length)
    );
    selectedCustomWords.push(...additionalCustomWords);
  }

  return [...selectedCustomWords, ...selectedWordBankWords].slice(0, 5);
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
