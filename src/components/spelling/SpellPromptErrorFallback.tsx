'use client';

import { useRouter } from 'next/navigation';

interface SpellPromptErrorFallbackProps {
  onRetry: () => void;
  word?: string;
}

/**
 * Fallback UI for SpellPrompt component when TTS/audio fails
 */
export function SpellPromptErrorFallback({
  onRetry,
  word,
}: SpellPromptErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">🔇</div>
        <h2 className="text-2xl font-semibold text-gray-900">Audio Error</h2>
        <p className="text-gray-600">
          {word
            ? `We couldn't play the audio for "${word}". This might be a temporary issue.`
            : "We couldn't play the word audio. This might be a temporary issue."}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/app')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          If this problem persists, please check your internet connection or try refreshing the
          page.
        </p>
      </div>
    </div>
  );
}
