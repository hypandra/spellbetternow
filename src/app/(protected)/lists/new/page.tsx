import Link from 'next/link';
import { getOptionalUserId } from '@/utils/supabase/roles';
import SpellingListCreateForm from '@/components/spelling/lists/SpellingListCreateForm';

export default async function SpellingListsNewPage() {
  const userId = await getOptionalUserId();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/lists"
        className="text-sm text-spelling-text-muted hover:text-spelling-text"
      >
        ← Back to lists
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-spelling-text">Create a custom list</h1>
      <p className="mt-2 text-sm text-spelling-text-muted">
        Give your list a name and a quick description so it is easy to reuse.
      </p>
      <div className="mt-6">
        {userId ? (
          <SpellingListCreateForm />
        ) : (
          <div className="rounded border border-dashed border-spelling-border p-4 text-sm text-spelling-text-muted">
            Sign in to create custom lists. TODO: BetterAuth.
          </div>
        )}
      </div>
    </div>
  );
}
