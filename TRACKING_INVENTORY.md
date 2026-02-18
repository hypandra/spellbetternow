# Tracking Inventory (SBN)

Generated on: 2026-02-18

## Summary

Only one client-side third-party script was found in the app codebase.

## Findings

| Provider | Initialization location | Routes affected | Runs pre-gate? | Recommended action |
| --- | --- | --- | --- | --- |
| Curiosity Badge (`hypandra.com`) | `src/app/layout.tsx:59` | All routes via root layout | Previously yes; now no | Keep disabled unless age gate decision is `13_plus` |

## Search scope

- Searched for known analytics/replay tags: `gtag`, `GTM-`, `googletagmanager`, `analytics.load`, `segment.com`, `posthog`, `mixpanel`, `amplitude`, `heap`, `fbevents`, `hotjar`, `fullstory`, `logrocket`, `clarity`, `datadog-rum`, `newrelic`.
- Searched for explicit third-party script tags: `<script src="https://...">`.

No other third-party tracking SDK initializers were found in `src/`.
