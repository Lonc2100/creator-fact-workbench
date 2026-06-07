# PLATFORM-OPERATION-HISTORY-023 Worker Handoff

## Task ID

PLATFORM-OPERATION-HISTORY-023

## Completed Work

- Added local-only platform operation history for preview/save/save_smoke operations.
- Added `OperationHistory` as a lightweight internal audit type.
- Reused the existing generic `entities` repo storage via `operationHistory`; no new SQLite table was added.
- Recorded one history row per platform operation summary:
  - single preview/save -> one row;
  - three-platform save smoke -> one row per platform summary.
- Added a compact "recent operation history" table to `/import`.
- Added contract tests for operation history, warning summaries, sensitive redaction, and Bilibili save boundary.
- Saved screenshot:
  - `.local/platform-operation-history-023.png`

## Fields Recorded

Each `OperationHistory` row stores only summary/audit fields:

- `createdAt`
- `actor`
- `platform`
- `action`
- `source`
- `status`
- `contentCount`
- `metricCount`
- `warningCount`
- `warningSummary`
- `runId`

No raw payload, cookies, tokens, request headers, raw captures, or platform response bodies are stored in history.

## Behavior

- `preview` operations are now traceable even though they still do not create `ImportRun`.
- `save` operations remain traceable through both existing `ImportRun` and the new operation history summary.
- `save_smoke` records per-platform rows so the UI can show exactly which platform passed or failed.
- Bilibili save remains disabled:
  - preview can record success;
  - save records `disabled`;
  - save success is not recorded while Bilibili save-smoke is not accepted.
- WeChat/Official Account backend remains paused and no operation button was added.
- No browser collection button was added.

## UI

`/import` now shows a compact operation history table inside the platform import status panel.

Visible columns:

- time
- platform
- action
- source
- status
- content/metric counts
- warning count and summary
- run ID

## Files Changed By This Task

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/PLATFORM-OPERATION-HISTORY-023-worker-handoff.md`

Note: the worktree already contained many unrelated modified/untracked files before this task. I did not revert or clean them.

## Verification

- `npm run test:self-media`: PASS, 57 tests.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.
- Screenshot saved: `.local/platform-operation-history-023.png`.

## Orchestrator Decision Required

Yes. Main session should decide whether this local `OperationHistory` shape should remain UI-only/internal audit, or later be promoted into a broader cross-tool operations ledger.
