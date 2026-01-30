# AGENTS.md

Guidance for AI agents working on this project.

See `CLAUDE.md` for developer-focused guidance.

## Project Overview

A Curiosity Build project

**Table prefix:** `??_`

## Key Implementation Files

Reference these files when working on this project:
- `src/lib/auth.ts` - BetterAuth configuration
- `src/lib/config.ts` - Project configuration
- `src/app/api/auth/[...all]/route.ts` - BetterAuth API handler
- Check `INITIAL_SPEC.md` for full project specification

## Next.js 16 Params Pattern

**Critical:** Dynamic route params are Promises in Next.js 16 - you must await them:

```typescript
// ❌ Wrong - params is a Promise
export default function Page({ params }: { params: { id: string } }) {
  console.log(params.id)  // Error: id is undefined
}

// ✅ Correct - await params
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Now id is available
}
```

Reference existing implementations in the codebase for patterns.

## Common Patterns

**Authentication:**
- Use BetterAuth session to get `user_id`
- Filter all queries by `user_id` from session
- Don't use RLS - rely on server-side filtering

**Database:**
- Reference `??_user(id)` table for user foreign keys
- Migrations go in `../../supabase/migrations/` (not in project repo)
- Use YYYYMMDDHHMMSS_??_description.sql naming

**API Routes:**
- Check BetterAuth session in all protected routes
- Return `{ error: 'Unauthorized' }` for missing sessions
- Server-side only for OpenRouter calls and secrets

## Constraints

- Next.js 16+ with App Router
- React 19
- BetterAuth for authentication
- Supabase PostgreSQL (shared instance)
- TypeScript
- shadcn/ui for components

See `CLAUDE.md` for full constraints and requirements.
