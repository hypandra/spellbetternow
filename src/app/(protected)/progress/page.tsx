'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import KidHistoryPanel from '@/components/spelling/KidHistoryPanel';
import KidScorePanel from '@/components/spelling/KidScorePanel';

function ProgressPageContent() {
  const searchParams = useSearchParams();
  const kidId = searchParams.get('kidId');
  const [kidName, setKidName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'words' | 'score'>('words');

  useEffect(() => {
    if (!kidId) {
      setLoading(false);
      return;
    }

    async function loadKid() {
      try {
        const response = await fetch(`/api/spelling/kids/${kidId}`);

        if (response.ok) {
          const data = await response.json();
          setKidName(data.kid?.display_name ?? null);
        }
      } catch {
        // Keep fallback state
      } finally {
        setLoading(false);
      }
    }

    loadKid();
  }, [kidId]);

  if (!kidId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-spelling-text-muted">No learner selected.</p>
        <Link href="/app" className="text-spelling-primary hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          {loading ? (
            <div className="h-8 w-32 bg-spelling-secondary rounded animate-pulse" />
          ) : (
            <h1 className="text-2xl font-semibold text-spelling-text">
              {kidName ? `${kidName}'s Progress` : 'Progress'}
            </h1>
          )}
        </div>
        <Link
          href="/app"
          className="px-4 py-2 text-spelling-text-muted hover:text-spelling-text transition-colors"
        >
          Dashboard
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2 border-b border-spelling-border">
        <button
          type="button"
          onClick={() => setActiveTab('words')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'words'
              ? 'text-spelling-text border-b-2 border-spelling-primary'
              : 'text-spelling-text-muted hover:text-spelling-text'
          }`}
        >
          Words
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('score')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'score'
              ? 'text-spelling-text border-b-2 border-spelling-primary'
              : 'text-spelling-text-muted hover:text-spelling-text'
          }`}
        >
          Score
        </button>
      </div>

      {activeTab === 'words' ? (
        <>
          <p className="text-sm text-spelling-text-muted mt-6">
            Track accuracy and identify words needing practice.
          </p>
          <KidHistoryPanel kidId={kidId} />
        </>
      ) : (
        <>
          <p className="text-sm text-spelling-text-muted mt-6">
            See score changes over time based on each spelling attempt.
          </p>
          <KidScorePanel kidId={kidId} />
        </>
      )}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <ProgressPageContent />
    </Suspense>
  );
}
