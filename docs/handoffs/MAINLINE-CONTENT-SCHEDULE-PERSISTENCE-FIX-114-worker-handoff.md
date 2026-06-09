# MAINLINE-CONTENT-SCHEDULE-PERSISTENCE-FIX-114 Worker Handoff

## Summary
- Goal: fix `/content` composer schedule persistence so direct future time entry saves four platform drafts into the publish calendar, or fails with a clear creator-facing message.
- Result: done.
- 是否提交：是；本 handoff 随 `fix(self-media): persist content composer schedules` 精确提交。
- 需主会话判断：否。

## Root Cause
- Service already persisted scheduled creator drafts correctly when `scheduledAt` reached `createCreatorVideoDraft`.
- The `/content` UI treated schedule input as best-effort: it read `scheduleInputRef.current?.value || scheduledAt`, sent the payload, and only validated schedule persistence if the response already contained `body.content.scheduledAt`.
- If a browser/control path failed to put the native `datetime-local` value into the payload, the save still succeeded as an unscheduled draft and the user could think it was already on the calendar.
- The page also lacked explicit pre-save and post-save schedule feedback.

## Fixed Content Schedule Path
- `CreatorVideoPanel` now syncs the future time through both `onChange` and `onInput`.
- Before save, the panel freezes the current requested schedule value into `payload.scheduledAt`.
- If the user entered a date/time but it cannot be parsed, save stops with a business message.
- If the user entered a past time, save stops with a business message.
- After save, if a schedule was requested, the UI verifies:
  - persisted content has the same `scheduledAt`,
  - all four returned platform versions are `scheduled` with the same `scheduledAt`,
  - all four persisted platform versions are `scheduled` with the same `scheduledAt`,
  - all four queue rows are `scheduled` with the same `scheduledAt`.
- If any of those checks fail, the page fails closed instead of silently saving an unscheduled draft.

## Save Feedback
- Before save, future time shows: `将排期到 06/13 10:00；保存后会进入发布日历。`
- Successful scheduled save shows: `四平台版本已保存，并已加入发布日历：...`
- Parent page/library message shows: `新视频已保存并加入发布日历；已选中内容库，可继续发布交接。`
- Failure messages are creator-facing:
  - `未来发布时间没有识别成功，请重新选择日期和时间。`
  - `请选择未来发布时间；过去时间不会加入发布日历。`
  - `已填写未来发布时间，但内容没有加入发布日历，请重试。`
  - `已填写未来发布时间，但发布日历没有完整生成四个平台排期，请重试。`

## Live 3200 Acceptance
- Fixed entry: `http://localhost:3200/dashboard`.
- 3200 initially served an older `next start` build, so I restarted the stale local Next process on `.next-build-114-main` and reran health.
- Dashboard before save:
  - `21` trusted contents.
  - `22` content-level metric snapshots.
  - no default technical-word pollution.
- `/content`:
  - default composer mode visible.
  - input title: `AI短片脚本：让普通场景出现反转`.
  - input future time: `2026-06-13 10:00 +08:00`.
  - schedule preview appeared before save.
  - discussion generated.
  - save displayed `新视频已保存并加入发布日历；已选中内容库，可继续发布交接。`
- Created local content:
  - contentId: `content-creator-ef2633cdc996`
  - scheduledAt: `2026-06-13T02:00:00Z`
  - platform versions: 4
  - queue rows: 4
  - all four versions and queue rows were `scheduled`.
- `/calendar`:
  - URL checked: `/calendar?versionId=version-content-creator-ef2633cdc996-bilibili`
  - one merged card found: `10:00AI短片脚本：让普通场景出现反转4个平台 · 等待发布确认`
  - no history/test/diagnostic/default technical pollution in the main calendar body check.
- `/dashboard` after save:
  - trusted contents remained `21`.
  - content-level metric snapshots remained `22`.
  - new draft title did not appear on dashboard.
- External platform windows:
  - none opened.

## Local Content / Schedule / Metrics
- New local content retained:
  - `content-creator-ef2633cdc996`
  - title: `AI短片脚本：让普通场景出现反转`
  - scheduled for `2026-06-13 10:00 +08:00`
- New local schedule retained:
  - one content grouped into four platform schedules.
- New metrics:
  - `0` metric snapshots for the draft.
  - trusted dashboard metrics unchanged.

## Verification
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 150 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- PowerShell equivalent of `NEXT_DIST_DIR=.next-build-114-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS after serving `.next-build-114-main` on 3200.

## Extra-Depth Pass
- Reproduced the likely 113 failure mode: Playwright `fill()` did not reliably set the native `datetime-local` value on the old served page.
- Verified keyboard-style entry updates the schedule value and triggers the new preview on 114.
- Verified the save result through both browser UI and read-only local APIs.
- Confirmed content/version/queue persistence, calendar merged card, and dashboard metric non-pollution.

## Remaining Risks
- Native `datetime-local` controls can still behave differently across automation surfaces; the 114 fix makes the UI fail closed and verified keyboard entry works. If a human still reports date-entry friction, the next low-risk improvement is splitting date and time into plain text/select controls while keeping the same payload validation.
- This task intentionally keeps local draft/schedule data in the operating DB for live proof; it does not create trusted metrics.

## Timing
- Started: 2026-06-09 18:38:47 +08:00
- Finished: 2026-06-09 18:54:00 +08:00
- Elapsed: about 15 minutes
- Workload class: M

## Main Session Decision Needed
- 需主会话判断：否
