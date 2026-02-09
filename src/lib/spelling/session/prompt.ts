import { randomUUID } from 'crypto';
import type { Word } from '@/lib/spelling/db/words';
import type { PromptMode, SpellingPromptData } from '@/features/spelling/types/session';
import { generateLetterTray } from './letter-tray';

export function buildPromptData(
  word: Word,
  level: number,
  promptMode: PromptMode = 'audio'
): SpellingPromptData {
  const inputMode = level === 1 ? 'tap_letters' : 'typed';
  const prompt: SpellingPromptData = {
    prompt_id: randomUUID(),
    input_mode: inputMode,
    target_length: word.word.length,
    prompt_mode: promptMode,
  };

  if (inputMode === 'tap_letters') {
    prompt.letter_tray = generateLetterTray(word.word);
  }

  return prompt;
}
