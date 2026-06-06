# CALENDAR-STRICT-USER-OWNED-SCHEDULE-071 worker handoff

## Run metadata

- Date: 2026-06-07 +08:00
- Fixed entrypoint: `http://localhost:3200/dashboard`
- Scope: strict default calendar admission for user/operator-owned self-media work only.

## Problem

User feedback before 071 showed default `/calendar` still displayed false schedules:

- `AI选题计划`
- `AI短片复盘`
- `我最喜欢的小雏菊`
- `想拍一条短视频`
- `我的真实作品070测试`

070 still relied on a negative title classifier and explicitly allowed `我的真实作品...`, so acceptance-created rows could leak into the default calendar.

## Reference check

Project reference docs list Postiz/Mixpost as mature calendar/publishing queue references. The relevant product pattern for this task is to treat the calendar as a curated event source, not as a dump of every historical local record. This implementation uses the project's internal model rather than importing external code.

## Changes made

### Positive ownership admission

Files:

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`

Implemented:

- Added durable `ContentWorkOwnership = "user_owned_work" | "operator_owned_work"`.
- Added optional `ContentItem.workOwnership`.
- UI-created creator video drafts are saved with `workOwnership: "user_owned_work"`.
- Idea-to-content drafts are saved with `workOwnership: "user_owned_work"`.
- Trusted action-item-to-content drafts are saved with `workOwnership: "operator_owned_work"`.
- Default calendar admission now requires explicit ownership through `hasCalendarWorkOwnership(content)`.
- Old imported, seed, demo, fixture, smoke, ledger, backend, and unmarked local rows have no ownership marker, so they do not enter the default calendar.

### Acceptance/test isolation

Files:

- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `tests/ui-harness.test.mjs`

Implemented:

- Removed the `我的真实作品` allow-list exception.
- Expanded local acceptance/test classifier for the collapsed section to cover:
  - `050-071`
  - `MAINLINE`
  - `HUMAN-MOUSE`
  - `验收`
  - `回归`
  - `测试`
  - `真实鼠标`
  - `creator day workflow`
  - `信息架构`
  - `AI选题计划`
  - `AI短片复盘`
  - `我最喜欢的小雏菊`
  - `想拍一条短视频`
- These checks are not the default admission mechanism; they are the quarantine layer after positive ownership.

### Clean empty calendar

Files:

- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`

Implemented:

- When default calendar has no visible owned work, it renders blank clickable time cells.
- Empty-state copy is reduced to: `点击空白时间格创建作品排期。`
- The empty pending-queue side panel no longer appears in the main calendar when there are no pending items.

## Real browser evidence

Browser path:

1. Opened `http://localhost:3200/dashboard`.
2. Clicked visible `发布日历` link to enter `/calendar`.
3. Confirmed default main calendar card count was `0`, empty slot count was `28`, and folded acceptance section was closed.
4. Clicked a blank calendar slot.
5. Created `071验收测试-不应默认显示` through `/content?scheduledAt=...#new-video`.
6. Returned to `/calendar`; default main calendar card count remained `0`; the 071 title was not visible.
7. Expanded `本地验收数据 / 测试内容`; confirmed the 071 title was present there.
8. Created `真实作品：六月内容计划` through the same UI creation path.
9. Returned to `/calendar`; default main calendar showed exactly one card: `09:00 真实作品：六月内容计划 4个平台 · 等待发布确认`.

Screenshot evidence saved locally and intentionally not committed:

- `.local/calendar-strict-user-owned-071/03-dashboard-entry-after-restart.png`
- `.local/calendar-strict-user-owned-071/04-calendar-default-clean-before-create.png`
- `.local/calendar-strict-user-owned-071/05-content-created-071-hidden-title.png`
- `.local/calendar-strict-user-owned-071/06-calendar-after-071-still-clean.png`
- `.local/calendar-strict-user-owned-071/07-calendar-071-in-acceptance-fold.png`
- `.local/calendar-strict-user-owned-071/08-content-created-real-work.png`
- `.local/calendar-strict-user-owned-071/09-calendar-real-work-visible.png`

Important note:

- Port 3200 was initially a healthy `next start` process serving an old bundle. I stopped that single 3200 listener and restarted `npm run start` after `npm run build` so the fixed bundle was served on the required fixed port.

## Verification

Passed:

- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- `git diff --check`

## Boundaries kept

- Did not delete database files.
- Did not delete any files.
- Did not batch delete files or directories.
- Did not stage `.local`, `.agents`, `.codex`, or `.trellis`.
- Did not call real platform publish APIs.
- Did not treat publish ledger or import replay rows as default calendar schedules.
- WeChat Official Account remains paused.
- Bilibili account metrics remain preview-only.

## Residual risks

- The local DB still contains historical false schedules. They are hidden or quarantined by default, not deleted.
- Existing real user works created before this bundle do not have `workOwnership`; they will stay out of the default calendar until recreated through the current UI or explicitly curated by a future ownership-migration task.
- The collapsed acceptance section is still visible as a closed summary by design; its contents are not in the default calendar body.
