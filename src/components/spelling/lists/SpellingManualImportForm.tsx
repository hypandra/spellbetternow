'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidWordLength, normalizeWord } from '@/lib/spelling/custom-lists';

interface SpellingManualImportFormProps {
  listId: string;
}

type EnrichedWord = {
  word: string;
  definition: string;
  example_sentence: string;
  part_of_speech: string;
  level: number;
  estimated_elo: number;
  source: 'word_bank' | 'llm';
};

function parseSimpleCsv(content: string): string[] {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstRow = lines[0]
    .split(',')
    .map(value => value.trim().replace(/^"+|"+$/g, '').toLowerCase());
  const hasHeader = firstRow.includes('word') || firstRow.includes('words');
  const wordColumn = Math.max(0, firstRow.findIndex(value => value === 'word' || value === 'words'));

  const rows = hasHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  const words: string[] = [];

  for (const row of rows) {
    const columns = row.split(',');
    const value = (columns[wordColumn] ?? columns[0] ?? '').trim().replace(/^"+|"+$/g, '');
    const normalized = normalizeWord(value);
    if (!normalized) continue;
    if (!isValidWordLength(normalized)) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    words.push(normalized);
  }

  return words;
}

export default function SpellingManualImportForm({ listId }: SpellingManualImportFormProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [enrichedWords, setEnrichedWords] = useState<EnrichedWord[]>([]);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedWords = useMemo(
    () => candidates.filter(word => selected[word]),
    [candidates, selected]
  );
  const isEnrichLimitExceeded = selectedWords.length > 20;
  const filteredEnrichedWords = useMemo(
    () =>
      levelFilter === null
        ? enrichedWords
        : enrichedWords.filter(item => item.level >= levelFilter),
    [enrichedWords, levelFilter]
  );

  const extractCandidates = async (textValue: string): Promise<string[] | null> => {
    const response = await fetch('/api/spelling/import/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textValue }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(
        payload.error ??
          'Could not extract words from this text. Try pasting a shorter passage or a simple word list.'
      );
      return null;
    }

    const payload = (await response.json()) as { candidates?: string[] };
    return Array.isArray(payload.candidates) ? payload.candidates : [];
  };

  const setCandidatesAndSelectAll = (words: string[]) => {
    const nextSelected: Record<string, boolean> = {};
    for (const word of words) {
      nextSelected[word] = true;
    }
    setCandidates(words);
    setSelected(nextSelected);
    setEnrichedWords([]);
    setLevelFilter(null);
  };

  const handleExtract = async () => {
    setError(null);
    setIsExtracting(true);

    try {
      const words = await extractCandidates(text);
      if (!words) return;
      setCandidatesAndSelectAll(words);
    } catch (err) {
      console.error('[Spelling Manual Import] Error:', err);
      setError(
        'Could not extract words from this text. Try pasting a shorter passage or a simple word list.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsReadingFile(true);

    try {
      const content = await file.text();
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.csv')) {
        const words = parseSimpleCsv(content);
        if (words.length === 0) {
          setError('No valid words found in CSV.');
          return;
        }
        setCandidatesAndSelectAll(words);
        setText(content);
        return;
      }

      if (lowerName.endsWith('.txt')) {
        setText(content);
        const words = await extractCandidates(content);
        if (!words) return;
        setCandidatesAndSelectAll(words);
        return;
      }

      setError('Unsupported file type. Use .csv or .txt.');
    } catch (err) {
      console.error('[Spelling File Upload] Error:', err);
      setError('Could not read this file. Make sure it is a .csv or .txt file and try again.');
    } finally {
      setIsReadingFile(false);
      event.target.value = '';
    }
  };

  const handleEnrichSelectedWords = async () => {
    setError(null);
    setIsEnriching(true);

    try {
      const response = await fetch('/api/spelling/import/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: selectedWords }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          payload.error ??
            'Could not look up word details. Try again or add words without enrichment.'
        );
        return;
      }

      const payload = (await response.json()) as { enriched?: EnrichedWord[] };
      setEnrichedWords(Array.isArray(payload.enriched) ? payload.enriched : []);
      setLevelFilter(null);
    } catch (err) {
      console.error('[Spelling Enrich Words] Error:', err);
      setError('Could not look up word details. Try again or add words without enrichment.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAddWords = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const wordsPayload =
        enrichedWords.length > 0
          ? filteredEnrichedWords.map(item => ({
              word: item.word,
              definition: item.definition,
              example_sentence: item.example_sentence,
              part_of_speech: item.part_of_speech,
              level: item.level,
              estimated_elo: item.estimated_elo,
            }))
          : selectedWords;

      const response = await fetch('/api/spelling/import/add-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          words: wordsPayload,
          sourceText: text.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          payload.error ??
            'Could not save words to the list. Try again — your selections are still here.'
        );
        return;
      }

      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err) {
      console.error('[Spelling Add Words] Error:', err);
      setError('Could not save words to the list. Try again — your selections are still here.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const word of candidates) {
      next[word] = checked;
    }
    setSelected(next);
    setEnrichedWords([]);
    setLevelFilter(null);
  };

  const toggleSelectedWord = (word: string, checked: boolean) => {
    setSelected(current => ({ ...current, [word]: checked }));
  };

  const updateEnrichedDefinition = (word: string, definition: string) => {
    setEnrichedWords(current =>
      current.map(item => (item.word === word ? { ...item, definition } : item))
    );
  };

  const removeEnrichedWord = (word: string) => {
    setEnrichedWords(current => current.filter(item => item.word !== word));
    setCandidates(current => current.filter(item => item !== word));
    setSelected(current => {
      const next = { ...current };
      delete next[word];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
        <label className="block text-sm font-medium text-spelling-text">Upload file (.csv or .txt)</label>
        <input
          type="file"
          accept=".csv,.txt,text/plain,text/csv"
          onChange={handleFileUpload}
          className="mt-2 block w-full rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-base text-spelling-text"
        />
        <p className="mt-2 text-xs text-spelling-text-muted text-pretty">
          CSV uses the first column or a column named word/words. TXT supports one word per line or free text.
        </p>
        {isReadingFile ? <p className="mt-2 text-xs text-spelling-text-muted">Reading file...</p> : null}
      </div>

      <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
        <label className="block text-sm font-medium text-spelling-text">Paste your words</label>
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          className="mt-2 w-full rounded border border-spelling-border-input bg-spelling-surface px-3 py-2 text-base text-spelling-text"
          rows={6}
          placeholder="Paste a paragraph or list of words"
        />
        <button
          type="button"
          onClick={handleExtract}
          disabled={isExtracting || !text.trim()}
          className="mt-3 inline-flex min-h-[44px] items-center rounded bg-spelling-secondary px-4 py-2 text-sm font-semibold text-spelling-text hover:bg-spelling-tertiary disabled:opacity-60"
        >
          {isExtracting ? 'Extracting...' : 'Extract candidates'}
        </button>
      </div>

      <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-spelling-text text-balance">Preview candidates</h2>
            <p className="text-sm text-spelling-text-muted tabular-nums">
              {candidates.length} candidates, {selectedWords.length} selected
              {levelFilter !== null && enrichedWords.length > 0
                ? ` (showing ${filteredEnrichedWords.length} at level ${levelFilter}+)`
                : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="inline-flex min-h-[44px] items-center rounded border border-spelling-border-input px-3 py-2 text-sm text-spelling-text"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="inline-flex min-h-[44px] items-center rounded border border-spelling-border-input px-3 py-2 text-sm text-spelling-text"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-spelling-text-muted">
              Upload a file or paste words above to see candidates here.
            </p>
          ) : (
            candidates.map(word => (
              <label
                key={word}
                className="flex min-h-[44px] items-center gap-2 rounded border border-spelling-border-input bg-spelling-lesson-bg px-2 py-2 text-sm text-spelling-text"
              >
                <input
                  type="checkbox"
                  checked={Boolean(selected[word])}
                  onChange={event => toggleSelectedWord(word, event.target.checked)}
                  className="size-4"
                />
                {word}
              </label>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleEnrichSelectedWords}
            disabled={selectedWords.length === 0 || isEnriching || isEnrichLimitExceeded}
            className="inline-flex min-h-[44px] items-center rounded bg-spelling-secondary px-4 py-2 text-sm font-semibold text-spelling-text hover:bg-spelling-tertiary disabled:opacity-60"
          >
            {isEnriching ? 'Enriching...' : 'Enrich selected words'}
          </button>
          <button
            type="button"
            onClick={handleAddWords}
            disabled={
              (enrichedWords.length > 0
                ? filteredEnrichedWords.length === 0
                : selectedWords.length === 0) || isSubmitting
            }
            className="inline-flex min-h-[44px] items-center rounded bg-spelling-primary px-4 py-2 text-sm font-semibold text-spelling-surface hover:bg-spelling-primary-hover disabled:opacity-60"
          >
            {isSubmitting ? 'Adding...' : 'Add to list'}
          </button>
        </div>
        {isEnrichLimitExceeded ? (
          <p className="mt-2 text-xs text-spelling-text-muted">
            Enrichment supports up to 20 words at a time. Deselect some words or add in batches.
          </p>
        ) : null}
        {enrichedWords.length > 0 && filteredEnrichedWords.length === 0 ? (
          <p className="mt-2 text-sm text-spelling-text-muted">
            No words match the current level filter. Adjust the filter or select All levels.
          </p>
        ) : null}
      </div>

      {enrichedWords.length > 0 ? (
        <div className="rounded-lg border border-spelling-border bg-spelling-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-spelling-text text-balance">
                Enriched words preview
              </h2>
              {levelFilter !== null && (
                <p className="text-sm text-spelling-text-muted tabular-nums">
                  Showing {filteredEnrichedWords.length} of {enrichedWords.length} words at level {levelFilter}+
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-spelling-text">
              Show words at or above level
              <select
                value={levelFilter === null ? 'all' : String(levelFilter)}
                onChange={event =>
                  setLevelFilter(event.target.value === 'all' ? null : Number(event.target.value))
                }
                className="rounded border border-spelling-border-input bg-spelling-surface px-2 py-1 text-base text-spelling-text"
              >
                <option value="all">All levels</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
              </select>
            </label>
          </div>
          <div className="mt-4 overflow-x-auto rounded border border-spelling-border-input">
            <table className="w-full text-sm">
              <thead className="bg-spelling-lesson-bg text-left text-xs uppercase text-spelling-text-muted">
                <tr>
                  <th className="px-3 py-2">Word</th>
                  <th className="px-3 py-2">Definition</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Part of speech</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrichedWords.map(item => (
                  <tr key={item.word} className="border-t border-spelling-border-input">
                    <td className="px-3 py-2 font-medium text-spelling-text">{item.word}</td>
                    <td className="px-3 py-2">
                      <input
                        value={item.definition}
                        onChange={event => updateEnrichedDefinition(item.word, event.target.value)}
                        className="w-full rounded border border-spelling-border-input bg-spelling-surface px-2 py-1 text-base text-spelling-text"
                      />
                    </td>
                    <td className="px-3 py-2 text-spelling-text tabular-nums">{item.level}</td>
                    <td className="px-3 py-2 text-spelling-text">{item.part_of_speech || '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeEnrichedWord(item.word)}
                        className="inline-flex min-h-[44px] items-center rounded border border-spelling-border-input px-3 py-2 text-xs text-spelling-text"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-spelling-error-text text-pretty">{error}</p> : null}
    </div>
  );
}
