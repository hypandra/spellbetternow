import type { WordMistakeStat } from '@/lib/spelling/db/attempts';

export type SpellingAttemptRow = {
  word_id: string | null;
  word_presented: string | null;
  correct: boolean | null;
  created_at: string | null;
  user_spelling?: string | null;
  user_elo_before?: number | null;
  user_elo_after?: number | null;
};

export class SpellingHistoryClient {
  static async getKidAttempts(kidId: string): Promise<SpellingAttemptRow[]> {
    const response = await fetch(`/api/spelling/attempts?kidId=${encodeURIComponent(kidId)}`);
    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorBody = (await response.json()) as { error?: string } | null;
        if (errorBody?.error) {
          errorMessage = errorBody.error;
        }
      } catch {
        // Keep default error message if response is not JSON.
      }
      throw new Error(errorMessage);
    }
    const payload = (await response.json()) as { attempts?: SpellingAttemptRow[] };
    return payload.attempts ?? [];
  }

  static async getWordMistakeStats(
    kidId: string,
    wordId: string,
    signal?: AbortSignal,
  ): Promise<WordMistakeStat[]> {
    const data: unknown = await this.post('/api/spelling/word-mistakes', { kidId, wordId }, signal);
    if (!isWordMistakeStatArray(data)) {
      throw new Error('Invalid word mistake stats response');
    }
    return data;
  }

  private static async post(path: string, body: Record<string, unknown>, signal?: AbortSignal) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorBody = (await response.json()) as { error?: string } | null;
        if (errorBody?.error) {
          errorMessage = errorBody.error;
        }
      } catch {
        // Keep default error message if response is not JSON.
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

function isWordMistakeStatArray(value: unknown): value is WordMistakeStat[] {
  return Array.isArray(value) && value.every(isWordMistakeStat);
}

function isWordMistakeStat(value: unknown): value is WordMistakeStat {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.spelling === 'string' &&
    record.spelling.trim().length > 0 &&
    typeof record.count === 'number' &&
    Number.isFinite(record.count)
  );
}
