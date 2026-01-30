import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getOptionalUserId } from '@/utils/supabase/roles';
import SpellingManualImportForm from '@/components/spelling/lists/SpellingManualImportForm';

export default async function SpellingListImportPage({
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
          className="text-sm text-spelling-text-muted hover:text-spelling-text"
        >
          ← Back to lists
        </Link>
        <div className="mt-6 rounded border border-dashed border-spelling-border p-4 text-sm text-spelling-text-muted">
          Sign in to import words. TODO: BetterAuth.
        </div>
      </div>
    );
  }

  const { data: list } = await supabase
    .from('spelling_custom_lists')
    .select('id, owner_user_id, title')
    .eq('id', listId)
    .maybeSingle();

  if (!list || list.owner_user_id !== userId) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/lists/${listId}`}
        className="text-sm text-spelling-text-muted hover:text-spelling-text"
      >
        ← Back to list
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-spelling-text">Import words</h1>
      <p className="mt-2 text-sm text-spelling-text-muted">
        Paste words or paragraphs and curate the candidates before adding them to
        <span className="font-semibold text-spelling-text"> {list.title}</span>.
      </p>
      <div className="mt-6">
        <SpellingManualImportForm listId={listId} />
      </div>
    </div>
  );
}
