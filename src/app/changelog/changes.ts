export type ChangeTermKind = 'internal' | 'tool' | 'practice'

export interface ChangeTerm {
  key: string
  label: string
  description: string
  kind: ChangeTermKind
  note?: string
}

export interface ChangeEntry {
  id: string
  title: string
  summary: string
  devNote?: string
  publishedAt: string
  tags?: string[]
  terms?: ChangeTerm[]
}

export const UPDATES: ChangeEntry[] = [
  {
    id: '2026-02-03-initial-open-source-release',
    title: 'Initial open source release',
    publishedAt: '2026-02-03',
    tags: ['release', 'adaptive-practice', 'audio'],
    summary:
      'SpellBetterNow is now live in open source form: you can run focused 5-word spelling rounds, hear words through TTS, and get letter-by-letter feedback that adapts as you practice.',
    devNote:
      'This established the baseline app flow across [landing](/landing), auth, and protected study routes so feature work could ship in smaller increments.',
    terms: [
      {
        key: 'adaptive-mini-sets',
        label: 'Adaptive mini-sets',
        kind: 'practice',
        description:
          'Practice runs in 5-word sets that rebalance difficulty from recent performance so the next set stays challenging but doable.',
      },
      {
        key: 'tts-pronunciation',
        label: 'Text-to-speech prompts',
        kind: 'tool',
        description:
          'Words are spoken before you type, supporting listen-first spelling routines used in class and at home.',
      },
    ],
  },
  {
    id: '2026-02-05-mobile-audio-reliability',
    title: 'Mobile audio now unlocks more reliably',
    publishedAt: '2026-02-05',
    tags: ['mobile', 'audio', 'ios'],
    summary:
      'If audio used to fail on first load on phones, you should now see much more reliable playback thanks to gesture-gating, Web Audio unlock, and iOS-safe preload behavior.',
    devNote:
      'We combined multiple fixes: autoplay gating, unlock on interaction, loading feedback, and a silent-MP3 bootstrap path for stricter iOS policies.',
    terms: [
      {
        key: 'audio-unlock',
        label: 'Audio unlock flow',
        kind: 'internal',
        description:
          'A startup sequence that satisfies browser media restrictions before normal TTS playback begins.',
      },
      {
        key: 'ios-autoplay-policy',
        label: 'iOS autoplay policy',
        kind: 'tool',
        description:
          'Safari requires a user gesture for most media playback, which is why tapping before first audio matters.',
      },
    ],
  },
  {
    id: '2026-02-06-mobile-keyboard-improvements',
    title: 'Custom mobile keyboard feels steadier and cleaner',
    publishedAt: '2026-02-06',
    tags: ['mobile', 'keyboard', 'ux'],
    summary:
      'Typing on phones got an upgrade: the on-screen keyboard now avoids mobile autocomplete issues, fixes double-tap edge cases, and keeps replay/submit controls in a more usable bottom-row layout.',
    devNote:
      'This cluster also resolved overlap bugs and small-screen touch ergonomics so learners can keep momentum during timed rounds.',
    terms: [
      {
        key: 'custom-keyboard',
        label: 'On-screen keyboard',
        kind: 'practice',
        description:
          'A built-in keyboard optimized for spelling drills where accidental autocorrect can hide real errors.',
      },
      {
        key: 'autocomplete-prevention',
        label: 'Autocomplete prevention',
        kind: 'internal',
        description:
          'Input handling explicitly avoids browser text assists that can leak answers during practice.',
      },
    ],
  },
  {
    id: '2026-02-08-break-and-scoring-feedback-accuracy',
    title: 'Break screen and scoring now reflect first-attempt performance',
    publishedAt: '2026-02-08',
    tags: ['feedback', 'scoring', 'review'],
    summary:
      'Review moments are clearer now: break diffs preserve the original misspelling, first-attempt accuracy is shown correctly, and retries typed while the answer is visible no longer distort score calculations.',
    devNote:
      'We also tightened mask behavior to avoid leaking hints and clarified the main input placeholder to "Type the word you heard."',
    terms: [
      {
        key: 'first-attempt-accuracy',
        label: 'First-attempt accuracy',
        kind: 'practice',
        description:
          'Accuracy prioritizes your first genuine spelling attempt, not retries made after seeing the answer.',
      },
      {
        key: 'diff-review',
        label: 'Diff-based review',
        kind: 'tool',
        description:
          'Letter-level comparison makes it easier to spot exactly what changed between your entry and the target spelling.',
      },
    ],
  },
  {
    id: '2026-02-09-session-sharing-and-og-visuals',
    title: 'Session sharing links and visuals are sharper',
    publishedAt: '2026-02-09',
    tags: ['sharing', 'reports', 'og-image'],
    summary:
      'Shared session links are more useful: previews now focus on real session attempts, and visual summaries moved to clearer chart styles including sparkline and dot-based variants.',
    devNote:
      'This builds on the public share route at `/share/:id` and the social preview generator behind it.',
    terms: [
      {
        key: 'share-route',
        label: 'Share route',
        kind: 'tool',
        description:
          'Anyone with a valid session link can open a read-only session summary at `/share/:id`.',
      },
      {
        key: 'open-graph-image',
        label: 'Open Graph image',
        kind: 'tool',
        description:
          'The image attached to shared links in chat apps and social platforms for quick progress context.',
      },
    ],
  },
  {
    id: '2026-02-10-word-bank-levels-3-to-7-expanded',
    title: 'Word bank expanded with 505 more words (levels 3-7)',
    publishedAt: '2026-02-10',
    tags: ['content', 'word-bank'],
    summary:
      'You now have a broader practice pool across intermediate and upper levels, which helps reduce repetition and increases coverage for tougher spelling patterns.',
    devNote:
      'The new entries were added in a single content expansion pass to improve progression depth across standard sessions.',
    terms: [
      {
        key: 'word-bank',
        label: 'Word bank',
        kind: 'practice',
        description:
          'The curated source list SpellBetterNow pulls from when generating adaptive sessions.',
      },
    ],
  },
  {
    id: '2026-02-11-no-audio-mode-with-text-hints',
    title: 'No-audio mode now includes richer text hints',
    publishedAt: '2026-02-11',
    tags: ['accessibility', 'modes', 'hints'],
    summary:
      'If your learner is practicing without sound, no-audio mode now provides stronger text support, refined hint behavior, and a clearer mode toggle experience.',
    devNote:
      'We shipped this in stages: no-audio mode, large-scale hint population, UI redesign for mode switching, then cleanup to remove misleading letter-fragment hints.',
    terms: [
      {
        key: 'no-audio-mode',
        label: 'No-audio mode',
        kind: 'practice',
        description:
          'A practice mode for silent environments or learners who need text-led prompting.',
      },
      {
        key: 'text-hints',
        label: 'Text hints',
        kind: 'tool',
        description:
          'Supporting cues tied to each word so you can continue practice even when TTS is unavailable.',
      },
    ],
  },
  {
    id: '2026-02-12-ipa-and-phonetic-pronunciation-expanded',
    title: 'Pronunciation guidance now spans IPA + phonetic respelling',
    publishedAt: '2026-02-12',
    tags: ['pronunciation', 'ipa', 'content'],
    summary:
      'Pronunciation support expanded across levels: more words now include IPA plus learner-friendly respellings, and IPA rendering uses the Doulos SIL font for better readability.',
    devNote:
      'Coverage was expanded in phases (levels 5+ then 1-4) and later corrected with authoritative data from [ipa-dict](https://github.com/open-dict-data/ipa-dict).',
    terms: [
      {
        key: 'ipa',
        label: 'IPA transcription',
        kind: 'practice',
        description:
          'International Phonetic Alphabet notation that shows sound-level pronunciation detail.',
      },
      {
        key: 'doulos-sil',
        label: 'Doulos SIL',
        kind: 'tool',
        description:
          'The typeface used to render IPA characters clearly: [Doulos SIL](https://software.sil.org/doulos/).',
      },
    ],
  },
  {
    id: '2026-02-13-pattern-feedback-and-error-aware-detection',
    title: 'Spelling patterns became more transparent and error-aware',
    publishedAt: '2026-02-13',
    tags: ['patterns', 'feedback', 'coaching'],
    summary:
      'Pattern coaching now does a better job connecting mistakes to relevant tips, and you can inspect the pattern library directly at [/patterns](/patterns).',
    devNote:
      'This included detector improvements plus expanded in-app transparency and feedback loops around pattern quality.',
    terms: [
      {
        key: 'pattern-detector',
        label: 'Pattern detector',
        kind: 'internal',
        description:
          'Logic that maps a misspelled word to the most relevant spelling tip in the pattern library.',
      },
      {
        key: 'pattern-library',
        label: 'Pattern library',
        kind: 'practice',
        description:
          'The visible set of rule-based spelling explanations available at [/patterns](/patterns).',
      },
    ],
  },
  {
    id: '2026-02-15-custom-word-lists-and-import-enrichment',
    title: 'Custom word lists: import, enrich, and run tailored sessions',
    publishedAt: '2026-02-15',
    tags: ['custom-lists', 'import', 'teacher-tools'],
    summary:
      'You can now build your own lists from CSV/file upload, enrich entries before publishing, and run sessions using your own vocabulary instead of only the default bank.',
    devNote:
      'This cluster added enrichment controls, reading-level filtering, list-page polish, and route-level data fixes for consistent behavior.',
    terms: [
      {
        key: 'csv-upload',
        label: 'CSV upload',
        kind: 'tool',
        description:
          'Bulk import path for teacher- or parent-curated words into custom lists.',
      },
      {
        key: 'llm-enrichment',
        label: 'LLM enrichment',
        kind: 'tool',
        description:
          'Optional pipeline that drafts metadata for imported words before you finalize the list.',
      },
      {
        key: 'custom-sessions',
        label: 'Custom-list sessions',
        kind: 'practice',
        description:
          'Practice rounds generated from your own list content rather than the default adaptive pool.',
      },
    ],
  },
  {
    id: '2026-02-17-learner-assignment-and-nav-updates',
    title: 'Learner assignment flows and navigation got cleaner',
    publishedAt: '2026-02-17',
    tags: ['learners', 'assignment', 'navigation'],
    summary:
      'Managing learners is smoother: list assignment panels include local-parent learners, naming now uses "learners" consistently, and dashboard navigation into custom lists is easier to find.',
    devNote:
      'This grouped several usability fixes with mobile touch-target and copy adjustments.',
    terms: [
      {
        key: 'assignment-panel',
        label: 'Assignment panel',
        kind: 'tool',
        description:
          'Controls for linking a custom list to one or more learners so practice content is targeted.',
      },
      {
        key: 'local-parent-learners',
        label: 'Local-parent learners',
        kind: 'internal',
        description:
          'Learner records associated with local parent context that now appear correctly in assignment selection.',
      },
    ],
  },
  {
    id: '2026-02-20-coppa-age-gate-and-list-pinned-study',
    title: 'COPPA safeguards plus study-from-list sessions',
    publishedAt: '2026-02-20',
    tags: ['coppa', 'safety', 'custom-lists'],
    summary:
      'You now get an age-gate flow for COPPA compliance, and study-from-list mode can keep sessions pinned to a selected list with cycling word selection and clear list badges.',
    devNote:
      'This combines age checks across [/age-gate](/age-gate) and [/under-13](/under-13) with list-pinned practice rollout and follow-up service-role query hardening on list routes.',
    terms: [
      {
        key: 'coppa',
        label: 'COPPA enforcement',
        kind: 'practice',
        description:
          'Age-aware onboarding behavior aligned with the [COPPA rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa).',
      },
      {
        key: 'list-pinned-session',
        label: 'List-pinned sessions',
        kind: 'practice',
        description:
          'A study mode that keeps word selection tied to one chosen custom list across rounds.',
      },
    ],
  },
]
