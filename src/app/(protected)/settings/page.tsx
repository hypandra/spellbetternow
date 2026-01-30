'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function SettingsPage() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setSuccess(null);

    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.');
      return;
    }

    if (!password.trim()) {
      setError('Enter your password to delete the account.');
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.deleteUser({
        password: password.trim(),
        callbackURL: '/landing',
      });

      if (result?.error) {
        const message = result.error.message || 'Unable to delete account.';
        setError(message);
        setLoading(false);
        return;
      }

      setSuccess('Account deleted. Redirecting...');
      setTimeout(() => {
        router.replace('/landing');
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete account.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-spelling-text">Settings</h1>
          <p className="mt-2 text-sm text-spelling-text-muted">
            Manage your parent account and data.
          </p>
        </div>
        <Link
          href="/app"
          className="text-sm px-4 py-2 rounded-full border border-spelling-border text-spelling-text hover:border-spelling-primary"
        >
          Dashboard
        </Link>
      </div>

      <div className="mt-10 rounded-2xl border border-spelling-border bg-spelling-surface p-6">
        <h2 className="text-xl font-semibold text-spelling-text">Delete account</h2>
        <p className="mt-2 text-sm text-spelling-text-muted">
          This will permanently remove your account, learners, and spelling history. This action
          cannot be undone.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-spelling-text">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={event => setConfirmText(event.target.value)}
              className="mt-2 w-full rounded-lg border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text focus:border-spelling-primary focus:outline-none"
              placeholder="DELETE"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spelling-text">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text focus:border-spelling-primary focus:outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-spelling-error-text/30 bg-spelling-error-bg px-4 py-3 text-sm text-spelling-error-text">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-spelling-success-text/30 bg-spelling-success-bg px-4 py-3 text-sm text-spelling-success-text">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="w-full rounded-lg bg-spelling-primary px-4 py-3 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover disabled:opacity-60"
          >
            {loading ? 'Deleting...' : 'Delete account'}
          </button>
        </div>
      </div>
    </div>
  );
}
