# PLATFORM-RUNBOOK-STATUS-024 Worker Handoff

## Status

Completed.

## Required Reading

- `AGENTS.md`
- `docs/handoffs/PLATFORM-RUNBOOK-019-orchestrator-review.md`
- `docs/handoffs/BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-orchestrator-review.md`
- `docs/handoffs/ACCOUNT-METRIC-SNAPSHOT-MODEL-023-orchestrator-review.md`
- `docs/handoffs/PLATFORM-OPERATION-HISTORY-023-orchestrator-review.md`
- AGENTS core context chain:
  - `docs/context/index.md`
  - `ARCHITECTURE.md`
  - `docs/mainline-framework.md`
  - `docs/task-board.md`

## Completed Work

Updated `docs/handoffs/PLATFORM-RUNBOOK-019.md` only.

Added a `PLATFORM-RUNBOOK-STATUS-024` status section covering:

- current closed-loop platforms:
  - Douyin
  - Xiaohongshu
  - Video Account
  - Bilibili
- Bilibili durable save boundary:
  - only creator-center `archives` works and content-level per-work metrics are accepted;
  - `accountMetrics` and `dateKeyRows` remain diagnostics only;
  - account overview/stat diagnostics, survey/date-key diagnostics, comment body text, danmu text, raw payloads, cookies, tokens, headers, and credentials are not saved.
- Account metric model boundary:
  - `AccountMetricSnapshot` is account/platform/date level;
  - it is separate from content-level `MetricSnapshot`;
  - it does not participate in content totals, weekly/monthly review totals, saved review `metricSnapshotIds`, or content-level dashboard metric totals.
- `/import` operation history boundary:
  - records created time, actor, platform, action, source, status, content count, metric count, warning count/summary, and run id;
  - does not record raw payloads, raw captures, platform response bodies, cookies, tokens, request/auth headers, passwords, or credentials.
- WeChat / Official Account backend remains paused.

Also added:

- a Bilibili runbook section with discover, preview, save, smoke, account diagnostic preview, and mapping boundaries;
- Bilibili-specific validation notes in the field validation checklist;
- an `Account-Level Metrics Model` section;
- an `Import Operation History On /import` section;
- Bilibili row in the quick command matrix;
- a diagnostic command table for Bilibili account metrics preview.

## Boundary Checks

- No business code changed.
- No Types / Repo / Service / Runtime / API / UI changes.
- No batch delete or file cleanup.
- Did not resume WeChat backend work.
- Did not claim Bilibili account metrics are persisted.

## Notes

`docs/handoffs/PLATFORM-RUNBOOK-019.md` is currently untracked in this worktree, so `git diff -- docs/handoffs/PLATFORM-RUNBOOK-019.md` does not show the document body even though the file was updated. `git diff --check` still validates the worktree whitespace state.

Current `package.json` does not expose `npm run smoke:bilibili-save`, although `scripts/bilibili-personal-save-smoke.mjs` exists. The runbook therefore documents the current smoke command as:

```powershell
npx tsx scripts/bilibili-personal-save-smoke.mjs
```

## Verification

- `git diff --check`: PASS

## Main Session Decision

No.
