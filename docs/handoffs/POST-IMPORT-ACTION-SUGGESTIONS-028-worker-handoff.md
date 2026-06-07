# POST-IMPORT-ACTION-SUGGESTIONS-028 Worker Handoff

Status: completed
Date: 2026-06-04
Worker: Codex

## Scope

Implemented deterministic post-import operating suggestions after four-platform content-level imports. The suggestions are read-only derived dashboard state and do not add platform collection, login, or raw payload handling.

Required reading completed:

- `AGENTS.md`
- `docs/handoffs/REVIEWS-FOUR-PLATFORM-EXPLAIN-026-orchestrator-review.md`
- `docs/handoffs/PLATFORM-OPS-FOUR-024-orchestrator-review.md`
- `docs/handoffs/PLATFORM-DATA-HEALTH-UI-027-orchestrator-review.md`

Also followed the repository context reading chain from `AGENTS.md`.

## Completed Work

### Types

- Added `PostImportActionSuggestionType`.
- Added `PostImportActionEvidence`.
- Added `PostImportActionSuggestion`.
- Added `postImportActionSuggestions` to `DashboardSnapshot`.

Evidence fields include:

- `platform`
- `contentId`
- `source`
- `metricSnapshotId`
- `importRunId`

### Service

- Added `buildPostImportActionSuggestions(...)` in `self-media-service`.
- Suggestions are generated from content-level `MetricSnapshot` rows and existing platform data health view.
- Added suggestion families:
  - high-performing content reuse;
  - low-engagement content review;
  - platform priority;
  - Bilibili archives content-level prompt;
  - data health anomaly reminder.
- Account-level snapshots are not used for content totals or suggestion ranking.
- Bilibili account diagnostics remain outside content-level aggregation.

### Dashboard UI

- Added compact `导入后行动建议` panel on `/dashboard`.
- Shows priority, suggestion type, summary, next action, and first evidence reference.
- Empty state remains compact when no suggestions exist.
- No collection, save, or browser automation buttons were added.

### Tests

Added coverage for:

- four-platform suggestions and evidence;
- Bilibili archives content-level suggestion;
- account-level metrics not appearing in content suggestion totals;
- data health anomaly suggestion from the read-only health report.

## Files Touched In This Task

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/POST-IMPORT-ACTION-SUGGESTIONS-028-worker-handoff.md`

Note: the worktree already contained many unrelated modified/untracked files before this task. This worker did not revert or normalize unrelated files.

## Verification

- `npm run test:self-media` passed
  - 73 tests passed
- `npm run typecheck` passed
- `npm run verify:harness` passed
  - includes typecheck, context check, architecture lint, structure/reference/UI/self-media/entropy/agent trajectory tests, and template doctor
- `git diff --check` passed before handoff creation
- Screenshot saved:
  - `.local/post-import-action-suggestions-028.png`
  - Checked `/dashboard` with Playwright Core.
  - Confirmed `导入后行动建议` panel is visible.
  - Confirmed suggestion content or compact empty state is visible.
  - Confirmed no browser console errors during screenshot capture.

## Boundary Checks

- Did not use `AccountMetricSnapshot` in content totals.
- Did not add Bilibili account metric save.
- Did not add platform browser collection, login, or backend automation.
- Did not accept or display raw payload.
- Did not execute platform data health from UI.
- Did not batch delete files.

## Known Notes

- Suggestion rules are deterministic and intentionally simple. They rank content-level snapshots by performance, flag low interaction by engagement rate, and use the read-only health view for anomaly reminders.
- The current data health reminder can appear when the health report is missing or non-ok, which matches the 027 read-only health panel behavior.

## Next Recommendation

Orchestrator can review whether these suggestions should later become persisted action items. This task intentionally keeps them as read-only dashboard guidance.

Orchestrator decision required: yes
