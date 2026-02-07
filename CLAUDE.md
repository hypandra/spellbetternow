# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpellBetterNow is an adaptive spelling practice app for children. Kids complete "mini-sets" of 5 words, with difficulty adjusting based on performance. The app supports both authenticated (Supabase) and offline/local modes.

## Commands

```bash
bun dev          # Start dev server (localhost:3000)
bun build        # Production build
bun lint         # ESLint
bun start        # Start production server
```

## Architecture

### Session Flow

The core learning loop is managed by `SessionRunner` (`src/lib/spelling/session/session-runner.ts`):

1. **Start**: Creates session, selects 5 words at kid's level
2. **Spell Words**: Kid hears word via TTS, types/taps answer
3. **Break Screen**: After 5 words, shows results + optional lesson
4. **Continue/Finish**: Load next mini-set or end session

Session state machine (`src/lib/spelling/session/state-machine.ts`): `IDLE → IN_MINISET → BREAK → COMPLETE`

### Adaptivity System

Level adjustment in `src/lib/spelling/adaptivity/`:
- **Cold start** (first 10 attempts): 80%+ accuracy → level up, ≤40% → level down
- **Ongoing**: Confidence score accumulates across mini-sets (±1 per set based on 4+/≤2 correct)
- Levels range 1-7 (or max from word bank)

Word selection prioritizes words the kid hasn't seen recently or previously missed.

### Input Modes

Two modes defined in `SpellingPromptData`:
- `typed`: Standard text input
- `tap_letters`: Letter tray UI (for younger kids)

### Data Layer

All database operations in `src/lib/spelling/db/`:
- **Supabase tables**: `spelling_kids`, `spelling_sessions`, `spelling_attempts`, `spelling_word_bank`, `spelling_mastery`, `spelling_mini_set_summaries`
- Uses service role key for server operations, anon key + auth token for client

### Offline Support

- `src/lib/spelling/local-kids.ts`: localStorage-based kid profiles for unauthenticated users
- Local parent IDs prefixed with `local_`
- Session start API can auto-create kids in Supabase for local parents

### TTS

- OpenAI TTS API (`src/lib/spelling/tts/generate-audio.ts`)
- Client caches audio in browser Cache API (`hypandra-tts-v1`)
- Announcements built from word + definition + example sentence

### Theming

Single theme ("focus") via `SpellingThemeContext` with CSS custom properties (`data-spelling-theme` attribute). Theme content (labels, button text) in `src/features/spelling/constants/theme-content.ts`. Design uses direct, respectful language - no playful metaphors or condescension.

## API Routes

All under `/api/spelling/`:
- `session/start` - Create new session
- `session/action` - Submit word, continue, finish
- `kids/` - CRUD for kid profiles
- `kid/level` - Update kid's level
- `lists/` - Custom word lists
- `/api/tts` - Generate TTS audio

### Authentication

BetterAuth with PostgreSQL backend (`src/lib/auth.ts`):
- Table prefix `sbn_` isolates auth tables from other projects sharing the database
- SSL cert loaded from `SUPABASE_CA_CERT` env var (base64) or `prod-ca-2021.crt` file
- Client hooks in `src/lib/auth-client.ts`: `useSession`, `signIn`, `signOut`, `signUp`
- Auth API handler at `/api/auth/[...all]/route.ts`
- Login/signup pages at `/login` and `/signup`

See `/Users/dsg/projects/internal_curiosity_builds/AUTH.md` for shared auth setup across projects.

### Error Handling

Database unavailability is handled gracefully:
- `KidProfileSelector`: Shows warning banner with retry when DB fails
- `useSpellingSession`: Tracks error types (`db-unavailable`, `session-start-failed`) with user-friendly messages
- `SessionError` component: Styled error screens with retry buttons
- Login/signup: Translates raw errors to helpful messages

### Error Feedback (Spelling Diff)

Letter-by-letter comparison when kids misspell words (`src/lib/spelling/errors/spelling-diff.ts`):
- Damerau-Levenshtein algorithm detecting: substitutions, omissions, additions, transpositions
- Visual diff component (`src/components/spelling/SpellingErrorDiff.tsx`)
- Walkthrough page at `/walkthrough` demonstrates the feature

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_CA_CERT          # Base64-encoded SSL cert for Vercel

# BetterAuth
BETTER_AUTH_SECRET        # Unique per project
BETTER_AUTH_URL
NEXT_PUBLIC_BETTER_AUTH_URL

# Database (for BetterAuth)
DATABASE_URL              # PostgreSQL connection string

# OpenAI
OPENAI_API_KEY
OPENAI_TTS_MODEL          # Optional, defaults to 'tts-1'
```

## Migrations (Temporary Workaround)

`supabase db push` fails because this project's local migrations are a subset of the shared Supabase instance's full history. Until schema isolation lands, run migrations directly:

```bash
source .env.local && psql "$DATABASE_URL" -f supabase/migrations/<migration_file>.sql
```

This bypasses the migration history check. Remove this workaround once SBN moves to its own schema.

## Next.js 16 Params Pattern

Dynamic route params are Promises in Next.js 16 - you must await them before use:

```typescript
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Now id is available
}
```
