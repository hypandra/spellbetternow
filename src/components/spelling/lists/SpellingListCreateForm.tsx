'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SpellingListCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState('personal');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/spelling/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          scopeType,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to create list.');
        return;
      }

      const payload = (await response.json()) as { list?: { id?: string } };
      const listId = payload.list?.id;
      if (listId) {
        router.push(`/lists/${listId}`);
        router.refresh();
      } else {
        setError('List created, but no ID returned.');
      }
    } catch (err) {
      console.error('[Spelling List Create] Error:', err);
      setError('Failed to create list.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-spelling-border bg-spelling-surface p-6"
    >
      <div>
        <label className="block text-sm font-medium text-spelling-text">Title</label>
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          className="mt-2 w-full rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text"
          placeholder="e.g. Fall spelling list"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-spelling-text">Description</label>
        <textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          className="mt-2 w-full rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text"
          rows={3}
          placeholder="Optional notes for this list"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-spelling-text">Scope</label>
        <select
          value={scopeType}
          onChange={event => setScopeType(event.target.value)}
          className="mt-2 w-full rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-sm text-spelling-text"
        >
          <option value="personal">Personal</option>
          <option value="classroom">Classroom</option>
        </select>
      </div>
      {error ? <p className="text-sm text-spelling-error-text">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-spelling-primary px-4 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? 'Creating...' : 'Create list'}
      </button>
    </form>
  );
}
