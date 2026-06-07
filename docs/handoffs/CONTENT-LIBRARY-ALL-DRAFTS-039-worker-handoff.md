# CONTENT-LIBRARY-ALL-DRAFTS-039 Worker Handoff

## Task

Upgrade `/content` from a trusted-dashboard content view into a real content workbench:

- show all local contents, including drafts;
- show action-generated drafts and idea-to-content drafts;
- show platform versions, queue, and action references;
- clearly label whether each item enters trusted dashboard/review;
- keep dashboard/reviews trusted default totals unchanged.

## Completed Work

- Added a dedicated content workbench data contract:
  - `ContentWorkbenchSnapshot`
  - `ContentWorkbenchContentRow`
  - source/origin classification for trusted creator-center, local draft, action-item generated, idea converted, manual import, external untrusted, and unknown local content.
- Added `SelfMediaService.contentWorkbench()` that reads all local repo contents directly instead of reusing `dashboard().contents`.
- Added `/api/self-media/content-workbench` and switched `/content` server-side data loading to `getSelfMediaContentWorkbench()`.
- Updated `/content` UI to show:
  - all local contents;
  - platform versions;
  - queue counts;
  - action-generated draft counts;
  - idea-to-content counts;
  - per-content origin/source;
  - "进入运营看板" / "不进运营看板" labels and reasons.
- Kept existing dashboard/reviews trusted default logic unchanged.
- Added a content workbench service contract test proving manual/imported/external rows remain stored and visible in workbench while trusted totals stay unchanged.
- Added UI harness checks that `/content` uses the dedicated content workbench API, not dashboard data.
- Saved screenshot evidence:
  - `.local/screenshots/CONTENT-LIBRARY-ALL-DRAFTS-039-content.png`

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/content-workbench/route.ts`
- `src/app/content/page.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`

Note: the worktree already had broad pre-existing dirty/untracked state before this task. This handoff lists the files touched for this worker task; unrelated existing dirty files were not reverted.

## Verification

- `npm run test:self-media`: PASS, 119/119.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.
- Screenshot capture: PASS.
  - URL used: `http://127.0.0.1:3211/content`
  - Text probe confirmed: `内容工作台口径`, `本地全部内容`, and trusted dashboard labels.

## Boundary Checks

- Dashboard/reviews default trusted scope was not changed.
- Manual imports, CSV/external untrusted rows, local drafts, and workflow drafts remain excluded from trusted dashboard/review totals unless they have trusted creator-center content-level metric snapshots.
- No publish API behavior changed.
- No real platform API calls added.
- No WeChat backend scope resumed.
- No Bilibili account metric durable save added.
- No database row deletion, migration, or cleanup performed.

## Known Issues / Follow-up

- `/content` now has the correct workbench data model and labels, but table density is still high with large local datasets. A later UI polish task can improve filtering/search/pagination.
- The temporary dev server was started on port `3211` for screenshot capture. It can be reused for manual inspection or stopped by the main session if no longer needed.

## Needs Orchestrator Decision

Yes.
