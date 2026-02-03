'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Word } from '@/lib/spelling/db/words';
import { buildSpellingBeeAnnouncement } from '@/lib/spelling/tts/build-announcement';
import type { InputMode, SpellingPromptData } from '@/features/spelling/types/session';
import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { THEME_CONTENT } from '@/features/spelling/constants/theme-content';
import { computeSpellingDiff, type SpellingDiffResult } from '@/lib/spelling/errors/spelling-diff';
import { maskWordInSentence, randomizePlaceholderLength } from '@/lib/spelling/mask-sentence';
import SpellingErrorDiff from './SpellingErrorDiff';

interface SpellPromptProps {
  word: Word;
  wordIndex: number;
  prompt: SpellingPromptData | null;
  onSubmit: (
    wordId: string,
    userSpelling: string,
    responseMs: number,
    options?: {
      inputMode?: InputMode;
      replayCount?: number;
      editCount?: number;
      advance?: boolean;
    }
  ) => Promise<void>;
  audioUnlocked?: boolean;
  onRequestUnlock?: () => void;
}

const CACHE_NAME = 'hypandra-tts-v1';
// Model should match OPENAI_TTS_MODEL env var default ('tts-1') on the server
const DEFAULT_TTS_MODEL = 'tts-1';
const MODEL_STORAGE_KEY = 'hypandra-tts-model';
const MODEL_TTL_MS = 24 * 60 * 60 * 1000;

type ModelCacheEntry = {
  model: string;
  updatedAt: number;
};

function readModelCacheEntry(): ModelCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ModelCacheEntry;
    if (!parsed?.model || !parsed?.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeModelCacheEntry(model: string): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: ModelCacheEntry = { model, updatedAt: Date.now() };
    window.localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

function isModelCacheFresh(entry: ModelCacheEntry | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.updatedAt <= MODEL_TTL_MS;
}

function getCacheKey(text: string, voice: string, speed: string, model: string = DEFAULT_TTS_MODEL): string {
  const params = new URLSearchParams({ 
    word: text.toLowerCase(), 
    voice, 
    speed,
    model 
  });
  return `/__tts_cache?${params.toString()}`;
}

async function getCachedAudio(
  text: string, 
  voice: string, 
  speed: string, 
  model: string = DEFAULT_TTS_MODEL
): Promise<Blob | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = getCacheKey(text, voice, speed, model);
    const request = new Request(cacheKey);
    const cached = await cache.match(request);

    if (cached) {
      return await cached.blob();
    }
  } catch (error) {
    console.warn('Cache API error:', error);
  }

  return null;
}

async function cacheAudio(
  text: string,
  voice: string,
  speed: string,
  response: Response,
  model: string = DEFAULT_TTS_MODEL
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = getCacheKey(text, voice, speed, model);
    const request = new Request(cacheKey);
    await cache.put(request, response);
  } catch (error) {
    console.warn('Cache API put error:', error);
  }
}

type SpellPromptResult = {
  correct: boolean;
  correctSpelling: string;
  userSpelling: string;
  errorDetails?: SpellingDiffResult;
};

type ThemeContent = (typeof THEME_CONTENT)[keyof typeof THEME_CONTENT];

interface ResultBannerProps {
  result: SpellPromptResult | null;
  themeContent: ThemeContent;
}

interface TapLettersPanelProps {
  targetLength: number;
  userSpelling: string;
  letterTray: string[];
  hasPlayed: boolean;
  isSubmitting: boolean;
  isPlaying: boolean;
  requiresCorrectSpelling: boolean;
  isCorrectMatch: boolean;
  result: SpellPromptResult | null;
  themeContent: ThemeContent;
  appendLetter: (letter: string) => void;
  undoLetter: () => void;
  clearAnswer: () => void;
  playWord: () => void;
  onSubmit: () => void;
}

interface TypedInputPanelProps {
  userSpelling: string;
  hasPlayed: boolean;
  isSubmitting: boolean;
  isPlaying: boolean;
  listenPlaceholder: string;
  requiresCorrectSpelling: boolean;
  isCorrectMatch: boolean;
  result: SpellPromptResult | null;
  themeContent: ThemeContent;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onUserSpellingChange: (value: string) => void;
  onSubmit: () => void;
  onReplay: () => void;
}

interface UseSpellPromptSubmissionOptions {
  word: Word;
  prompt: SpellingPromptData | null;
  inputMode: InputMode;
  targetLength: number;
  letterTray: string[];
  hasPlayed: boolean;
  replayCount: number;
  startTime: number;
  stopAudio: () => void;
  playWord: () => void;
  onSubmit: SpellPromptProps['onSubmit'];
}

function ResultBanner({ result, themeContent }: ResultBannerProps) {
  if (!result) return null;

  return (
    <div
      className={`p-4 rounded-lg ${
        result.correct
          ? 'bg-spelling-success-bg text-spelling-success-text'
          : 'bg-spelling-error-bg text-spelling-error-text'
      }`}
    >
      {result.correct ? (
        <p className="font-semibold">{themeContent.correctFeedback}</p>
      ) : (
        <>
          <p className="font-semibold">{themeContent.incorrectFeedback}</p>
          <p className="text-sm mt-1">
            Spell it correctly above and then press Enter to continue.
          </p>
          {result.errorDetails ? (
            <SpellingErrorDiff
              ops={result.errorDetails.ops}
              summary={result.errorDetails.summary}
              correctSpelling={result.correctSpelling}
              userSpelling={result.userSpelling}
            />
          ) : (
            <p>
              Correct spelling: <strong>{result.correctSpelling}</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TapLettersPanel({
  targetLength,
  userSpelling,
  letterTray,
  hasPlayed,
  isSubmitting,
  isPlaying,
  requiresCorrectSpelling,
  isCorrectMatch,
  result,
  themeContent,
  appendLetter,
  undoLetter,
  clearAnswer,
  playWord,
  onSubmit,
}: TapLettersPanelProps) {
  const canSubmit =
    hasPlayed &&
    Boolean(userSpelling.trim()) &&
    !isSubmitting &&
    (!requiresCorrectSpelling || isCorrectMatch);

  return (
    <div className="space-y-6">
      <div className="text-sm text-spelling-text-muted">Tap letters (or type)</div>

      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: targetLength }).map((_, index) => {
          const letter = userSpelling[index]?.toUpperCase() ?? '';
          return (
            <div
              key={`slot-${index}`}
              className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-spelling-border-input border-[style:var(--spelling-border-style)] bg-spelling-surface text-3xl font-semibold text-spelling-text"
            >
              {letter}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-3 justify-items-center" role="group" aria-label="Letter choices">
        {letterTray.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            onClick={() => appendLetter(letter)}
            disabled={!hasPlayed || isSubmitting}
            aria-label={`Add letter ${letter.toUpperCase()}`}
            className="h-16 w-16 rounded-xl bg-spelling-primary text-spelling-surface text-3xl font-semibold hover:bg-spelling-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={undoLetter}
          type="button"
          disabled={isSubmitting}
          className="px-6 py-3 bg-spelling-secondary text-spelling-text rounded-lg text-lg hover:bg-spelling-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {themeContent.buttons.undo}
        </button>
        <button
          onClick={clearAnswer}
          type="button"
          disabled={isSubmitting}
          className="px-6 py-3 bg-spelling-secondary text-spelling-text rounded-lg text-lg hover:bg-spelling-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {themeContent.buttons.clear}
        </button>
        <button
          onClick={playWord}
          disabled={isPlaying}
          className="px-6 py-3 bg-spelling-accent text-spelling-text rounded-lg text-lg hover:bg-spelling-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {themeContent.buttons.replay}
        </button>
        {userSpelling.trim() && (
          <button
            onClick={onSubmit}
            type="button"
            disabled={!canSubmit}
            className="px-6 py-3 bg-spelling-primary text-spelling-surface rounded-lg text-lg hover:bg-spelling-primary-hover disabled:bg-spelling-tertiary disabled:cursor-not-allowed"
          >
            {requiresCorrectSpelling ? 'Continue' : themeContent.buttons.submit}
          </button>
        )}
      </div>

      <div className="text-xs text-center text-spelling-text-muted">
        Press Space to listen again
        {userSpelling.trim() ? (
          <span>
            {' '}• Press Enter to {requiresCorrectSpelling ? 'continue' : 'check spelling'}
          </span>
        ) : null}
      </div>

      <ResultBanner result={result} themeContent={themeContent} />
    </div>
  );
}

function TypedInputPanel({
  userSpelling,
  hasPlayed,
  isSubmitting,
  isPlaying,
  listenPlaceholder,
  requiresCorrectSpelling,
  isCorrectMatch,
  result,
  themeContent,
  inputRef,
  onUserSpellingChange,
  onSubmit,
  onReplay,
}: TypedInputPanelProps) {
  return (
    <div className="space-y-4">
      <input
        type="text"
        value={userSpelling}
        onChange={event => onUserSpellingChange(event.target.value)}
        ref={inputRef}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === 'ArrowRight') {
            event.preventDefault();
            if (!requiresCorrectSpelling || isCorrectMatch) {
              onSubmit();
            }
          }
        }}
        placeholder={listenPlaceholder}
        aria-label="Type the spelling you heard"
        className="w-full px-4 py-3 text-xl border-2 border-spelling-border-input border-[style:var(--spelling-border-style)] rounded-lg disabled:bg-spelling-neutral disabled:cursor-not-allowed focus:outline-none focus:border-spelling-primary"
        autoFocus
      />

      <ResultBanner result={result} themeContent={themeContent} />

      <div className="flex gap-4 justify-center">
        <button
          onClick={onReplay}
          disabled={isPlaying}
          className="px-6 py-3 bg-spelling-accent text-spelling-text rounded-lg hover:bg-spelling-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {themeContent.buttons.replay}
        </button>
        <button
          onClick={onSubmit}
          disabled={
            !hasPlayed ||
            !userSpelling.trim() ||
            isSubmitting ||
            (requiresCorrectSpelling && !isCorrectMatch)
          }
          className="px-6 py-3 bg-spelling-primary text-spelling-surface rounded-lg hover:bg-spelling-primary-hover disabled:bg-spelling-tertiary disabled:cursor-not-allowed"
        >
          {requiresCorrectSpelling ? 'Continue' : themeContent.buttons.submit}
        </button>
      </div>
      <div className="text-xs text-center text-spelling-text-muted">
        Press Space to listen again • Press Enter to {requiresCorrectSpelling ? 'continue' : 'check spelling'}
      </div>
    </div>
  );
}

function useSpellPromptAudio(word: Word, promptId: string, inputMode: InputMode, audioUnlocked: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const isPlayingRef = useRef(false);
  const hasPlayedRef = useRef(false);

  const setPlayingState = useCallback((value: boolean) => {
    isPlayingRef.current = value;
    setIsPlaying(value);
  }, []);

  const setHasPlayedState = useCallback((value: boolean) => {
    hasPlayedRef.current = value;
    setHasPlayed(value);
  }, []);

  const resetAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setHasPlayedState(false);
    setReplayCount(0);
    setStartTime(0);
    setPlayingState(false);
  }, [setHasPlayedState, setPlayingState]);

  const stopAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = '';
    audioRef.current = null;
    setPlayingState(false);
  }, [setPlayingState]);

  const announcement = useMemo(
    () => buildSpellingBeeAnnouncement(word),
    [word.definition, word.example_sentence, word.word, inputMode]
  );

  const playWord = useCallback(async () => {
    if (isPlayingRef.current) return;

    setPlayingState(true);

    try {
      const voice = 'alloy';
      const speed = 'normal';
      const cachedModelEntry = readModelCacheEntry();
      const model = cachedModelEntry?.model || DEFAULT_TTS_MODEL;
      const shouldUseCache = isModelCacheFresh(cachedModelEntry);

      let blob: Blob | null = shouldUseCache
        ? await getCachedAudio(announcement, voice, speed, model)
        : null;
      let response: Response | null = null;

      if (!blob) {
        response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, voice, speed }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate audio');
        }

        const responseForCache = response.clone();
        const responseModel = response.headers.get('X-TTS-Model') || model;
        blob = await response.blob();

        if (!cachedModelEntry || cachedModelEntry.model !== responseModel) {
          writeModelCacheEntry(responseModel);
          if (cachedModelEntry) {
            try {
              await caches.delete(CACHE_NAME);
            } catch (error) {
              console.warn('Cache API delete error:', error);
            }
          }
        }

        await cacheAudio(announcement, voice, speed, responseForCache, responseModel);
      }

      if (!blob) {
        throw new Error('No audio blob available');
      }

      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingState(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlayingState(false);
      };

      await audio.play();

      if (!hasPlayedRef.current) {
        setStartTime(Date.now());
        setHasPlayedState(true);
      } else {
        setReplayCount(count => count + 1);
      }
    } catch (error) {
      console.error('Error playing word:', error);
      setPlayingState(false);
    }
  }, [announcement, setHasPlayedState, setPlayingState, word]);

  const playWordRef = useRef(playWord);

  useEffect(() => {
    playWordRef.current = playWord;
  }, [playWord]);

  useEffect(() => {
    resetAudio();
    if (audioUnlocked) {
      void playWordRef.current();
    }
  }, [promptId, resetAudio, word.id, audioUnlocked]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return { playWord, stopAudio, isPlaying, hasPlayed, replayCount, startTime };
}

function useSpellPromptSubmission({
  word,
  prompt,
  inputMode,
  targetLength,
  letterTray,
  hasPlayed,
  replayCount,
  startTime,
  stopAudio,
  playWord,
  onSubmit,
}: UseSpellPromptSubmissionOptions) {
  const [userSpelling, setUserSpelling] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SpellPromptResult | null>(null);
  const [requiresCorrectSpelling, setRequiresCorrectSpelling] = useState(false);
  const requiresCorrectSpellingRef = useRef(false);
  const isCorrectMatchRef = useRef(false);
  const submitLockRef = useRef(false);
  const promptIdRef = useRef(prompt?.prompt_id ?? word.id);
  const prevWordIdRef = useRef<string | undefined>(undefined);

  const letterTrayCounts = useMemo(() => {
    return letterTray.reduce<Record<string, number>>((accumulator, letter) => {
      const normalized = letter.toLowerCase();
      accumulator[normalized] = (accumulator[normalized] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [letterTray]);
  const isCorrectMatch = userSpelling.trim().toLowerCase() === word.word.trim().toLowerCase();

  useEffect(() => {
    requiresCorrectSpellingRef.current = requiresCorrectSpelling;
  }, [requiresCorrectSpelling]);

  useEffect(() => {
    isCorrectMatchRef.current = isCorrectMatch;
  }, [isCorrectMatch]);

  const setSubmittingState = useCallback((value: boolean) => {
    submitLockRef.current = value;
    setIsSubmitting(value);
  }, []);

  useEffect(() => {
    const currentWordId = word.id;
    const isNewWord = currentWordId !== prevWordIdRef.current;

    setUserSpelling('');
    setResult(null);
    setSubmittingState(false);

    // Only reset retry requirement if this is actually a new word
    if (isNewWord) {
      setRequiresCorrectSpelling(false);
    }

    promptIdRef.current = prompt?.prompt_id ?? word.id;
    prevWordIdRef.current = currentWordId;
  }, [prompt?.prompt_id, setSubmittingState, word.id]);

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    if (!hasPlayed || !userSpelling.trim()) return;

    const trimmedSpelling = userSpelling.trim();
    const normalizedSpelling = trimmedSpelling.toLowerCase();
    const normalizedTarget = word.word.trim().toLowerCase();
    const isCorrect = normalizedSpelling === normalizedTarget;
    const errorDetails = isCorrect
      ? undefined
      : computeSpellingDiff(word.word, trimmedSpelling);
    setResult({
      correct: isCorrect,
      correctSpelling: word.word,
      userSpelling: trimmedSpelling,
      errorDetails,
    });
    stopAudio();

    if (!isCorrect) {
      setRequiresCorrectSpelling(true);
      void onSubmit(word.id, trimmedSpelling, Date.now() - startTime, {
        inputMode,
        replayCount,
        advance: false,
      });
      return;
    }

    setRequiresCorrectSpelling(false);
    setSubmittingState(true);
    const responseMs = Date.now() - startTime;
    const promptIdAtSubmit = promptIdRef.current;

    await onSubmit(word.id, userSpelling, responseMs, {
      inputMode,
      replayCount,
      // editCount intentionally omitted for tap_letters (discrete taps/undo UI).
    });

    if (promptIdRef.current === promptIdAtSubmit) {
      setSubmittingState(false);
    }

  }, [
    hasPlayed,
    inputMode,
    onSubmit,
    replayCount,
    stopAudio,
    setSubmittingState,
    startTime,
    userSpelling,
    word.id,
    word.word,
  ]);

  const appendLetter = useCallback(
    (letter: string) => {
      if (!hasPlayed || submitLockRef.current) return;
      setUserSpelling(current => {
        if (current.length >= targetLength) return current;
        const normalized = letter.toLowerCase();
        const availableCount = letterTrayCounts[normalized] ?? 0;
        if (availableCount === 0) return current;
        let usedCount = 0;
        for (const char of current) {
          if (char.toLowerCase() === normalized) {
            usedCount += 1;
          }
        }
        if (usedCount >= availableCount) return current;
        return `${current}${normalized}`;
      });
    },
    [hasPlayed, letterTrayCounts, targetLength]
  );

  const undoLetter = useCallback(() => {
    if (submitLockRef.current) return;
    setUserSpelling(current => current.slice(0, -1));
  }, []);

  const clearAnswer = useCallback(() => {
    if (submitLockRef.current) return;
    setUserSpelling('');
  }, []);

  useEffect(() => {
    if (inputMode !== 'tap_letters') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === 'button' || tagName === 'input' || tagName === 'textarea') return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        undoLetter();
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        playWord();
        return;
      }
      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        if (
          userSpelling.trim() &&
          (!requiresCorrectSpellingRef.current || isCorrectMatchRef.current)
        ) {
          event.preventDefault();
          void handleSubmit();
        }
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        appendLetter(event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appendLetter, handleSubmit, inputMode, playWord, targetLength, undoLetter, userSpelling]);

  return {
    userSpelling,
    setUserSpelling,
    isSubmitting,
    result,
    requiresCorrectSpelling,
    handleSubmit,
    appendLetter,
    undoLetter,
    clearAnswer,
  };
}

export default function SpellPrompt({ word, wordIndex, prompt, onSubmit, audioUnlocked = false, onRequestUnlock }: SpellPromptProps) {
  const { theme } = useSpellingTheme();
  const themeContent = THEME_CONTENT[theme];
  const listenPlaceholder = 'Type the spelling you heard';
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const inputMode: InputMode = prompt?.input_mode ?? 'typed';
  const targetLength = prompt?.target_length ?? word.word.length;
  const letterTray = prompt?.letter_tray ?? [];
  const isTapLetters = inputMode === 'tap_letters';
  const promptId = prompt?.prompt_id ?? word.id;
  const maskedExampleSentence = useMemo(() => {
    if (!word.example_sentence) return '';
    const placeholderLength = randomizePlaceholderLength(word.word.length);
    return maskWordInSentence(word.example_sentence, word.word, placeholderLength);
  }, [word.example_sentence, word.word]);

  const { playWord, stopAudio, isPlaying, hasPlayed, replayCount, startTime } = useSpellPromptAudio(
    word,
    promptId,
    inputMode,
    audioUnlocked
  );
  const {
    userSpelling,
    setUserSpelling,
    isSubmitting,
    result,
    requiresCorrectSpelling,
    handleSubmit,
    appendLetter,
    undoLetter,
    clearAnswer,
  } = useSpellPromptSubmission({
    word,
    prompt,
    inputMode,
    targetLength,
    letterTray,
    hasPlayed,
    replayCount,
    startTime,
    stopAudio,
    playWord,
    onSubmit,
  });

  useEffect(() => {
    if (isTapLetters) {
      playButtonRef.current?.focus();
      return;
    }
    inputRef.current?.focus();
  }, [isTapLetters, prompt?.prompt_id, word.id]);

  useEffect(() => {
    if (result?.correct === false) {
      inputRef.current?.focus();
    }
  }, [result?.correct]);

  useEffect(() => {
    if (inputMode === 'tap_letters') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'button') return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        playWord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMode, playWord]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center space-y-6">
        <div className="text-sm text-spelling-text-muted">Word {wordIndex + 1} of 5</div>

        <button
          onClick={() => {
            onRequestUnlock?.();
            playWord();
          }}
          disabled={isPlaying}
          className="text-6xl p-8 bg-spelling-primary text-spelling-surface rounded-full hover:bg-spelling-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Play word"
          ref={playButtonRef}
        >
          {themeContent.playIcon}
        </button>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isPlaying ? 'Word is playing' : hasPlayed ? 'Ready to spell' : ''}
        </div>

        {!audioUnlocked && !hasPlayed && (
          <div className="text-sm text-spelling-text-muted" aria-hidden="true">Tap to hear the word</div>
        )}
        {isPlaying && <div className="text-sm text-spelling-text-muted" aria-hidden="true">Playing...</div>}

        {(word.definition || word.example_sentence) && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-spelling-text">Listen and spell</p>
            {word.definition && (
              <p className="text-sm text-spelling-text-muted">{word.definition}</p>
            )}
            {word.example_sentence && (
              <p className="text-sm text-spelling-text-muted italic whitespace-pre-wrap">
                "{maskedExampleSentence}"
              </p>
            )}
          </div>
        )}

        {replayCount > 0 && !isPlaying && (
          <div className="text-sm text-spelling-text-muted">
            Replayed {replayCount} time{replayCount !== 1 ? 's' : ''}
          </div>
        )}

        {isTapLetters ? (
          <TapLettersPanel
            targetLength={targetLength}
            userSpelling={userSpelling}
            letterTray={letterTray}
            hasPlayed={hasPlayed}
            isSubmitting={isSubmitting}
            isPlaying={isPlaying}
            requiresCorrectSpelling={requiresCorrectSpelling}
            isCorrectMatch={userSpelling.trim().toLowerCase() === word.word.trim().toLowerCase()}
            result={result}
            themeContent={themeContent}
            appendLetter={appendLetter}
            undoLetter={undoLetter}
            clearAnswer={clearAnswer}
            playWord={playWord}
            onSubmit={handleSubmit}
          />
        ) : (
          <TypedInputPanel
            userSpelling={userSpelling}
            hasPlayed={hasPlayed}
            isSubmitting={isSubmitting}
            isPlaying={isPlaying}
            listenPlaceholder={listenPlaceholder}
            requiresCorrectSpelling={requiresCorrectSpelling}
            isCorrectMatch={userSpelling.trim().toLowerCase() === word.word.trim().toLowerCase()}
            result={result}
            themeContent={themeContent}
            inputRef={inputRef}
            onUserSpellingChange={setUserSpelling}
            onSubmit={handleSubmit}
            onReplay={playWord}
          />
        )}
      </div>
    </div>
  );
}
