import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getOptionalUserId } from '@/utils/supabase/roles';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type SpellingList = {
  id: string;
  title: string;
  description: string | null;
  scope_type: string;
  created_at: string;
  updated_at: string;
};

export default async function SpellingListsPage() {
  const supabase = getServiceClient();
  const userId = await getOptionalUserId();

  const { data: lists } = userId
    ? ((await supabase
        .from('spelling_custom_lists')
        .select('id, title, description, scope_type, created_at, updated_at')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false })) as { data: SpellingList[] | null })
    : { data: [] };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-spelling-text">Custom spelling lists</h1>
          <p className="mt-2 text-sm text-spelling-text-muted">
            Create, import, and assign custom word lists for each kid.
          </p>
        </div>
        {userId ? (
          <Link
            href="/lists/new"
            className="inline-flex min-h-[44px] items-center rounded bg-spelling-primary px-4 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover"
          >
            New list
          </Link>
        ) : (
          <div className="rounded border border-dashed border-spelling-border px-4 py-2 text-xs text-spelling-text-muted">
            <p>Sign in to create lists.</p>
            <a
              href="/login"
              className="mt-2 inline-block text-sm font-medium text-spelling-primary hover:underline"
            >
              Sign in
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(lists ?? []).map(list => (
          <Link
            key={list.id}
            href={`/lists/${list.id}`}
            className="rounded-lg border border-spelling-border bg-spelling-surface p-4 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-spelling-text">{list.title}</h2>
              <span className="rounded bg-spelling-lesson-bg px-2 py-1 text-xs text-spelling-text-muted">
                {list.scope_type}
              </span>
            </div>
            {list.description ? (
              <p className="mt-2 text-sm text-spelling-text-muted">{list.description}</p>
            ) : (
              <p className="mt-2 text-sm text-spelling-text-muted">No description yet.</p>
            )}
          </Link>
        ))}
        {lists?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-spelling-border p-6 text-sm text-spelling-text-muted">
            {userId
              ? 'No custom lists yet. Create your first list to get started.'
              : 'Sign in to access custom lists.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
