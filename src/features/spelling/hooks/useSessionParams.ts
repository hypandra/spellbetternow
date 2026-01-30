import { useSearchParams } from 'next/navigation';

export function useSessionParams() {
  const searchParams = useSearchParams();
  const kidId = searchParams.get('kidId');
  const wordIdsParam = searchParams.get('wordIds');
  const autoStart = searchParams.get('autoStart') === '1';
  const assessment = searchParams.get('assessment') === '1';
  const wordIds =
    wordIdsParam
      ?.split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .slice(0, 5) ?? [];

  return { kidId, wordIds, autoStart, assessment };
}
