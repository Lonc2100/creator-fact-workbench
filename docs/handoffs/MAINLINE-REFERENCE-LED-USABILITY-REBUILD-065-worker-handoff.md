# MAINLINE-REFERENCE-LED-USABILITY-REBUILD-065 Worker Handoff

## Runtime

- Started: 2026-06-06
- Finished: 2026-06-06
- Workload class: mainline usability rebuild

## Scope

- Rebuild `/dashboard`, `/content`, `/calendar`, and `/import` around task-first creator workflow.
- Keep the workflow manual and compliant:
  - no real publish API calls
  - no cookie/token/password/header/raw payload storage
  - WeChat Official Account remains paused
  - Bilibili account metrics remain preview-only
  - no batch deletion
- Commit and push precisely after verification.

## Reference Check

Used official/help-center product references for mature workflow shape. No external code was copied.

- Metricool calendar scheduling: calendar-first scheduling from selected dates/times, platform selection, and preview before scheduling.
- Buffer multi-channel composer: one composer prepares content for multiple channels, then platform-specific copy/timing is reviewed.
- Later drag/drop calendar scheduling: visual calendar and draggable unscheduled media/content are primary workflow objects.
- Hootsuite idea/post/calendar workflow: planner/calendar exposes empty slots, post cards, status, and editing from a calendar workflow.

Reference links:

- https://help.metricool.com/how-to-schedule-content-from-the-calendar-q8ymv
- https://support.buffer.com/hc/en-us/articles/360035587394-Scheduling-posts
- https://help.later.com/hc/en-us
- https://help.hootsuite.com/hc/en-us/articles/1260804306069-Create-and-schedule-content-in-a-calendar

## Implemented

### `/dashboard`

- Added `开始今天创作流程` as the first creator-day entry.
- First screen now shows:
  - start new video
  - open calendar
  - recover post-publish data
  - counts for pending manual publish, recovery, and metric matching
- Existing dashboard data panels and diagnostics remain below and folded as before.

### `/content`

- Added first-screen `当前任务 / 下一步动作`.
- Top workflow now explicitly reads:
  - 新视频
  - 引用到日历
  - 生成四平台版本
  - 发布交接包
- Publish handoff area is linked from the top task panel.
- Historical/all-content filters remain lower on the page.
- Service now excludes already-published platform versions from publish handoff packages, preventing imported/recovered content from appearing as publishable cards.

### `/calendar`

- Added first-screen `当前任务 / 下一步动作` with clear date-first instructions.
- Calendar now defaults to the current week instead of anchoring to the densest historical date.
- Empty operating time cells are visible and clickable.
- Clicking an empty date/time cell opens a lightweight `新增排期` panel and does not change data.
- Clicking an existing card still opens details only.
- Fixed CSS pointer events so empty-slot buttons are actually clickable.

### `/import`

- First screen now focuses on `发布后回收当前任务`.
- Current recovery table filters out already-attributed items and paused-WeChat-related titles.
- Historical import, platform sync, data freshness, manual import, and diagnostics are folded below.
- Current match candidates are limited to currently visible recovery tasks.

### Service / State

- Published versions only enter post-publish recovery if they have an actual manual publish record.
- Imported creator-center content no longer re-enters publish handoff or current recovery as an action item.
- `submitted_review` publish records now produce next-action copy that says to wait for platform review and then confirm published/failed.

## Boundaries Preserved

- Four active content platforms remain 抖音 / 小红书 / 视频号 / B站.
- WeChat Official Account was not restored; paused-WeChat rows are hidden from default current task surfaces.
- Bilibili account metrics remain preview-only.
- No API publishing, browser automation publishing, credentials, raw request payloads, headers, cookies, or tokens were added.
- No files or directories were deleted.

## Verification

PASS:

- `npm run typecheck`
- `npm run test:self-media`
  - 129 tests passed.
- `npm run test:ui-harness`
  - 15 tests passed.
- `npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - healthy port: 3200
  - API ready: 3200
  - trusted data ready: 3200
  - page ready: 3200

Live Chrome verification on `http://localhost:3200`:

- `/dashboard -> /content -> /calendar -> /import -> /dashboard` all loaded.
- All four pages show `当前任务 / 下一步动作` or the new start-flow equivalent in the first workflow area.
- `/dashboard` shows `开始今天创作流程`.
- `/content` shows `引用到日历` and `发布交接包`.
- `/calendar` shows the empty-slot scheduling entry; clicking an empty slot opens `创建一个新视频排期`.
- `/import` shows `发布后回收当前任务`.
- Default visible text for the checked four-page route did not show `公众号`.

API sanity check:

- `publishHandoffPackages` contains 0 published packages.
- Imported/recovered content count in publish handoff packages is 0.
- Imported/recovered content count in post-publish recovery current action source is 0.
- Submitted-review next-action copy is present for at least one execution item.

## Files Changed

- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-REFERENCE-LED-USABILITY-REBUILD-065-worker-handoff.md`

## Commit / Push

- Commit: this commit, `feat(self-media): rebuild creator workflow surfaces`.
- Push: completed to `origin/main`.
