import type { SessionResponse } from '@/features/spelling/types/session';

export class SpellingSessionClient {
  static async start(
    kidId: string,
    wordIds?: string[],
    options?: { assessment?: boolean; mode?: 'audio' | 'no-audio'; listId?: string }
  ): Promise<SessionResponse> {
    return this.post('/api/spelling/session/start', {
      kidId,
      wordIds,
      listId: options?.listId,
      assessment: options?.assessment,
      mode: options?.mode,
    });
  }

  static async submit(
    sessionId: string,
    payload: {
      wordId: string;
      userSpelling: string;
      responseMs: number;
      replayCount?: number;
      editCount?: number;
      inputMode?: 'tap_letters' | 'typed';
      advance?: boolean;
    }
  ): Promise<SessionResponse> {
    return this.post('/api/spelling/session/action', {
      sessionId,
      type: 'SUBMIT',
      payload,
    });
  }

  static async continueMiniSet(
    sessionId: string,
    action: 'CONTINUE' | 'CHALLENGE_JUMP' | 'PRACTICE_MISSED'
  ): Promise<SessionResponse> {
    return this.post('/api/spelling/session/action', {
      sessionId,
      type: 'COMPLETE_MINISET',
      payload: { action },
    });
  }

  static async finish(sessionId: string): Promise<SessionResponse> {
    return this.post('/api/spelling/session/action', {
      sessionId,
      type: 'FINISH',
    });
  }

  static async updateKidLevel(kidId: string, level: number): Promise<{ level: number; maxLevel: number }> {
    return this.post('/api/spelling/kid/level', { kidId, level }) as Promise<{
      level: number;
      maxLevel: number;
    }>;
  }

  private static async post(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

    return (await response.json()) as SessionResponse;
  }
}
