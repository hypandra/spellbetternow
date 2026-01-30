# Self-Hosting SpellBetterNow

This guide covers a full self-hosted deployment with Supabase (database), BetterAuth (authentication), OpenAI TTS, and optional Redis caching.

## Prerequisites

- Node.js + Bun
- Supabase project (PostgreSQL)
- OpenAI API key (for TTS)
- Optional: Upstash Redis or Vercel KV for server-side TTS caching

## 1) Supabase Setup

1. Create a new Supabase project.
2. Apply the migrations from `supabase/migrations/` in order:

```bash
# Via Supabase CLI
supabase db push

# Or run SQL files manually in the Supabase SQL editor:
# 1. 20260101000000_sbn_initial_schema.sql (core tables + seed words)
# 2. 20260102000000_sbn_session_and_lists.sql (session locks + custom lists)
# 3. 20260110160000_sbn_better_auth_tables.sql (auth tables)
# 4. 20260113000000_sbn_expand_word_bank.sql (level 5-7 words)
# 5. 20260113010000_sbn_webster_challenging_polysyllables.sql
# 6. 20260113020000_sbn_webster_additional_words.sql
# 7. 20260113030000_sbn_hard_spelling_bee_words.sql
```

3. Capture these values from your Supabase settings:
   - Project URL
   - Anon key
   - Service role key

### SSL Certificate

For Vercel deployments that require a base64-encoded CA cert, set `SUPABASE_CA_CERT`. This project also includes `prod-ca-2021.crt` which can be used to generate the base64 value if needed:

```bash
base64 -i prod-ca-2021.crt | tr -d '\n'
```

## 2) BetterAuth Setup

BetterAuth uses your PostgreSQL database. Configure a connection string to Supabase Postgres (or another Postgres instance):

- `DATABASE_URL` should be a standard PostgreSQL connection string.
- Use a unique `BETTER_AUTH_SECRET` per deployment.
- Set both `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` to the base URL of your app.

The auth API route is `/api/auth/[...all]/route.ts` and expects the `sbn_` table prefix.

## 3) OpenAI TTS

Set `OPENAI_API_KEY` in your environment. The app uses OpenAI's TTS API for word prompts. You can optionally set `OPENAI_TTS_MODEL` (defaults to `tts-1`).

## 4) Optional Redis Caching

Server-side TTS caching is optional. Configure one of these:

- Upstash REST API:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Vercel KV:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`

If none are provided, caching is disabled and audio is generated on-demand.

## 5) Environment Variables

Copy `.env.example` to `.env.local` and fill in values.

```bash
cp .env.example .env.local
```

## 6) Run Locally

```bash
bun install
bun dev
```

The app runs at `http://localhost:3000` by default.

## 7) Deploy

You can deploy to any platform that supports Next.js (Vercel, Render, Fly.io, etc.). Ensure all environment variables from `.env.example` are configured in the deployment environment.
