# ACCOUNT-METRIC-SNAPSHOT-MODEL-023 Worker Handoff

Status: completed
Date: 2026-06-04
Worker: Codex

## Scope

Implemented a generic account-level metric snapshot model and read-only dashboard aggregation for future Bilibili and other platform account trends.

Required reading completed:

- `AGENTS.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-SPEC-022-orchestrator-review.md`
- `docs/product-specs/bilibili-account-metrics-022.md`
- `docs/handoffs/METRICS-REVIEW-DASHBOARD-019-orchestrator-review.md`

Also followed the repository context chain from `AGENTS.md`.

## Completed Work

### Types

- Added `AccountMetricSnapshot`.
- Added `AccountMetricGroup`.
- Added `accountMetricSnapshots` and `accountMetricGroups` to `DashboardSnapshot`.
- Kept the semantic split explicit:
  - `MetricSnapshot` is content/platform-version level.
  - `AccountMetricSnapshot` is platform account/date level.

### Repo

- Added `upsertAccountMetricSnapshot(snapshot)`.
- Added `listAccountMetricSnapshots()`.
- Reused the existing `entities` collection storage pattern with collection name `accountMetricSnapshots`.

### Service

- Added read-only account metric grouping by:
  - `platform`
  - `source`
  - `date`
- Aggregated:
  - `views`
  - `likes`
  - `comments`
  - `saves`
  - `shares`
  - `followersDelta`
  - `engagement`
- Dashboard now reads account snapshots separately and exposes account groups separately.
- Weekly/monthly review generation remains based on content-level `PlatformMetric` and does not consume account snapshots.
- Saved review `metricSnapshotIds` remain content-level metric snapshot ids only.

### Dashboard UI

- Added a compact `账号趋势` panel on `/dashboard`.
- Empty state appears when no real account snapshots exist:
  - `暂无真实账号快照`
  - explains account-level metrics do not enter content-level totals.
- When account groups exist, the panel shows platform, source, date, snapshot count, account-level metrics, and the separation label `账号级独立`.

### Tests

Added coverage for:

- account snapshot upsert idempotency;
- account metrics not affecting content metric totals;
- dashboard reading account groups separately by platform/source/date;
- review totals not mixing account metric snapshots.

## Files Touched In This Task

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/repo/sqlite-self-media-repo.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/ACCOUNT-METRIC-SNAPSHOT-MODEL-023-worker-handoff.md`

Note: the worktree already contained many unrelated modified/untracked files before this task. This worker did not revert or normalize unrelated files.

## Verification

- `npm run test:self-media` passed
  - 57 tests passed
- `npm run typecheck` passed
- `npm run verify:harness` passed
  - includes typecheck, context check, architecture lint, structure/reference/UI/self-media/entropy/agent trajectory tests, and template doctor
- `git diff --check` passed before handoff creation
- Screenshot saved:
  - `.local/account-metric-snapshot-model-023.png`
  - Checked `/dashboard` with Playwright Core.
  - Confirmed `账号趋势` and `暂无真实账号快照` are visible.
  - Confirmed no browser console errors during screenshot capture.

## Boundary Checks

- Did not persist Bilibili `accountMetrics` or `dateKeyRows`.
- Did not add Bilibili account metrics save path.
- Did not add browser collection, login, or platform backend automation.
- Did not store or display raw payload.
- Did not mix account-level metrics into content metric totals.
- Did not mix account-level metrics into weekly/monthly review totals.
- Did not batch delete files.

## Known Notes

- `AccountMetricSnapshot.rawEvidenceRef` is a sanitized reference field only. It should not contain raw payload, cookies, headers, or private platform response bodies.
- Future Bilibili account save work still needs endpoint-level dedupe and semantic acceptance before writing real account snapshots.

## Next Recommendation

Open a follow-up only after Orchestrator accepts a save strategy for one canonical account/day row per platform/source/date, or a safe multi-evidence identity using `rawEvidenceRef`.

Orchestrator decision required: yes
