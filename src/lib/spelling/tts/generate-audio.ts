import type { Word } from '@/lib/spelling/db/words';
import { buildSpellingBeeAnnouncement } from '@/lib/spelling/tts/build-announcement';

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type Speed = 'slow' | 'normal' | 'fast';

const speedMap: Record<Speed, number> = {
  slow: 0.8,
  normal: 1.0,
  fast: 1.2,
};

const DEFAULT_MODEL = 'tts-1';
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || DEFAULT_MODEL;

export async function generateTTS(
  input: Word | string,
  voice: Voice = 'alloy',
  speed: Speed = 'normal'
): Promise<Buffer> {
  const announcement = typeof input === 'string' ? input : buildSpellingBeeAnnouncement(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input: announcement,
      speed: speedMap[speed],
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Failed to read TTS error');
    throw new Error(`TTS request failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
