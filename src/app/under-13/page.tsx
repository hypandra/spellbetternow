import Link from 'next/link';

export default function Under13Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-spelling-border bg-spelling-surface p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-spelling-text-muted">
          SpellBetterNow
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-spelling-text">
          Account Access Unavailable For Under 13
        </h1>
        <p className="mt-4 text-sm text-spelling-text-muted">
          SpellBetterNow account-based learning is currently restricted to users 13 and older.
          This helps prevent collecting persistent learner data from children under 13.
        </p>
        <p className="mt-3 text-sm text-spelling-text-muted">
          If you are a parent or guardian, use WildReader for child-safe workflows or return to the
          age check if you selected the wrong option.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/age-gate"
            className="rounded-full border border-spelling-border px-5 py-2 text-sm font-semibold text-spelling-text hover:border-spelling-primary"
          >
            Back to age check
          </Link>
          <a
            href="https://www.wildreader.com"
            className="rounded-full bg-spelling-primary px-5 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover"
          >
            Go to WildReader
          </a>
        </div>
      </div>
    </main>
  );
}
