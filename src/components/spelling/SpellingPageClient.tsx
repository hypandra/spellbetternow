'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List } from 'lucide-react';
import KidProfileSelector from '@/components/spelling/KidProfileSelector';
import { useSession } from '@/lib/auth-client';

export default function SpellingPageClient() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-spelling-text-muted">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-spelling-border bg-spelling-surface p-6 text-spelling-text">
          <p className="text-lg font-semibold">Sign in to continue</p>
          <p className="text-sm text-spelling-text-muted mt-2">
            Create learner profiles and track progress across sessions.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center rounded bg-spelling-primary px-4 py-2 text-sm text-spelling-surface hover:bg-spelling-primary-hover transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-spelling-text">Dashboard</h1>
          <p className="text-sm text-spelling-text-muted">
            Choose a learner to start a spelling session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/lists"
            className="inline-flex items-center text-sm px-4 py-2 rounded-full border border-spelling-border text-spelling-text hover:border-spelling-primary"
          >
            <List className="h-4 w-4 mr-1.5" />
            Custom lists
          </Link>
          {pathname !== '/settings' && (
            <Link
              href="/settings"
              className="text-sm px-4 py-2 rounded-full border border-spelling-border text-spelling-text hover:border-spelling-primary"
            >
              Settings
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-spelling-text-muted mb-6">
        Adaptive 5-word sets that adjust to skill level. Letter-by-letter error feedback shows exactly what needs work.
      </p>
      <KidProfileSelector parentUserId={session.user.id} />
      <div className="mt-8 pt-6 border-t border-spelling-border">
        <Link
          href="/walkthrough"
          className="text-sm text-spelling-text-muted hover:text-spelling-text transition-colors"
        >
          How error feedback works
        </Link>
      </div>
    </div>
  );
}
