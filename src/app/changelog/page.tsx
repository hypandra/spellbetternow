'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  UPDATES,
  type ChangeEntry,
  type ChangeTerm,
  type ChangeTermKind,
} from './changes'

const KIND_STYLES: Record<ChangeTermKind, string> = {
  internal: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  tool: 'border-sky-200 bg-sky-50 text-sky-800',
  practice: 'border-amber-200 bg-amber-50 text-amber-800',
}

function renderMarkdownLinks(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = pattern.exec(text)

  while (match) {
    const [fullMatch, label, href] = match
    const start = match.index

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    if (href.startsWith('/')) {
      nodes.push(
        <Link
          key={`internal-${start}-${href}`}
          href={href}
          className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
        >
          {label}
        </Link>
      )
    } else {
      nodes.push(
        <a
          key={`external-${start}-${href}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
        >
          {label}
        </a>
      )
    }

    lastIndex = start + fullMatch.length
    match = pattern.exec(text)
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function TermItem({ term }: { term: ChangeTerm }) {
  return (
    <li className="rounded-md border border-border/70 bg-background/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{term.label}</span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${KIND_STYLES[term.kind]}`}
        >
          {term.kind}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {renderMarkdownLinks(term.description)}
      </p>
      {term.note ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Note: {renderMarkdownLinks(term.note)}
        </p>
      ) : null}
    </li>
  )
}

function UpdateCard({ update }: { update: ChangeEntry }) {
  return (
    <article
      id={update.id}
      className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <header className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <time className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {formatDate(update.publishedAt)}
          </time>
          {update.tags?.map((tag) => (
            <span
              key={`${update.id}-${tag}`}
              className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{update.title}</h2>
      </header>

      <p className="text-sm leading-relaxed text-foreground">{renderMarkdownLinks(update.summary)}</p>

      {update.devNote ? (
        <p className="mt-4 rounded-lg border border-border/80 bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Builder note:</span>{' '}
          {renderMarkdownLinks(update.devNote)}
        </p>
      ) : null}

      {update.terms?.length ? (
        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Terms</h3>
          <ul className="space-y-2">
            {update.terms.map((term) => (
              <TermItem key={`${update.id}-${term.key}`} term={term} />
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

export default function ChangelogPage() {
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')

  const sortedUpdates = useMemo(() => {
    const sorted = [...UPDATES].sort((a, b) =>
      a.publishedAt.localeCompare(b.publishedAt)
    )

    return sortOrder === 'latest' ? sorted.reverse() : sorted
  }, [sortOrder])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">SpellBetterNow changelog</h1>
          <p className="text-sm text-muted-foreground">
            A running log of product updates focused on what changes your day-to-day
            practice experience.
          </p>
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setSortOrder('latest')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                sortOrder === 'latest'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={sortOrder === 'latest'}
            >
              Latest first
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('oldest')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                sortOrder === 'oldest'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={sortOrder === 'oldest'}
            >
              Oldest first
            </button>
          </div>
        </header>

        <div className="space-y-5">
          {sortedUpdates.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>

        <footer className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
          {renderMarkdownLinks(
            "Something here you'd want to know more about? [Get in touch](mailto:daniel@hypandra.com)."
          )}
        </footer>
      </div>
    </main>
  )
}
