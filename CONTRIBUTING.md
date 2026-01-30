# Contributing

Thanks for helping improve SpellBetterNow! This guide covers local setup, coding style, and pull request expectations.

## Development Setup

1. Install dependencies:
   ```bash
   bun install
   ```
2. Copy `.env.example` to `.env.local` and fill in values.
3. Start the dev server:
   ```bash
   bun dev
   ```

Other useful commands:

```bash
bun lint
bun build
bun start
```

## Code Style

- TypeScript only.
- 2-space indentation.
- Keep components and utilities small and focused.
- Prefer clear naming over cleverness.

## Pull Requests

- Keep PRs small and scoped to a single purpose.
- Include a brief description of the change and why it matters.
- Add or update tests when behavior changes.
- Note any manual testing performed.
- Ensure `bun lint` and `bun build` pass before requesting review.
