import { NextRequest, NextResponse } from 'next/server';
import type { Word } from '@/lib/spelling/db/words';
import { generateTTS, TTS_MODEL } from '@/lib/spelling/tts/generate-audio';
import { cacheAudio, getCachedAudio } from '@/lib/spelling/tts/cache';

type TtsPayload = {
  word?: Word;
  text?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: 'slow' | 'normal' | 'fast';
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TtsPayload;
    const voice = body.voice ?? 'alloy';
    const speed = body.speed ?? 'normal';
    const input = body.text ?? body.word;

    if (!input) {
      return NextResponse.json({ error: 'text or word is required' }, { status: 400 });
    }

    const cacheKeyInput = typeof input === 'string' ? input : input.word;
    const cached = await getCachedAudio(TTS_MODEL, voice, speed, cacheKeyInput);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-TTS-Model': TTS_MODEL,
        },
      });
    }

    const audioBuffer = await generateTTS(input, voice, speed);
    await cacheAudio(TTS_MODEL, voice, speed, cacheKeyInput, audioBuffer);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-TTS-Model': TTS_MODEL,
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
