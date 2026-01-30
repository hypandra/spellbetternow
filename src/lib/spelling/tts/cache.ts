/**
 * TTS Cache Implementation
 *
 * Uses Redis (Upstash/Vercel KV) for server-side caching.
 * Falls back gracefully if Redis is not configured.
 *
 * Cache key format: tts:v1:{model}:{voice}:{speed}:{normalizedText}
 * Cache value: base64-encoded MP3 bytes
 * TTL: 7 days
 * Size limit: 500KB (not cached if larger)
 */

import type { Voice, Speed } from "./generate-audio";

const MAX_CACHE_SIZE = 500 * 1024; // 500KB
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { ex?: number }
  ): Promise<string | null>;
}

let redisClient: RedisClient | null = null;

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function getCacheKey(
  model: string,
  voice: Voice,
  speed: Speed,
  text: string
): string {
  const normalized = normalizeText(text);
  return `tts:v1:${model}:${voice}:${speed}:${normalized}`;
}

async function initRedis(): Promise<RedisClient | null> {
  if (redisClient) {
    return redisClient;
  }

  // Try Upstash Redis first
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const { Redis } = await import("@upstash/redis");
      redisClient = Redis.fromEnv();
      return redisClient;
    } catch (error) {
      console.warn("Failed to initialize Upstash Redis:", error);
    }
  }

  // Try Vercel KV
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const { Redis } = await import("@upstash/redis");
      redisClient = new Redis({
        url: kvUrl,
        token: kvToken,
      });
      return redisClient;
    } catch (error) {
      console.warn("Failed to initialize Vercel KV:", error);
    }
  }

  // No Redis configured - log warning but continue
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "TTS: No Redis configured. Caching disabled. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN to enable caching."
    );
  }

  return null;
}

export async function getCachedAudio(
  model: string,
  voice: Voice,
  speed: Speed,
  text: string
): Promise<Buffer | null> {
  const redis = await initRedis();
  if (!redis) {
    return null;
  }

  try {
    const key = getCacheKey(model, voice, speed, text);
    const cached = await redis.get(key);

    if (cached) {
      return Buffer.from(cached, "base64");
    }
  } catch (error) {
    console.error("Redis get error:", error);
  }

  return null;
}

export async function cacheAudio(
  model: string,
  voice: Voice,
  speed: Speed,
  text: string,
  audioBuffer: Buffer
): Promise<void> {
  // Don't cache if too large
  if (audioBuffer.length > MAX_CACHE_SIZE) {
    return;
  }

  const redis = await initRedis();
  if (!redis) {
    return;
  }

  try {
    const key = getCacheKey(model, voice, speed, text);
    const base64 = audioBuffer.toString("base64");

    await redis.set(key, base64, { ex: CACHE_TTL });
  } catch (error) {
    console.error("Redis set error:", error);
    // Don't throw - caching is best effort
  }
}
