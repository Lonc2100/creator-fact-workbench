# REVIEWS-FOUR-PLATFORM-EXPLAIN-026 Worker Handoff

## Scope

- Task: make weekly/monthly reviews explain four platform content-level sources, Bilibili archives participation, and account-level metric separation.
- Read first: `AGENTS.md`, `METRICS-REVIEW-DASHBOARD-019-orchestrator-review.md`, `PLATFORM-OPS-FOUR-024-orchestrator-review.md`, `DASHBOARD-FOUR-PLATFORM-POLISH-025-orchestrator-review.md`, `ACCOUNT-METRIC-SNAPSHOT-MODEL-023-orchestrator-review.md`.
- Boundary kept: no collector/raw payload changes, no Repo persistence semantics changes, no AccountMetricSnapshot mixing into content totals.

## Changes

- Review markdown now includes a `四平台内容级贡献` section for Douyin, Xiaohongshu, Video Account, and Bilibili.
- Review markdown marks Bilibili as `archives 内容级指标`.
- Review markdown includes an `账号级趋势边界` note stating AccountMetricSnapshot stays separate and does not count toward content count, total views, total engagement, or best platform.
- Review action copy now says to import Douyin/Xiaohongshu/Video Account/Bilibili content-level backend data instead of mentioning WeChat Official Account.
- Reviews page now always shows four platform content-level contribution rows.
- Bilibili row is labeled as archives content-level metrics.
- Reviews page now shows AccountMetricSnapshot as a separate account trend strip with count/views and explicit non-inclusion in content totals.
- Source/evidence/report layout was tightened: source table no longer squeezes into a narrow second column, and report preview max height was reduced.
- Added a self-media contract test covering four-platform review totals, Bilibili content-level participation, and account metrics exclusion.

## Files Touched

- `src/domain/self-media/service/review-service.ts`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`

## Screenshot

- `.local/reviews-four-platform-explain-026.png`
- Captured `/reviews` at `http://127.0.0.1:3200/reviews` with Chrome headless.

## Verification

- `npm run test:self-media` -> pass, 66 tests.
- `npm run typecheck` -> pass.
- `npm run verify:harness` -> pass.
- `git diff --check` -> pass.

## Residual Notes

- Existing saved review history can still show older markdown summaries until newly saved reviews are generated.
- The review platform contribution section is generated from current content-level `PlatformMetric[]`; AccountMetricSnapshot remains dashboard/review UI context only and is not passed into `generateReview`.
- This task did not introduce strict date-window filtering for source/platform groups; it follows the accepted 019 follow-up boundary.

## Main Session Judgment

- Required: yes, per task instruction. Main session may decide whether strict weekly/monthly date-window grouping should become a backend follow-up.
