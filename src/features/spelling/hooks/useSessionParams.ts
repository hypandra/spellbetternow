import { useSearchParams } from 'next/navigation';
import type { PromptMode } from '@/features/spelling/types/session';

export function useSessionParams() {
  const searchParams = useSearchParams();
  const kidId = searchParams.get('kidId');
  const wordIdsParam = searchParams.get('wordIds');
  const autoStart = searchParams.get('autoStart') === '1';
  const assessment = searchParams.get('assessment') === '1';
  const modeParam = searchParams.get('mode');
  const mode: PromptMode | undefined =
    modeParam === 'no-audio' ? 'no-audio' : modeParam === 'audio' ? 'audio' : undefined;
  const wordIds =
    wordIdsParam
      ?.split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .slice(0, 5) ?? [];

  return { kidId, wordIds, autoStart, assessment, mode };
}
