import Link from 'next/link';
import DemoRound from '@/components/landing/DemoRound';

const FEATURE_LIST = [
  {
    title: 'Adaptive mini-sets',
    description: 'Every round recalibrates difficulty to keep learners in the sweet spot.',
  },
  {
    title: 'Error-aware coaching',
    description: 'Letter-by-letter feedback points out exactly where spelling slips.',
  },
  {
    title: 'Family-ready dashboards',
    description: 'Track progress per learner, see practice needs, and celebrate wins.',
  },
];

const STEPS = [
  {
    label: 'Listen',
    title: 'Hear the word in context',
    description: 'Each prompt includes an example sentence so meaning clicks before spelling.',
  },
  {
    label: 'Spell',
    title: 'Type or tap letters',
    description: 'Choose the mode that fits your learner and keep the focus on accuracy.',
  },
  {
    label: 'Coach',
    title: 'Review targeted feedback',
    description: 'Every miss becomes a mini-lesson, not just a red X.',
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#F7FCF9] via-white to-[#E3F0E8]" />
      <div className="absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-[#D6E5DD]/70 blur-3xl" />
      <div className="absolute bottom-0 left-[-10%] h-64 w-64 rounded-full bg-[#E3F0E8]/80 blur-3xl" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-20 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-spelling-text-muted">
            SpellBetterNow
          </p>
          <h1 className="text-4xl font-semibold text-spelling-text md:text-5xl lg:text-6xl">
            Smarter spelling practice in five focused words.
          </h1>
          <p className="max-w-xl text-lg text-spelling-text-muted">
            Build confidence with adaptive spelling rounds, immediate feedback, and simple parent
            dashboards. No busywork, just the right words at the right time.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-spelling-primary px-6 py-3 text-sm font-semibold text-spelling-surface transition hover:bg-spelling-primary-hover"
            >
              Start for free
            </Link>
            <Link
              href="#demo"
              className="rounded-full border border-spelling-border px-6 py-3 text-sm font-semibold text-spelling-primary transition hover:border-spelling-primary"
            >
              Try a demo round
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-spelling-text-muted">
            <span>Adaptive sets in minutes</span>
            <span>Feedback kids understand</span>
            <span>Progress for parents</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="rounded-3xl border border-spelling-border bg-spelling-surface/90 p-6 shadow-lg shadow-emerald-900/10 backdrop-blur">
            <h2 className="text-xl font-semibold text-spelling-text">Why it works</h2>
            <p className="mt-2 text-sm text-spelling-text-muted">
              Built for short, repeatable practice sessions that keep learners motivated.
            </p>
            <div className="mt-6 space-y-4">
              {FEATURE_LIST.map(feature => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-spelling-border bg-spelling-accent p-4"
                >
                  <div className="text-sm font-semibold text-spelling-text">{feature.title}</div>
                  <p className="mt-1 text-sm text-spelling-text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-spelling-primary px-4 py-3 text-sm text-spelling-surface">
              Designed for teachers, parents, and tutors who want real progress without the fuss.
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-spelling-text-muted">
              Demo round
            </p>
            <h2 className="text-3xl font-semibold text-spelling-text md:text-4xl">
              Try a round. No account required.
            </h2>
            <p className="text-base text-spelling-text-muted">
              Hear each word, type the spelling, and see where letters land. This is the same
              feedback learners get during a real session.
            </p>
            <div className="rounded-2xl border border-spelling-border bg-spelling-accent p-4 text-sm text-spelling-text-muted">
              Pro tip: sign in after the demo to save progress, track learners, and unlock history
              insights.
            </div>
          </div>
          <DemoRound />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-spelling-border bg-spelling-surface/90 p-10 shadow-xl shadow-emerald-900/10">
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map(step => (
              <div key={step.label} className="space-y-3">
                <div className="inline-flex items-center rounded-full bg-spelling-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-spelling-primary">
                  {step.label}
                </div>
                <h3 className="text-lg font-semibold text-spelling-text">{step.title}</h3>
                <p className="text-sm text-spelling-text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-spelling-primary px-8 py-10 text-spelling-surface md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ready to build spelling confidence?</h2>
            <p className="mt-2 text-sm text-white/80">
              Create a parent account, add learners, and start adaptive practice in minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-spelling-primary transition hover:bg-spelling-accent"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:border-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
