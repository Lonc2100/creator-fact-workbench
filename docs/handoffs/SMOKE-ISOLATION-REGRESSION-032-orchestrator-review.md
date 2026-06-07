# SMOKE-ISOLATION-REGRESSION-032 Orchestrator Review

## Decision

Accepted after main-session stabilization.

Smoke isolation is now a hard regression contract: save smoke and operations E2E smoke must not write fixture provenance into the dirty/history operating database.

## Main Session Findings And Fixes

During review, parallel E2E reruns exposed two process-level issues:

- temporary Next dev servers could be left behind because only the wrapper process was killed;
- launching through `npm run dev -- --port ...` produced duplicated port arguments on Windows.

Main session fixed:

- `scripts/platform-operations-e2e-smoke.mjs` now launches the Next CLI directly.
- `scripts/content-curation-e2e.mjs` uses the same direct Next CLI launch pattern.
- Both scripts stop the Windows process tree through `taskkill /T /F`.
- The platform operations E2E uses `/import/` and explicit import-page response checks.
- Next hot-update 404s are ignored as non-product HTTP noise.

## Accepted Smoke Database Paths

- Save smoke: `.local/platform-personal-save-smoke/self-media-smoke.sqlite`.
- Platform operations E2E smoke: `.local/platform-operations-e2e/self-media-smoke.sqlite`.

## Main Session Verification

Reran:

- `npm run smoke:platform-operations-e2e`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run test:self-media`: PASS, 90/90.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not relax smoke isolation by default. Any future explicit override must clearly name the target database and must not be used by daily operator commands.
