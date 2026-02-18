import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getOptionalUserId } from '@/utils/supabase/roles';
import SpellingListAssignmentPanel from '@/components/spelling/lists/SpellingListAssignmentPanel';
import SpellingQuickAddWordForm from '@/components/spelling/lists/SpellingQuickAddWordForm';

type ListItem = {
  id: string;
  word_text: string;
  word_display: string;
  is_active: boolean;
  created_at: string;
};

type Kid = {
  id: string;
  display_name: string;
  level_current: number;
};

type Assignment = {
  kid_id: string;
  is_enabled: boolean | null;
  weight: number | null;
};

export default async function SpellingListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const supabase = await createClient();
  const userId = await getOptionalUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/lists"
          className="inline-flex min-h-[44px] items-center text-sm text-spelling-text-muted hover:text-spelling-text"
        >
          ← Back to lists
        </Link>
        <div className="mt-6 rounded border border-dashed border-spelling-border p-4 text-sm text-spelling-text-muted">
          <p>Sign in to view this list.</p>
          <a
            href="/login"
            className="mt-2 inline-block text-sm font-medium text-spelling-primary hover:underline"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const { data: list, error: listError } = await supabase
    .from('spelling_custom_lists')
    .select('id, owner_user_id, title, description, scope_type, created_at, updated_at')
    .eq('id', listId)
    .maybeSingle();

  if (listError || !list || list.owner_user_id !== userId) {
    notFound();
  }

  const [{ data: items }, { data: kids }, { data: assignments }] = (await Promise.all([
    supabase
      .from('spelling_custom_list_items')
      .select('id, word_text, word_display, is_active, created_at')
      .eq('list_id', listId)
      .order('word_text', { ascending: true }),
    supabase
      .from('spelling_kids')
      .select('id, display_name, level_current')
      .or(`parent_user_id.eq.${userId},parent_user_id.like.local_%`)
      .order('display_name', { ascending: true }),
    supabase
      .from('spelling_kid_list_assignments')
      .select('kid_id, is_enabled, weight')
      .eq('list_id', listId),
  ])) as [
    { data: ListItem[] | null },
    { data: Kid[] | null },
    { data: Assignment[] | null },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/lists"
            className="inline-flex min-h-[44px] items-center text-sm text-spelling-text-muted hover:text-spelling-text"
          >
            ← Back to lists
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-spelling-text">{list.title}</h1>
          <p className="mt-2 text-sm text-spelling-text-muted">
            {list.description || 'No description yet.'}
          </p>
        </div>
        <Link
          href={`/lists/${listId}/import`}
          className="inline-flex min-h-[44px] items-center rounded bg-spelling-secondary px-4 py-2 text-sm font-semibold text-spelling-text hover:bg-spelling-tertiary"
        >
          Import words
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
          <h2 className="text-lg font-semibold text-spelling-text">Words</h2>
          <div className="mt-4">
            <SpellingQuickAddWordForm listId={listId} />
          </div>
          <div className="mt-4 overflow-x-auto rounded border border-spelling-border-input">
            <table className="w-full text-sm">
              <thead className="bg-spelling-lesson-bg text-left text-xs uppercase text-spelling-text-muted">
                <tr>
                  <th className="px-3 py-2">Word</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map(item => (
                  <tr key={item.id} className="border-t border-spelling-border-input">
                    <td className="px-3 py-2 text-spelling-text">{item.word_display}</td>
                    <td className="px-3 py-2 text-xs text-spelling-text-muted">
                      {item.is_active ? 'Active' : 'Paused'}
                    </td>
                  </tr>
                ))}
                {items?.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-spelling-text-muted" colSpan={2}>
                      No words yet. Import or add words to get started.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SpellingListAssignmentPanel
            listId={listId}
            kids={kids ?? []}
            assignments={assignments ?? []}
          />
        </div>
      </div>
    </div>
  );
}
