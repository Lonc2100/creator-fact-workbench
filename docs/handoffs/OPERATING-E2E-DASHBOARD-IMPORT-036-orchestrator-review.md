# OPERATING-E2E-DASHBOARD-IMPORT-036 Orchestrator Review

## Decision

Accepted after main-session hardening.

The operating E2E is accepted as the cross-page daily operations proof for `/dashboard` and `/import`.

## Accepted Behavior

- `npm run smoke:operating-dashboard-import` starts an isolated Next dev server and isolated sqlite DB.
- The smoke opens `/dashboard`, confirms safe weekly summary, post-import suggestions, and internal action items.
- The smoke converts one suggestion through the UI, confirms the conversion through the dashboard API, and moves an action item to `done`.
- The smoke opens `/import`, confirms assisted refresh command cards, and verifies opening `/import` does not mutate `operationHistory`.
- The smoke scans visible text for forbidden raw/sensitive terms.

## Main Session Fixes

- Fixed the operation-history assertion to read `snapshot.operationHistory` instead of a non-existent `snapshot.platformOperationHistory`.
- Replaced brittle waiting for `已转任务` text with a dashboard API wait for converted suggestion plus created action item.

## Main Session Decision

Accepted as the current browser-level operating smoke.

The smoke may reuse the global `.local/platform-data-health/report.json` if it exists. This is acceptable for current UI evidence, but a future hardening task can make the health report fully isolated as well.

## Main Session Verification

Reran:

- `npm run smoke:operating-dashboard-import`: PASS.
- `npm run test:self-media`: PASS, 100/100.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not let this smoke run real platform collection, import preview/save operations, or mutate the real operating DB.
