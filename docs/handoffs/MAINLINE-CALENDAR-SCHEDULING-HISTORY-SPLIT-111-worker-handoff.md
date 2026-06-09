# MAINLINE-CALENDAR-SCHEDULING-HISTORY-SPLIT-111 Worker Handoff

## Summary
- Goal: make `/calendar` a future publishing schedule tool by default, with history, local-only records, and isolated data demoted to secondary collapsed sections.
- Result: implemented a UI-only scheduling/history split; no import, dashboard, content save, provider, repo, or real publish API logic was changed.
- Commit status: prepared for exact commit with message `refactor(self-media): separate calendar scheduling from history`.

## External Reference Pass
- Buffer calendar: week/month calendar, channel filters, create/edit posts directly from calendar, and new posts can be created by clicking a time/date slot.
- Metricool calendar: Planning calendar supports creating a post by clicking `Create new post` or a calendar time slot, with selected social platform icons shown.
- Hootsuite calendar: calendar view is positioned around seeing schedule gaps and creating scheduled content to fill them.
- Postiz: current open-source reference remains a social media scheduling tool with multi-platform scheduling and analytics focus.
- Applied pattern: keep the default surface as future scheduling, make empty slots actionable, and keep history/records secondary.

## Files Changed
- Added `src/domain/self-media/ui/patterns/CalendarSchedulingPanels.tsx`.
- Updated `src/domain/self-media/ui/screens/CalendarPage.tsx`.
- Updated `tests/ui-harness.test.mjs`.

## Main Calendar Default Rules
- Default `/calendar` now renders through `CalendarScheduleGrid`.
- Default main grid only uses operating platform filters: Douyin, Xiaohongshu, Video Account, and Bilibili content-level work.
- Default status filter is limited to real scheduling states: `draft`, `needs_review`, `scheduled`.
- Main grid rows still require:
  - `dataDomain === "user_work"`,
  - operating platform,
  - explicit `scheduledAt`,
  - unpublished content/version,
  - no local acceptance/demo/test classification.
- Added UI-level future filter: `isFutureSchedule(item.scheduledAt)`.
- No fallback to today or this week creates fake cards; empty future grid remains empty and exposes create slots.
- Published ledger rows are not used as future schedule cards.

## Multi-Platform Card Merge Rule
- Existing `PublishCalendar` grouping remains the active card rule:
  - group key is `contentId + date + hour` in week view,
  - group key is `contentId + date` in month view,
  - card title uses the content title,
  - card badges/icons show grouped platforms,
  - subtitle says platform count/status such as `多个平台` and current readiness state.
- 111 kept this rule and added tests around `CalendarScheduleGrid` so the main page continues to use the grouped calendar component.
- Live 3200 currently had `0` future schedule cards, so merge behavior could not be visually observed with current data without creating new schedule data.

## Empty Slot Entry
- Empty future grid slots remain visible and actionable.
- Week view showed 28 empty slot buttons in live 3200.
- Each slot has clear `aria-label`, for example `新增排期 2026-06-09 09:00`.
- Clicking a slot opens the existing local create-schedule panel and links to `/content?scheduledAt=...#new-video`; it does not directly write data.

## Secondary Sections
`CalendarSecondarySections` now wraps the non-primary surfaces below the main grid:
- `素材池 / 待排草稿`
- `隔离数据`
- `历史发布记录`
- nested `发布记录台账`
- clear future schedules action remains inside the history area, not in the main scheduling toolbar.

Secondary sections are visible as collapsed summaries, and their details do not contribute to main-grid counts.

## Historical / Isolated Data In Main Calendar
- Historical publish ledger: not in main grid.
- Isolated local data: not in main grid.
- Current live 3200 showed `0` future cards and no historical/test/diagnostic text in the primary schedule area.
- Current live 3200 still showed collapsed summaries for `素材池 / 待排草稿`, `隔离数据`, and `历史发布记录`, which is expected secondary behavior.

## 3200 Live Acceptance
- Fixed entry used: `http://localhost:3200/dashboard`, then `/calendar`.
- Server restarted on `.next-build-111-main`.
- Health check passed on port 3200.
- Default page:
  - `calendar-primary-schedule`: visible.
  - `calendar-secondary-sections`: visible below the primary grid.
  - main scope filter `calendar-scope-filter`: absent.
  - text includes `默认只看未来作品什么时候发布`.
  - text includes `同一内容多平台合并显示`.
  - future card count: `0` with current real data.
  - empty slot count: `28`.
  - first empty labels: `新增排期 2026-06-08 09:00`, `新增排期 2026-06-09 09:00`, `新增排期 2026-06-10 09:00`, `新增排期 2026-06-11 09:00`.
  - secondary details all closed by default.
  - no external platform tab opened; browser stayed on local `/calendar`.
  - no visible `run id`, `raw`, `evidence`, `/api`, `path`, `storageState`, `password`, `cookie`, `token`, `header`, `验收`, `测试`, or `诊断` text in the page body.

## Verification
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 150 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- PowerShell equivalent of `NEXT_DIST_DIR=.next-build-111-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS after restarting 3200 on `.next-build-111-main`.

## Extra-Depth Pass
This task finished under 15 minutes, so I did an extra-depth pass:
- Rechecked mature scheduling products and extracted only information hierarchy, not UI styling.
- Verified the no-future-card edge case live instead of creating fake schedules.
- Confirmed the main calendar has no scope selector for local/diagnostic records.
- Confirmed empty slots remain clear and accessible.
- Confirmed history/isolation sections stay collapsed by default.
- Confirmed `PublishCalendar` grouped-card path remains the only main-grid renderer.
- Confirmed post-build Next type-reference drift was reverted before staging.

## Remaining Risks
- Live data currently has no future schedule cards, so multi-platform grouping was verified by code/tests but not visually observed against a real future card.
- History ledger remains in `CalendarPage.tsx`; it is demoted visually but could be extracted further in a later low-risk pass.
- The secondary summary still says `隔离数据`, which matches the requested bucket but is slightly operational; a future copy pass could rename it to `不进入主日历的内容`.

## Timing
- Started: 2026-06-09 17:42:11 +08:00
- Finished: 2026-06-09 17:52:00 +08:00
- Elapsed: about 10 minutes
- Workload class: M

## Main Session Decision Needed
- 需主会话判断：否
