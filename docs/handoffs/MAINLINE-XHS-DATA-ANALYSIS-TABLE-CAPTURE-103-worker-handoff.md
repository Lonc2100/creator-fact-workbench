# MAINLINE-XHS-DATA-ANALYSIS-TABLE-CAPTURE-103 Worker Handoff

Started: 2026-06-08 18:09:41 +08:00
Finished: 2026-06-08 19:14:14 +08:00
Elapsed: 1h04m33s
Workload class: medium

## Scope

- Changed the Xiaohongshu authenticated-browser main preview path from single-note detail discovery to creator-backend content-analysis table capture.
- Target page: `https://creator.xiaohongshu.com/statistics/data-analysis`.
- Detail-page preview remains available as a fallback preview, but Xiaohongshu trusted save candidates now require the data-analysis table source.
- Did not save password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, real platform DOM, or screenshots.

## 101 Commit

- 101 was already committed.
- Commit hash: `4272463`
- Commit message: `fix(self-media): reject unsafe xiaohongshu detail candidates`

## Implementation

Changed files:

- `src/domain/self-media/types/self-media-types.ts`
  - Added `creator_center_data_analysis_table` source kind.
  - Added `owned_creator_center_data_analysis_table` confidence.
  - Added optional Xiaohongshu preview fields for exposure, cover click rate, parsed columns, and missing metric columns.
  - Added optional `selectedNativeIds` for explicit save subsets.
- `src/domain/self-media/providers/creator-center-row-selector.ts`
  - Added `selectXiaohongshuCreatorCenterDataAnalysisTableRows`.
  - Parses each content-analysis table row as one note.
  - Maps same-row columns: exposure, views/watch, cover click rate, likes, comments, saves, followers delta, shares.
  - Treats `-` as missing and records missing-column warnings.
  - Does not parse date cells as metrics.
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
  - Xiaohongshu trusted browser save now accepts only data-analysis table rows with stable ID, title, publish time, and major metrics.
  - Detail rows and aggregate rows remain preview/diagnostic only for trusted save.
- `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
  - `capture_preview` now prepares `数据看板 -> 内容分析 -> 笔记数据`.
  - Extracts visible table/grid rows from `statistics/data-analysis`.
  - Allows public explore URLs only as stable ID source, not as a trusted data source.
  - Attempts safe operation/detail-cell click ID enrichment, reading only fresh URL/detail-root/performance-resource ID matches and returning to creator backend.
  - Recomputes each row's click target by title immediately before clicking, so a post-navigation layout shift cannot bind one row to another row's ID.
  - Accumulates table rows across the analysis table surface instead of returning after the first viewport.
  - Allows normal note titles that contain metric words such as `分享`; metric-word rejection is now limited to pure metric cells like `分享` or `分享 12`.
  - Added a local-only sanitized `diagnose_data_analysis_table` action for structural selector debugging without DOM/text/screenshot/request/response persistence.
  - `save` can now accept explicit `selectedNativeIds`; if provided IDs do not match current save candidates, it fails closed instead of saving all rows.
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Button text changed to `读取内容分析表格`.
  - Preview copy now states: `来自小红书创作者后台内容分析表格`, `每行一条笔记`, `保存前人工确认`.
- `tests/self-media-contract.test.ts`
  - Added synthetic data-analysis table selector/save test.
  - Locked missing `-` handling and date-not-as-share behavior.
  - Added duplicate-native-ID conflict test so two different titles cannot share one trusted native ID.
- `tests/ui-harness.test.mjs`
  - Updated import UI contract for the new Xiaohongshu table path.

## Live Acceptance

Fixed entry verified:

- Opened `http://localhost:3200/dashboard`.
- Then opened `http://localhost:3200/import`.
- UI showed the Xiaohongshu login-capture flow and the new `读取内容分析表格` copy.

Live Xiaohongshu table preview:

- Open: ok.
- Creator backend reached.
- Preview action: `capture_preview`.
- Page: `https://creator.xiaohongshu.com/statistics/data-analysis`.
- Result: table rows were captured.
- Row count: 7.
- Metric row count: 7.
- Save candidate count: 7.

Parsed columns:

- Succeeded:
  - title from note basic-info cell
  - publish time from note basic-info cell
  - exposure on rows where the column value was visible
  - views/watch
  - cover click rate on rows where the column value was visible
  - likes
  - comments
  - saves
  - followers delta on rows where the column value was visible
  - shares
- Missing on at least one visible row:
  - exposure
  - cover click rate
  - followers delta
- Stable ID:
  - succeeded for all 7 live rows.
  - The visible table rows did not expose direct `href`, `data-note-id`, `noteId`, or `explore/<id>` attributes.
  - Safe operation/detail-cell click enrichment yielded stable note IDs from navigation/resource URL patterns, then returned to the creator backend table.
  - A transient duplicate-ID bug was found during re-preview and fixed before save: the 6th row briefly inherited the 3rd row's ID. After the fix, the 6th row resolves to its own stable ID and duplicate conflicting IDs are rejected provider-side.
  - A screenshot review showed a 7th visual row. It was missed because the title contained `视觉分享`, and the old title filter treated any `分享` text as a metric label. The filter now keeps normal titles with metric words while still rejecting metric cells.

Stable ID spot check after fix:

- Row 1: `6a2682db0000000016027e09`
- Row 2: `6a22b92d000000001503ebb5`
- Row 3: `6a1d7004000000003601d378`
- Row 4: `6a19a58f000000003601edaf`
- Row 5: `6a186c03000000003601aa0a`
- Row 6: `6a0e6e060000000036031273`
- Row 7: `6a097ad70000000036030bff`

## Save / Dashboard / Calendar

- Saved: yes.
- Saved rows: 7.
- Import run: `import-xiaohongshu_creator_center-1780917161737`.
- User confirmation: yes, user explicitly confirmed saving all Xiaohongshu rows.

Dashboard and calendar:

- Before live preview:
  - trusted contents: 13
  - metric snapshots: 13
  - metrics: 13
  - calendar items: 195
- After save:
  - trusted contents: 20
  - metric snapshots: 21
  - metrics: 21
  - calendar items: 195
- Dashboard delta:
  - trusted contents: +7
  - metric snapshots: +8
  - metrics: +8
  - calendar items: +0
- Calendar polluted: no new calendar items. One saved content ID already had a pre-existing calendar entry, but the save did not add historical/import cards to the default calendar grid.

Metric delta note:

- The save wrote 7 current-date snapshots for the 7 saved rows.
- One selected content ID already had an older visible metric snapshot, so after the content row was created the trusted dashboard surfaced 8 snapshots for the 7 saved content IDs.

## Current State

The implementation now reaches the requested Xiaohongshu content-analysis table path, captures all 7 screenshot-confirmed table rows, and saved them after explicit user confirmation.

- Table locating: succeeded.
- Row locating: succeeded, 7 rows.
- Column mapping: succeeded for title, publish time, views/watch, likes, comments, saves, shares, and mostly exposure / cover click rate / followers delta.
- ID: succeeded through safe operation/detail-cell click enrichment.
- Save confirmation: completed.
- Save subset support: implemented through `selectedNativeIds`.

Next specific repair point:

- None for 103 mainline. Future hardening could add a screenshot-assisted row-count sanity check when the visible table count and preview count differ.

## Validation

- `git diff --check`: pass.
- `npm run typecheck`: pass.
- `npm run test:self-media`: pass, 149 tests.
- `npm run test:ui-harness`: pass, 19 tests.
- `NEXT_DIST_DIR=.next-build-103-main npm run build`: pass.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: pass on port 3200. One retry was needed after a transient safe-weekly timeout.

Build note:

- `next build` temporarily rewrote `next-env.d.ts` and `tsconfig.json` for `.next-build-103-main`; those generated changes were restored and are not part of 103.

## Dirty Worktree Notes

Unrelated dirty files left untouched:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

103 intentionally leaves implementation changes uncommitted for main-session review.

需主会话判断: 是
