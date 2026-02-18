# COPPA Verification Checklist (SBN)

Date: 2026-02-18

## Manual checks

1. Clear cookies/storage and open `/`.
2. Verify redirect to `/age-gate` before login/signup/dashboard renders.
3. Open DevTools Network on `/age-gate` and confirm no requests to tracking domains (especially `hypandra.com`, GA/GTM, Segment, Meta Pixel, replay vendors).
4. Select `I am under 13` and verify redirect to `/under-13`.
5. Confirm `/under-13` shows blocked experience and does not expose account creation/sign-in UI.
6. While in under-13 state, attempt to visit `/login`, `/signup`, `/app`, `/session`, `/landing`; verify redirect back to `/under-13`.
7. While in under-13 state, call mutating endpoints manually (for example `/api/spelling/session/start`, `/api/spelling/session/action`, `/api/auth/*` POST) and verify `403` with age-gate denial error.
8. Select `I am 13 or older` and verify normal auth/account flows are accessible.
9. Verify third-party script (`https://hypandra.com/embed/curiosity-badge.js`) appears only in 13+ flow.

## Automated e2e coverage

Playwright spec file:

- `tests/e2e/coppa-under13.spec.ts`

Coverage:

1. Under-13 path: no known tracking-domain requests, no third-party `<script src="https://...">` in DOM.
2. Under-13 API write attempts (`session/start`, `session/action`) return `403`.

Run command:

```bash
npx playwright test tests/e2e/coppa-under13.spec.ts
```

Note: Playwright must be installed in the environment for this command to run.
