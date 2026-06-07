# MAINLINE-CALENDAR-DATA-HYGIENE-092 Worker Handoff

## Task

Close the CreatorFact publish-calendar data hygiene gap: the default `/calendar` main grid must show only user-owned, actively planned, unpublished publish schedules. Historical published imports, archive rows, creator-center ledger rows, and acceptance/test records that were mistakenly marked as `user_work` must stay out of the default calendar.

## Root Cause

Historical and acceptance-like content previously reached the calendar through three weak gates:

- `service.calendar()` generated a schedule time with `version.scheduledAt ?? new Date().toISOString()`, so unscheduled platform versions could become "today" calendar items.
- `dashboard.calendarItems` only required `dataDomain=user_work` and a visible platform version id, which was too broad for a publish calendar.
- The frontend default calendar guard still allowed `published`, `failed`, and `blocked` statuses as operating calendar cards.

That combination let old Bilibili/Douyin published rows and acceptance-created `user_work` records look like current publish schedules.

## Changes

- Added service-layer publish-calendar helpers in `src/domain/self-media/service/self-media-service.ts`:
  - `isDefaultPublishCalendarContent`
  - `isDefaultPublishCalendarVersion`
- Default dashboard calendar items now require:
  - `content.dataDomain === "user_work"`
  - `content.workOwnership === "user_owned_work"`
  - content is not `published` and has no `publishedAt`
  - version status is only `draft`, `needs_review`, or `scheduled`
  - version has an explicit `scheduledAt`
  - version/content text does not contain acceptance, demo, seed, or calendar-hygiene traces such as `用来确认默认日历只显示 user_work`
- Removed the `new Date()` schedule fallback from `service.calendar()`. Versions without explicit `scheduledAt` no longer create calendar items.
- Tightened `CalendarPage` as a secondary UI guard so default operating cards do not accept `published`, `failed`, or `blocked` items.
- Added regression coverage for:
  - historical Bilibili published archive content
  - historical Douyin creator-center published content
  - `content-creator-6e8eafb53993` / `用户作品：六月内容计划`
  - a real future scheduled user draft that should still enter the default calendar
  - unscheduled versions no longer being assigned "today"

## Live Calendar Evidence

Fixed entrypoint was opened first:

- `http://localhost:3200/dashboard`

Then `/calendar` was checked in a browser. DOM text scan and screenshot fallback confirmed:

- `用户作品：六月内容计划`: not visible.
- `孤雏，随便唱唱`: not visible.
- `bilibili-BV1u34y1y7hQ`: not visible.
- `2022`: not visible in the default calendar page text.
- Empty/create schedule affordance text is still present.

Local screenshot evidence was written and intentionally not committed:

- `.local/screenshots/mainline-calendar-data-hygiene-092-calendar.png`

## Verification

- `git diff --check` passed.
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 144 tests.
- `npm run test:ui-harness` passed: 19 tests.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed on port 3200.
- Live browser DOM check for `http://localhost:3200/calendar` passed for the named historical/acceptance pollution samples.

## Boundaries Preserved

- No DB files were deleted.
- No data files were deleted or batch-moved.
- No WeChat work was resumed.
- Bilibili account metrics remain preview-only.
- Historical published content remains available for data analysis, content history, and ledger paths; it is only removed from the default publish-calendar main grid.
- Existing unrelated dirty worktree files were not staged by this task.

## Residual Risk / Next Step

The default dashboard/calendar snapshot is now strict. Explicit diagnostic/all-local paths can still expose local historical records when the user asks for them; that is intentional for auditability. Future tasks that create acceptance data should still stamp `acceptance_run_id` or equivalent provenance so isolation does not depend on title text alone.
