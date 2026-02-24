'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SpellingErrorBoundary } from './SpellingErrorBoundary';
import { KidProfileSelectorErrorFallback } from './KidProfileSelectorErrorFallback';
import type { Kid } from '@/lib/spelling/db/kids';

type KidWithLists = Kid & {
  assignedLists?: Array<{ id: string; title: string }>;
};
import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { THEME_CONTENT } from '@/features/spelling/constants/theme-content';

interface KidProfileSelectorProps {
  parentUserId: string;
}

function KidProfileSelectorContent({ parentUserId }: KidProfileSelectorProps) {
  const { theme } = useSpellingTheme();
  const themeContent = THEME_CONTENT[theme];
  const [kids, setKids] = useState<KidWithLists[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKidName, setNewKidName] = useState('');
  const router = useRouter();
  const newKidInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadKids();
  }, [parentUserId]);

  useEffect(() => {
    if (showCreateForm) {
      newKidInputRef.current?.focus();
    }
  }, [showCreateForm]);

  async function loadKids() {
    try {
      setDbError(null);
      const response = await fetch(
        `/api/spelling/kids`
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        const errorMsg = payload.error || 'Failed to load learners';

        throw new Error(errorMsg);
      }

      const payload = (await response.json()) as { kids?: KidWithLists[] };
      const nextKids = payload.kids ?? [];
      setKids(nextKids);
      setLoading(false);
    } catch (error) {
      console.error('Error loading kids:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to database';
      setDbError(errorMsg);
      setLoading(false);
    }
  }

  async function createKid() {
    if (!newKidName.trim()) return;

    try {
      const trimmedName = newKidName.trim();
      const response = await fetch('/api/spelling/kids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: trimmedName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to create kid');
      }

      const payload = (await response.json()) as { kid?: Kid };
      if (!payload.kid) {
        return;
      }
      const newKid = payload.kid;

      setKids(current => [...current, newKid]);
      setNewKidName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating kid:', error);
      setDbError('Failed to create learner');
    }
  }

  function startSession(kidId: string) {
    router.push(`/session?kidId=${kidId}`);
  }

  async function deleteKid(kidId: string, kidName: string) {
    if (!confirm(`Remove ${kidName}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/spelling/kids/${kidId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to delete learner');
      }

      setKids(current => current.filter(k => k.id !== kidId));
    } catch (error) {
      console.error('Error deleting kid:', error);
      setDbError(error instanceof Error ? error.message : 'Failed to delete learner');
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {dbError && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="font-medium">Database temporarily unavailable</p>
              <p className="text-sm mt-1 opacity-80">
                {dbError.includes('schema')
                  ? 'The database is reconnecting. This usually resolves in a few minutes.'
                  : dbError}
              </p>
              <button
                onClick={() => loadKids()}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-spelling-text">Select a Learner</h2>
          <p className="text-sm text-spelling-text-muted mt-1">
            Score updates based on performance.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-spelling-primary text-spelling-surface rounded hover:bg-spelling-primary-hover transition-colors"
        >
          {showCreateForm ? themeContent.buttons.cancelAddKid : themeContent.buttons.addKid}
        </button>
      </div>

      {showCreateForm && (
        <div className="p-4 border border-spelling-border border-[style:var(--spelling-border-style)] rounded bg-spelling-lesson-bg">
          <input
            type="text"
            value={newKidName}
            onChange={e => setNewKidName(e.target.value)}
            placeholder="Learner's name"
            className="w-full px-3 py-2 border border-spelling-border-input border-[style:var(--spelling-border-style)] rounded mb-2 bg-spelling-surface text-spelling-text"
            onKeyDown={e => e.key === 'Enter' && createKid()}
            ref={newKidInputRef}
          />
          <button
            onClick={createKid}
            className="px-4 py-2 bg-spelling-primary text-spelling-surface rounded hover:bg-spelling-primary-hover transition-colors"
          >
            {themeContent.buttons.createKid}
          </button>
        </div>
      )}

      {kids.length === 0 && !showCreateForm && (
        <div className="text-center py-8 text-spelling-text-muted">
          No learners yet. Add your first learner to begin spelling practice.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kids.map(kid => (
          <article
            key={kid.id}
            className="p-6 border border-spelling-border border-[style:var(--spelling-border-style)] rounded-lg bg-spelling-surface text-spelling-text"
            aria-label={`${kid.display_name}, Score ${kid.percentile ?? '—'}`}
          >
            <h3 className="text-xl font-semibold mb-2">{kid.display_name}</h3>
            <p className="text-spelling-text-muted">
              Score {typeof kid.percentile === 'number' ? kid.percentile : '—'}
            </p>
            <button
              onClick={() => startSession(kid.id)}
              className="mt-4 w-full px-4 py-2 bg-spelling-primary text-spelling-surface rounded hover:bg-spelling-primary-hover transition-colors"
            >
              {themeContent.buttons.startSession}
            </button>
            {kid.assignedLists && kid.assignedLists.length > 0 && (
              <div className="mt-2 space-y-1">
                {kid.assignedLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() =>
                      router.push(
                        `/session?kidId=${kid.id}&listId=${list.id}&autoStart=1`
                      )
                    }
                    className="w-full px-4 py-2 text-sm bg-spelling-secondary text-spelling-text rounded hover:bg-spelling-tertiary transition-colors text-left flex items-center gap-2"
                  >
                    <span className="inline-block rounded bg-spelling-primary/15 px-1.5 py-0.5 text-xs font-medium text-spelling-primary">List</span>
                    Study: {list.title}
                  </button>
                ))}
              </div>
            )}
            <Link
              href={`/progress?kidId=${kid.id}`}
              className="mt-2 block w-full px-4 py-2 bg-spelling-secondary text-spelling-text rounded hover:bg-spelling-tertiary transition-colors text-center"
            >
              {themeContent.buttons.viewProgress}
            </Link>
            <button
              onClick={() => deleteKid(kid.id, kid.display_name)}
              className="mt-2 w-full px-4 py-2 text-sm text-spelling-text-muted hover:text-red-600 transition-colors"
            >
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function KidProfileSelector({ parentUserId }: KidProfileSelectorProps) {
  return (
    <SpellingErrorBoundary
      componentName="KidProfileSelector"
      fallback={<KidProfileSelectorErrorFallback onRetry={() => window.location.reload()} />}
    >
      <KidProfileSelectorContent parentUserId={parentUserId} />
    </SpellingErrorBoundary>
  );
}
