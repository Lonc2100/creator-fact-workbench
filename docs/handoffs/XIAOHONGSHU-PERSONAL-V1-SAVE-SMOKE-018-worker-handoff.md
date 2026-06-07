# XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018 Worker Handoff

Status: completed
Date: 2026-06-04

## Scope

Implemented the V1 save smoke for Xiaohongshu personal creator-center imports.

This round verifies that the sanitized local discovery captures can be saved through the existing provider/runtime path, then observed through repo-backed dashboard data, review totals, metric snapshots, and platform versions. It does not add new raw capture, UI, API, or persistence schema behavior.

## Files Changed

- `scripts/xiaohongshu-personal-save-smoke.mjs`
- `package.json`
- `docs/handoffs/XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md`

## Commands Run

- `node --check scripts/xiaohongshu-personal-save-smoke.mjs`
- `npm run import:xiaohongshu -- --save`
- `npm run smoke:xiaohongshu-save`
- `npm run typecheck`
- `npm run test:self-media`
- `npm run verify:harness`
- `git diff --check`
- tracked-file sensitive-pattern scan including this handoff

## Save Smoke Result

Command:

```powershell
npm run smoke:xiaohongshu-save
```

Result: PASS

Report:

- `.local/xiaohongshu-personal-v1/save-smoke-report.json`

Key report facts:

- `passed`: `true`
- `source`: `xiaohongshu_creator_center`
- `contentCount`: `1`
- `metricCount`: `1`
- `importRunId`: `import-xiaohongshu_creator_center-1780507863760`
- `contentIds`: `6a1d7004000000003601d378`
- `checks.contents`: `1`
- `checks.metrics`: `1`
- `checks.platformVersions`: `1`
- `checks.metricSnapshots`: `1`
- `checks.dashboardContents`: `1`
- `checks.dashboardMetrics`: `1`
- `checks.dashboardMetricSnapshots`: `1`
- `checks.dashboardPlatformVersions`: `1`
- `checks.expectedXiaohongshuViews`: `10667`
- `checks.weeklyReviewTotalViews`: `211708`
- `checks.monthlyReviewTotalViews`: `211708`
- safety checks: all `ok: true`

The smoke script writes only local evidence under `.local/xiaohongshu-personal-v1/`.

## Direct Save Command Result

Command:

```powershell
npm run import:xiaohongshu -- --save
```

Result: PASS

Observed output:

- `outPath`: `.local/xiaohongshu-personal-v1/mapping-preview.json`
- `source`: `xiaohongshu_creator_center`
- `contentCount`: `1`
- `metricCount`: `1`
- `saved`: `true`
- warnings:
  - skipped one topic/detail recommendation capture to avoid importing public notes
  - merged one `note_detail_new` capture with the latest known personal note id

## Implementation Notes

- Added `smoke:xiaohongshu-save` npm script.
- Added a repeatable smoke script that:
  - loads sanitized raw captures from `.local/xiaohongshu-personal-v0/raw/`
  - maps captures with `XiaohongshuPersonalProvider`
  - saves through `importXiaohongshuPersonalCaptures`
  - verifies saved content, metrics, platform versions, metric snapshots, import runs, dashboard data, and review totals
  - writes `.local/xiaohongshu-personal-v1/mapping-preview.json` with `saved: true`
  - writes `.local/xiaohongshu-personal-v1/save-smoke-report.json`

The smoke script calls the runtime import function directly instead of nesting `npm run import:xiaohongshu -- --save` inside another `tsx` process. The direct save command was still run separately for acceptance evidence. This avoids the nested `tsx -> npm -> tsx` timeout seen on the local overloaded Windows node process environment while preserving the same runtime save path.

## Safety And Boundaries

- No user account password was requested.
- No cookies, tokens, or auth headers were saved to tracked files.
- Raw captures remain under `.local/xiaohongshu-personal-v0/raw/`.
- Smoke outputs remain under `.local/xiaohongshu-personal-v1/`.
- `.local/` is git-ignored; confirmed for smoke report and local SQLite DB before writing this handoff.
- No raw capture data was copied into docs, tests, or Git-tracked artifacts.
- No Repo/Service/Runtime/API behavior was changed in this round.
- No dashboard, review, or calendar UI was changed in this round.
- No files were deleted.

## Coverage

Confirmed in local SQLite-backed runtime data:

- Xiaohongshu content saved
- Xiaohongshu metrics saved
- Xiaohongshu platform version saved
- Xiaohongshu metric snapshot saved
- Xiaohongshu import run recorded
- Dashboard includes the saved content and metric
- Weekly and monthly review totals include the imported view count

## Known Issues / Follow-ups

- Re-running the smoke creates another import run while upserting the same content and current metric/platform-version records.
- Current sanitized capture set maps one personal note. Comment content/account aggregates remain outside this save smoke.
- The provider intentionally skips recommendation/topic/detail captures that look like public-note browsing rather than the user's own creator-center data.

## Verification

- `node --check scripts/xiaohongshu-personal-save-smoke.mjs`: PASS
- `npm run import:xiaohongshu -- --save`: PASS
- `npm run smoke:xiaohongshu-save`: PASS
- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS, 37 tests
- `npm run verify:harness`: PASS
- `git diff --check`: PASS
- tracked-file sensitive-pattern scan including this handoff: PASS, no credential-shape matches

## Orchestrator Decision Required

No.
