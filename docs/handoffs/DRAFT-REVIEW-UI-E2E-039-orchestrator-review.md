# DRAFT-REVIEW-UI-E2E-039 Orchestrator Review

## Decision

Accepted after main-session hardening.

## Main-Session Findings

The worker E2E covered the right product flow, but two stability issues appeared in main validation:

- Several parallel dev servers shared `.next`, causing browser page loads to fail with a Next SSR chunk cache error while API probes still passed.
- The scheduled draft initially landed in the same week time cell as seeded published fixtures, and the compact week grid only renders one visible card per cell.

## Main-Session Fixes

- `next.config.mjs` now supports `NEXT_DIST_DIR`.
- `scripts/draft-review-ui-e2e-039.mjs`
  - Starts its temporary Next server with an isolated `NEXT_DIST_DIR`.
  - Waits for both `/api/self-media/dashboard` and `/dashboard`.
  - Writes server stdout/stderr logs under `.local/draft-review-ui-e2e-039/`.
  - Uses a dynamic same-day 17:00 scheduled time so the target card is visible in a distinct calendar slot.

## Verification

- `npm run smoke:draft-review-ui-e2e`: PASS
  - Report: `.local/draft-review-ui-e2e-039/report.json`
  - Screenshot: `.local/draft-review-ui-e2e-039/calendar-published.png`
- `npm run test:self-media`: PASS, 119/119
- `npm run typecheck`: PASS
- `git diff --check`: PASS

## Boundary

Accepted as a local manual publish-confirmation workflow only. It does not call real platform publish APIs, does not add trusted metric evidence, and generic platform-version PATCH remains blocked from writing `published`, `failed`, or `publishedAt`.
