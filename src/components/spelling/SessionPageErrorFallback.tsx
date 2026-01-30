'use client';

import { useRouter } from 'next/navigation';

interface SessionPageErrorFallbackProps {
  onRetry: () => void;
  kidId?: string | null;
}

/**
 * Fallback UI for SessionPage component when session errors occur
 */
export function SessionPageErrorFallback({
  onRetry,
  kidId,
}: SessionPageErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900">Session Error</h2>
          <p className="text-gray-600">
            Something went wrong with your spelling session. Don't worry, your progress has been
            saved.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            {kidId ? (
              <button
                onClick={() => router.push(`/session?kidId=${kidId}`)}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Restart Session
              </button>
            ) : (
              <button
                onClick={() => router.push('/app')}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
