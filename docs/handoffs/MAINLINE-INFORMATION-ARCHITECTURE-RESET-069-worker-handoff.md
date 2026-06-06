# MAINLINE-INFORMATION-ARCHITECTURE-RESET-069 worker handoff

## Run metadata

- Started: 2026-06-06 22:32:00 +08:00
- Finished: 2026-06-06 22:58:40 +08:00
- Elapsed: 26m
- Workload class: L
- Extra-depth pass: not required; elapsed was above 15 minutes.

## Scope

Reset the default information architecture for the three operator pages:

- `/dashboard`: data and charts first.
- `/calendar`: works schedule first.
- `/import`: how to import/recover data first.

Mature-product reference split used:

- Metricool and Later: calendar/planner is for creating and viewing scheduled social content.
- Buffer Insights: analytics pages foreground performance, reporting, comparisons, and content results.
- Hootsuite Planner: planner manages planned/scheduled content, not logs or diagnostics.

Reference links checked:

- https://help.metricool.com/how-to-schedule-content-from-the-calendar-q8ymv
- https://buffer.com/social-media-analytics
- https://buffer.com/social-media-reporting
- https://help.hootsuite.com/hc/en-us
- https://later.com/social-media-scheduler/

## Changes made

### Dashboard default is data-only

Files:

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/app/globals.css`

Changed default `/dashboard` render order:

1. trusted operating metric strip.
2. metric dashboard charts and KPI panels.
3. weekly/account metric data panels.
4. folded secondary operations.
5. folded advanced diagnostics.

Moved these out of the default first screen and into `dashboard-secondary-operations`:

- Start creator day flow.
- Daily operating checklist.
- Publish execution dashboard.
- Post-import suggestions.
- Action tasks.

Result: dashboard first viewport now shows trusted content count, content snapshots, real views, real engagement, trend chart, total exposure, and business data context. It no longer shows "当前任务 / 下一步动作", "今日数据动作", or "发布执行台" by default.

### Calendar default is schedule-only

Files:

- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/app/globals.css`

Changed default `/calendar`:

- Removed the top current-task panel from default.
- Stopped passing pending draft items into the main calendar canvas, so the "57 pending items" style side queue no longer occupies first screen.
- Added folded `calendar-draft-pool` for unscheduled drafts/materials.
- Wrapped publish ledger in folded `calendar-history-ledger`.
- Kept empty time cells and blank-slot creation behavior.
- Kept platform-version detail inspector, reschedule, and manual publish confirmation behavior.

Result: calendar first viewport is mostly the calendar canvas. It shows scheduled work cards, empty clickable slots, platform icons, time, title, and status. Draft pool and historical ledger are available but closed.

### Import first screen explains import/recovery

Files:

- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`

Added `ImportFirstViewportGuide` at the top of `/import`:

- Step 1: open platform backend.
- Step 2: preview and save latest data.
- Step 3: match published content back to local content.
- Shows latest real capture time.
- Shows how many platforms need recovery/stale refresh.
- Shows manual refresh and post-publish recovery anchors.

Kept platform health, sync details, operation history, daily ops, trusted audit, raw/manual import, and diagnostics in folded sections.

Also removed the visible paused-platform name from the default first viewport. It now says paused platforms stay hidden while preserving the Bilibili account preview-only boundary.

### Contract tests

File:

- `tests/ui-harness.test.mjs`

Updated UI harness contracts to assert:

- Dashboard default render stays data/charts only and workflow modules are folded.
- Calendar default render keeps pending drafts and publish ledger folded.
- Import default render starts with import/recovery guide and keeps diagnostics folded.
- Calendar empty-slot creation, exact time handling, and content-to-calendar schedule contracts remain intact.

## Real browser evidence

Evidence screenshots saved locally under:

- `.local/information-architecture-reset-069/`

Important files:

- `01-dashboard-first-viewport.png`
- `02-calendar-first-viewport.png`
- `03-calendar-empty-slot-create-panel.png`
- `04-content-create-from-calendar-slot.png`
- `05-content-save-four-platform-from-calendar.png`
- `06-calendar-created-content-visible.png`
- `07-import-first-viewport.png`

Browser findings:

- Dashboard first viewport:
  - Shows trusted four-platform data, 20 real contents, 20 content snapshots, 346,855 real views, 4,477 real engagement.
  - Shows exposure/engagement trend and total exposure KPI.
  - Does not show current-task, daily-action, or publish-execution modules in the first viewport.
  - `dashboard-secondary-operations` exists and is closed by default.
- Calendar first viewport:
  - Shows the calendar canvas as the main surface.
  - Pending draft cards visible count: 0.
  - Draft pool open: false.
  - History ledger open: false.
  - Publish ledger visible text: false.
  - Empty slot exists.
- Calendar empty-slot creation:
  - Clicked empty slot `2026-06-08 09:00`.
  - New schedule panel opened.
  - Prefilled input value: `2026-06-08T09:00`.
  - Content creation link carried `scheduledAt=2026-06-08T01:00:00.000Z`.
- Content to calendar:
  - Created browser test title `069信息架构回归-1780757710096`.
  - API confirmed content `content-creator-a5cfec51f7c8`.
  - API confirmed 4 platform versions and 4 calendar items, all scheduled.
  - Calendar showed `09:00 069信息架构回归 4个平台 · 等待发布确认` in `data-calendar-hour="9"` with target `2026-06-08T09:00`.
- Import first viewport:
  - Shows "现在怎么导入 / 回收数据", three import/recovery steps, latest capture time, platforms needing recovery, and manual refresh/recovery anchors.
  - Advanced diagnostics open: false.
  - Log/Run ID/preflight/rawDir/report noise visible: false.
  - Paused platform name visible: false.

## Verification

Passed:

- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- `git diff --check`

The validation chain exited with code 0. `test:self-media` passed 129 tests and `test:ui-harness` passed 15 tests.

Note: port 3200 was an old `next start` process, so after building current code I restarted the local `next start` server on port 3200 for browser verification. No real platform API was called.

## Boundaries kept

- Did not call real platform publish APIs.
- Did not save sensitive login material or platform raw request details.
- WeChat Official Account / 公众号 remains paused and is not visible by default.
- Bilibili account metrics remain preview-only and were not promoted into durable content totals.
- Did not stage `.local`, `.agents`, `.codex`, `.trellis`, or unrelated dirty worktree files.
- Did not use `git add .`.

## Residual risks

- `/content` still has a workflow-first first viewport, including current tasks and publish handoff, because 069 explicitly scoped dashboard/calendar/import.
- Dashboard still keeps workflow modules in a closed secondary operations section. That is intentional for discoverability, but a stricter product decision could move them to `/content` or another dedicated operations page.
- Hidden serialized page data may still contain paused/historical platform strings from stored data; browser visible first-viewport checks passed.
- Browser verification created one local 069 scheduled content item and four scheduled platform versions in the current operating DB.
