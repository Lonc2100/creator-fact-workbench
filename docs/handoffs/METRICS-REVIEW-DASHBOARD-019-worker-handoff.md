# METRICS-REVIEW-DASHBOARD-019 Worker Handoff

## Scope

- Task: make dashboard/reviews metrics from Douyin, Xiaohongshu, and Video Account imports more credible and explainable.
- Read first: `AGENTS.md`, platform priority decision, three platform orchestrator reviews, and `UI-POLISH-009` summary.
- Boundary kept: no collector changes, no raw payload changes, no WeChat Official Account backend work, no service/repo import behavior rewrite.

## What Changed

- Added read-only `metricSourceGroups` and `metricPlatformGroups` to `DashboardSnapshot`.
- Added service-level aggregation from existing `metricSnapshots`, keyed against existing `metrics` by `contentId/platform/date` to show whether snapshots participate in review metrics.
- Updated dashboard metric entries to prefer `metricSnapshots` and only use `metrics` as fallback when no matching snapshot exists, avoiding UI double-counting after platform imports.
- Added dashboard source/platform table showing source, platform, snapshot count, content count, views, latest snapshot date, and review participation.
- Added dashboard recent-import status list showing whether latest imports entered the review metric path.
- Added review source panel before the evidence table, showing weekly/monthly review total, imported snapshot total, platform distribution, source rows, and review participation.
- Kept report body preview after conclusion, KPI, source explanation, and evidence table.
- Added self-media contract test for mixed Douyin/Xiaohongshu/Video Account imports and duplicate Douyin re-import.

## Files Changed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`

## Duplicate Counting Finding

- Existing import path persists provider `metrics` and also creates dated `metricSnapshots`.
- Before this task, dashboard UI merged both lists directly, so saved imported platform metrics could appear twice in dashboard totals.
- Reviews currently generate from `metrics` only, so reviews did not double-count snapshots, but they lacked source/platform explanation.
- New dashboard UI canonicalizes imported metrics as `metricSnapshots` first and uses `metrics` only for rows without a matching snapshot.

## Screenshot

- `.local/metrics-review-dashboard-019.png`
- Captured `/dashboard` at `http://127.0.0.1:3200/dashboard` with Chrome headless.
- Browser plugin screenshot path was attempted first but timed out on CDP screenshot capture; Chrome headless succeeded.

## Verification

- `npm run test:self-media` -> pass, 39 tests.
- `npm run typecheck` -> pass.
- `npm run verify:harness` -> pass.
- `git diff --check` -> pass.

## Residual / Needs Attention

- Review source/platform groups are dashboard snapshot aggregates, not strict weekly/monthly date-window filtered groups. This preserves current review generator behavior and avoids changing backend review logic.
- Existing seeded/historical metrics can still include non-priority platforms in platform contribution displays; this task did not build or expand WeChat Official Account backend.
- `includedInReview` is based on the existing `metrics` match by `contentId/platform/date`; if future imports support multiple captures per content/platform/date, backend may need an explicit metric lineage id.

## Main Session Decision

- Needs main-session judgment: yes, only if strict weekly/monthly date-window filtering of imported snapshots should be specified for backend follow-up.
