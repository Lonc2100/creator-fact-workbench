# MAINLINE-PUBLISH-TO-METRICS-CLOSED-LOOP-059 Worker Handoff

## Runtime

- Started: 2026-06-06T10:46:17.3708281+08:00
- Finished: 2026-06-06T11:05:28.6939991+08:00
- Elapsed: 19m 11s
- Workload class: M

## Mature Reference

- Reviewed the requested mature workflow references as operating models: Buffer draft/schedule/queue, Hootsuite publishing planner, Mixpost docs, and Postiz.
- Borrowed workflow shape only: draft -> schedule -> due workbench -> explicit manual publish confirmation -> post-publish refresh -> manual matching before metrics attribution.
- No external code copied.

## What Changed

- Added a shared `publishToMetricsWorkbench` snapshot to dashboard and content workbench data.
- Added publish execution items for four active content platforms:
  - due/overdue scheduled versions
  - published versions waiting for metric recovery
  - failed/blocked versions needing draft handling
- Added manual post-publish recovery model:
  - published local version without trusted content-level metric snapshot becomes a `/import` refresh candidate
  - import page now shows a "发布后刷新" area
  - manual refresh copy states this is local manual sync, not platform callback
- Added conservative imported-content matching:
  - platform must match
  - title similarity and publish-time window produce candidates only
  - no automatic attribution
  - user confirmation copies trusted creator-center content-level snapshots onto the local content/platform version
  - imported duplicate content is excluded from default trusted dashboard scope to avoid double counting
- Added dashboard/content UI entry:
  - dashboard compact "今日/近期待发布" panel
  - content full "发布执行台" with open content, open calendar, confirm published, record failed, record blocked, and import refresh link
- Added `/api/self-media/content-versions` action `match_imported_content`.

## Boundary Notes

- No real platform publish API is called.
- Publish records remain manual ledger facts and do not become trusted metrics.
- WeChat/公众号 remains paused; no active backend promise added.
- Bilibili account metrics remain preview-only / separate account-level data and are not content durable totals.
- No cookie/token/header/raw payload is persisted or shown in default UI; visible copy uses abstract sensitive-material wording.
- Local live验收草稿 was intentionally retained per boundary.

## Verification

- PASS: `git diff --check`
  - Note: existing warning only: `tsconfig.json` CRLF will be replaced by LF if Git touches it.
- PASS: `npm run typecheck`
- PASS: `npm run test:self-media`
- PASS: `npm run test:ui-harness`
- PASS: `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- PASS: `npm run build`
  - Used to confirm page compilation while diagnosing default `.next` dev cache issue.

## Live Acceptance

Server:
- Started with `npm run dev:operator` on `http://127.0.0.1:3200`.
- Strict health passed after compile warm-up.

Live test object retained:
- contentId: `content-creator-9134d966c73f`
- title: `059 live 发布闭环验收 1780715041380`
- publishedVersionId: `version-content-creator-9134d966c73f-douyin`
- publishRecordId: `publish-record-version-content-creator-9134d966c73f-douyin-f75c8a4ca7f1`
- matchedMetricSnapshotId: `snapshot-match-version-content-creator-9134d966c73f-douyin-2026-06-06-6abbac94e43d`

Live verified:
- `/dashboard`: 200, publish execution entry visible, no WeChat active promise.
- `/content`: 200, publish execution workbench visible.
- `/calendar`: 200, local schedule/publish ledger surface still reachable.
- `/import`: 200, post-publish refresh and manual refresh entry visible.
- Created a scheduled four-platform creator draft.
- Confirmed due scheduled item appeared in publish execution workbench.
- Manually confirmed Douyin version as published.
- Verified publish record was written.
- Saved a trusted Douyin creator-center content-level import with a similar title.
- Verified match candidate appeared.
- Confirmed match to local content/platform version.
- Verified matched metric snapshot became visible for the local content/platform version.
- Verified no WeChat restored promise and no Bilibili account durable totals promise.

## Files Changed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/content-versions/route.ts`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-PUBLISH-TO-METRICS-CLOSED-LOOP-059-worker-handoff.md`

## Residual Notes

- Existing worktree has many unrelated modified/untracked files. Only the files above belong to 059.
- Default `npm run dev` continued to show a Next dev webpack runtime cache error on `/dashboard` even after restart, while API was healthy and `npm run build` passed. `npm run dev:operator` with isolated `.next-operator` passed live health after warm-up.
