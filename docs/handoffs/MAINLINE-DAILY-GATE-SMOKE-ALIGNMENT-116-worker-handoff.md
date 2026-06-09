# MAINLINE-DAILY-GATE-SMOKE-ALIGNMENT-116 Worker Handoff

## Status

- Result: completed; ready for commit.
- Commit status: yes, to be committed with `test(self-media): align daily gate with import secondary history`.
- Code scope: smoke/UI-test alignment plus one trusted-scope audit口径 fix required for daily gate PASS.
- Push: not requested for 116.

## Root Cause

115 exposed the first failure:

- `/import` was correctly simplified in 109: operation history moved under a secondary folded section.
- `scripts/platform-operations-e2e-smoke.mjs` still waited for `[data-testid="platform-operation-history-table"]` to be visible immediately after page load.
- That old smoke path contradicted the product decision: the default import first screen should stay focused on four platform update cards, not show operation history or diagnostics.

After fixing that smoke path, daily gate revealed a second口径 mismatch:

- `realDataScope` and the trusted dashboard audit counted all user-excluded trusted-source snapshots: `3` contents / `3` snapshots.
- `dashboard.trustedScopeCuration` was built from `operationalContents`, so two excluded trusted-source contents were filtered before curation counting and the dashboard returned `1` / `1`.
- This did not affect trusted metric totals, but it made `audit:trusted-dashboard` fail inside the daily gate.

## Changes

- `scripts/platform-operations-e2e-smoke.mjs`
  - Added `openPlatformOperationsHistory(page)`.
  - The smoke now verifies the default import first screen keeps `platform-operation-history-table` folded.
  - Then it clicks `[data-testid="platform-sync-freshness-detail"] > summary` like a user opening the secondary history area.
  - Only after that does it assert `platform-operation-history-table` is visible and run the original preview/save/smoke operations.
  - Default-copy pollution check now runs before the secondary section opens.

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Added `data-testid="platform-sync-freshness-detail"` to the existing business secondary section `四平台同步与数据新鲜度`.
  - No default-open behavior changed.
  - Operation history and diagnostics remain folded by default.

- `src/domain/self-media/service/self-media-service.ts`
  - Dashboard `trustedScopeCuration` now uses `allContents` to count trusted-source user exclusions consistently with `realDataScope` and the trusted dashboard audit.
  - Active trusted metric snapshots still come from `metricSnapshots`; excluded content does not re-enter dashboard/review totals.

- `tests/ui-harness.test.mjs`
  - Added a source-level guard that the import page exposes the secondary section test id while keeping diagnostics folded.

## Import Default First Screen

- Kept simple four-platform update first screen.
- Operation history is not visible on default `/import`.
- Diagnostics and advanced import stay secondary/folded.
- No platform backend opens on page load or during this smoke alignment.

## Daily Gate Result

- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS as command exit `0`.
- Report status: `warn`, `passed: true`.
- Reason for warning: platform data freshness only.
  - `health staleCount=14`
  - `health realCaptureStaleCount=4`
- Blocking reasons: none.
- Trusted dashboard audit: PASS, mismatches `0`.
- Platform ops with health: PASS, with stale warnings only.

## Live 3200 Acceptance

Fixed entry: `http://localhost:3200/dashboard`, then `/import`.

- 3200 was restarted on `NEXT_DIST_DIR=.next-build-116-main`.
- `/import` overview visible: yes.
- Four platform cards visible: yes.
- Default operation history visible: no, verified with Playwright `locator.isVisible()`.
- Secondary section clicked: `[data-testid="platform-sync-freshness-detail"] > summary`.
- Operation history visible after expansion: yes.
- Operation history rows after expansion: `12`.
- External platform windows opened: no.
- New content / schedule / trusted metric created by live acceptance: no.

## Verification

| Command | Result |
| --- | --- |
| `git diff --check` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:self-media` | PASS |
| `npm run test:ui-harness` | PASS |
| `NEXT_DIST_DIR=.next-build-116-main npm run build` | PASS |
| `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` | PASS |
| `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` | PASS with warning status, `passed: true` |

Additional targeted check:

- `npm run smoke:platform-operations-e2e`: PASS, `operationHistoryRows=9` in isolated smoke.

## Business Data / Safety

- New business content: no.
- Deleted business content: no.
- New schedule: no.
- Deleted schedule: no.
- New trusted metric in operating DB: no.
- External platform window opened: no.
- Sensitive material saved or staged: no.
- No password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace was added.

## Remaining Risks

- Daily gate still reports stale real capture freshness. This is warning-only under the current 72h policy and requires future real capture refresh, not a smoke alignment fix.
- `platform-operations-e2e-smoke.mjs` still launches temporary Next dev servers that can rewrite `next-env.d.ts` / `tsconfig.json`; those build side effects were cleaned before staging.

## Remaining Unrelated Dirty Files

Left untouched:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
- `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

## Timing

- Started: 2026-06-09 19:16 +08:00
- Finished: 2026-06-09 19:28 +08:00
- Elapsed: about 12 minutes
- Workload class: S
- Extra-depth pass: after fixing the original folded-history smoke failure, ran the full daily gate, found and fixed the second trusted-scope curation audit mismatch, rebuilt/restarted 3200, reran the full gate, and used browser live verification with Playwright visibility rather than a brittle DOM visibility helper.

## Main Session Decision

- 需主会话判断: 否
