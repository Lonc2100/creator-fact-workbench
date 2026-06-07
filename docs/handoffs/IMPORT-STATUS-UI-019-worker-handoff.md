# Worker Handoff: IMPORT-STATUS-UI-019

## Task ID

IMPORT-STATUS-UI-019

## Completed Work

- Added a read-only `PlatformImportStatus` summary to the dashboard snapshot.
- Added Service-level status aggregation for the three active creator-center sources:
  - `douyin_creator_center`
  - `xiaohongshu_creator_center`
  - `video_account_creator_center`
- Added a compact "平台导入状态" panel on `/import`.
- The panel shows:
  - latest import run time;
  - latest source;
  - content count;
  - metric count;
  - whether the latest run produced metric snapshots that dashboard/review can read;
  - latest error or warning from `ImportRun`.
- Added a page refresh button only. No real collection button, browser login, or platform automation trigger was added.
- Saved UI screenshot:
  - `.local/import-status-ui-019.png`

## Guardrails Followed

- Did not continue WeChat Official Account backend work.
- Did not add real browser auto-login.
- Did not store raw payloads.
- Did not expose cookies, tokens, request headers, raw body fields, or private message content.
- Did not batch delete files or directories.
- Used existing internal records: `ImportRun` and `MetricSnapshot`.

## Standing On Giants / UI Reference

- Read local UI Harness reference rules and existing Mixpost/Metabase vendor references.
- Chose a compact status table pattern rather than card-heavy dashboard blocks.
- Kept the panel inside `/import`, matching the page boundary that import pages own source selection, field recognition, diff preview, confirm-save, and run records.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/IMPORT-STATUS-UI-019-worker-handoff.md`

Note: these source files were already dirty from earlier work in the current worktree. This task only added the import-status summary and UI surface described above.

## Verification

```text
npm run test:self-media
PASS - 39 tests

npm run typecheck
PASS

npm run verify:harness
PASS

git diff --check
PASS
```

UI screenshot verification:

```text
.local/import-status-ui-019.png
PASS - /import rendered the status panel with all three creator-center sources and no console errors.
```

## Known Issues

- `contentCount` and `metricCount` are derived from the latest run's `MetricSnapshot.importRunId`. This is precise for the current creator-center import path because those imports produce metrics and snapshots. If a future platform import creates content without metrics, this panel may show zero content for that run until the import model records per-run content ids.
- Warnings are shown from `ImportRun.warnings[0]` or `errorMessage`; multiple warnings are not expanded in this compact panel.
- Screenshot capture through the in-app browser CDP timed out, so the saved screenshot was produced with the repository's Playwright/Chrome path against the same local `/import` page.

## Next Recommendation

- Add a later drill-down or run history table only if the user needs to compare multiple import attempts per platform.
- If future imports can create content without metrics, add a durable per-run content id summary before expanding this panel.

## Orchestrator Decision Required

No blocking decision required. Normal Orchestrator review is still recommended because this task touches Types, Service, UI, and tests in a dirty worktree.
