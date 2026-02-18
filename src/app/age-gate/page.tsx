'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Decision = 'under_13' | '13_plus';

export default function AgeGatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitDecision(decision: Decision) {
    setLoading(decision);
    setError(null);

    try {
      const response = await fetch('/api/age-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        nextPath?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save age gate choice.');
      }

      router.push(payload.nextPath || (decision === '13_plus' ? '/landing' : '/under-13'));
      router.refresh();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unable to save age gate choice.';
      setError(message);
      setLoading(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-spelling-border bg-spelling-surface p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-spelling-text-muted">
          SpellBetterNow
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-spelling-text">Age Check Required</h1>
        <p className="mt-4 text-sm text-spelling-text-muted">
          To reduce COPPA risk, SpellBetterNow only allows account features for ages 13 and up.
          Please choose an option to continue.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => submitDecision('under_13')}
            disabled={loading !== null}
            className="rounded-xl border border-spelling-border bg-spelling-accent px-4 py-4 text-left text-sm text-spelling-text transition hover:border-spelling-primary disabled:opacity-60"
          >
            <div className="font-semibold">I am under 13</div>
            <div className="mt-1 text-spelling-text-muted">
              Account-based features will be blocked.
            </div>
          </button>
          <button
            type="button"
            onClick={() => submitDecision('13_plus')}
            disabled={loading !== null}
            className="rounded-xl border border-spelling-primary bg-spelling-primary px-4 py-4 text-left text-sm text-spelling-surface transition hover:bg-spelling-primary-hover disabled:opacity-60"
          >
            <div className="font-semibold">I am 13 or older</div>
            <div className="mt-1 text-white/80">Continue to sign up or sign in.</div>
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded border border-spelling-error-text/30 bg-spelling-error-bg p-3 text-sm text-spelling-error-text">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
