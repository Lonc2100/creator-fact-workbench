# MAINLINE-CREATOR-DAY-WORKFLOW-LIVE-063 Worker Handoff

## Runtime

- Started: 2026-06-06
- Finished: 2026-06-06
- Workload class: M

## Scope

- Run the mainline as a real creator day workflow:
  - fixed entry: `http://localhost:3200/dashboard`
  - schedule first
  - generate content discussion and four platform versions
  - use publish handoff package
  - manually record submitted review / published
  - return to import for data recovery
  - match recovered metrics back to the local content
- Do not restore WeChat Official Account.
- Keep Bilibili account metrics preview-only.
- Do not call real publish APIs.
- Do not save sensitive login material or platform raw request material.
- Do not batch delete.

## Live Workflow Result

Live object:

- Title: `063 creator day workflow 1780719836334`
- Content ID: `content-creator-1bcd782cad02`
- Douyin version ID: `version-content-creator-1bcd782cad02-douyin`
- Xiaohongshu version ID: `version-content-creator-1bcd782cad02-xiaohongshu`
- Imported Douyin creator-center content ID: `dy-063-creator-day-1780719836334`

Live steps:

- PASS: opened `http://localhost:3200/dashboard`, status 200.
- PASS: generated discussion draft with a pre-filled schedule.
  - discussion drafts: 4
- PASS: saved four platform versions with the same scheduled time.
  - platform versions: 4
- PASS: publish handoff packages appeared for the created content.
  - handoff packages: 4
- PASS: recorded Xiaohongshu as `submitted_review`.
  - publish record status: `submitted_review`
- PASS: recorded Douyin as `published`.
  - version status: `published`
- PASS: imported local JSON payload with `douyin_creator_center` source through `/api/self-media/import`.
  - import status: `success`
- PASS: publish-to-metrics workbench produced an imported-content match candidate.
  - candidate score: 1
- PASS: matched recovered metric snapshot back to the local Douyin platform version.
  - matched snapshots: 1
- PASS: final publish records for the local content: 2

## What Changed

- Added an integrated creator-day contract test:
  - `creator day workflow runs from schedule and platform drafts to handoff publish and metric match`
- The test locks the daily workflow:
  - scheduled creator draft
  - discussion drafts
  - four active platform versions
  - four publish handoff packages
  - Xiaohongshu submitted-review ledger record
  - Douyin published ledger record
  - local creator-center JSON import
  - content match candidate
  - metric snapshot attribution to the local platform version
- No product UI or service behavior changes were needed after the live walkthrough.

## Files Changed

- `tests/self-media-contract.test.ts`
- `docs/handoffs/MAINLINE-CREATOR-DAY-WORKFLOW-LIVE-063-worker-handoff.md`

## Verification

- PASS: `npm run typecheck`
- PASS: `npm run test:self-media`
  - 129 tests passed.
- PASS: `npm run test:ui-harness`
  - 15 tests passed.
- PASS: `npm run build`
  - Route table shows 29 routes; paused WeChat sync route remains absent.
- PASS: `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - healthy port: 3200
  - API ready: 3200
  - trusted data ready: 3200
  - page ready: 3200
- PASS: `git diff --check`

## Live Page Verification

Fixed host: `http://localhost:3200`

- PASS: `/content` returned 200.
- PASS: `/calendar` returned 200.
- PASS: `/import` returned 200.
- PASS: `/dashboard` returned 200.

## Boundary Notes

- No real publish API was called.
- No platform login material was requested, saved, or surfaced.
- No platform raw request details were stored.
- WeChat Official Account remains paused and no `/api/self-media/wechat/sync` route was restored.
- Bilibili account metrics remain preview-only and were not promoted into content totals.
- The import recovery step used local JSON with creator-center source in the internal fact system; it did not perform browser capture or platform automation.
- Existing unrelated dirty/untracked worktree files were not staged or modified.

## Operator Notes

- The current workflow is usable as a manual daily loop:
  1. Start on `/dashboard`.
  2. Go to `/content#new-video`.
  3. Set schedule before generating/saving the creator draft.
  4. Review four platform versions.
  5. Use publish handoff packages to copy text/tags and open official backends.
  6. Record submitted review or published manually.
  7. Return to `/import` for local data recovery.
  8. Confirm metric match before attribution.
- The only shell issue during this task was a PowerShell nested-script encoding problem; it was not an app issue.
