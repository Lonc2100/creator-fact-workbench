# HUMAN-MOUSE-CALENDAR-REGRESSION-066 Auditor Handoff

## Scope

- Task: human-mouse regression for the calendar workflow.
- Fixed entry: `http://localhost:3200/dashboard`.
- Browser: real Chrome driven through Playwright with mouse click / mouse drag / input / scroll / screenshots.
- Boundary: no code changes, no commit, no real publish API, no credential or raw request material.

## Summary

The calendar is not "lying" for several core paths: content-to-calendar deep links open details, clicking a card opens the editor, manual inspector save stores the time and shows the same visible date/time, and cross-platform same-content different dates are displayed as separate platform cards.

However, the calendar still has two important user-facing regressions:

- Empty-slot add opens the create flow, but the tested content creation did not persist into the API/calendar.
- Dragging from the pending queue persisted a schedule, but the observed target and saved visible time did not match in the mouse run.

## P0

### P0-1 Empty-slot add does not complete a real persisted schedule

- Steps:
  1. Started at `/dashboard`.
  2. Opened `/calendar`.
  3. Clicked an empty slot: `2026-06-07 21:00`.
  4. Dialog opened: `创建一个新视频排期`.
  5. Clicked `去内容台创建`.
  6. Filled title/topic/brief/schedule.
  7. Clicked `分析并生成讨论稿`.
  8. Clicked `生成并保存四平台版本`.
- Expected:
  - A persisted content item and four platform versions should appear in API/calendar using the selected or manually entered schedule.
- Actual:
  - UI showed generated cards, but `/api/self-media/dashboard` contained no content or platform version with the tested `066` title.
  - This failed twice with two `066` titles.
- Impact:
  - The "click blank calendar cell -> add schedule" promise is not reliable for a real creator; it opens a path but did not produce durable calendar data in the tested run.
- Screenshot evidence:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\13-empty-slot-dialog.png`
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\14-empty-slot-content-discussion-ready.png`
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\14-empty-slot-content-saved.png`

## P1

### P1-1 Pending-card drag saved a different visible time than the intended target slot

- Steps:
  1. Opened `/calendar`.
  2. Used the visible `拖入日历` drag handle on a pending B站 item.
  3. Drag target recorded by the mouse script: `2026-06-07 09:00`.
  4. Released the mouse over the target cell.
- Expected:
  - The dropped version should save and render at `2026-06-07 09:00`.
- Actual:
  - Saved API value: `2026-06-07T05:00:00.000Z`, which renders as local `2026-06-07 13:00`.
  - Visible card also appeared at `2026-06-07 13:00`.
- Impact:
  - Dragging is capable of saving, but the user's perceived drop target can diverge from the saved time. This is risky for "calendar means exact date/time".
- Screenshot evidence:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\32-before-handle-drag.png`
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\33-after-handle-drag.png`
- JSON evidence:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\result-handle-drag.json`

### P1-2 Empty-slot dialog does not carry selected time into content creation

- Steps:
  1. Clicked an empty calendar slot.
  2. Clicked `去内容台创建`.
- Expected:
  - The content page should prefill or clearly preserve the selected slot time.
- Actual:
  - The content form opened, but the selected calendar slot was not carried forward; the script had to manually fill the same datetime.
- Impact:
  - Even if persistence is fixed, users can still lose the selected slot context.

## P2

### P2-1 Content creation UI can look like "saved" even when API persistence did not happen

- Evidence:
  - The page displayed generated platform cards after the save attempt, but API search for the exact `066` title returned no content/version.
- Impact:
  - The creator may believe a schedule exists when it only exists in the local component state.
- Recommendation:
  - After save, show a durable content ID or a direct `打开日历` link only after API persistence succeeds.

## Passed Checks

### Content page -> calendar deep link opens details

- Existing execution row used:
  - `056真人走查：AI短片从想法到四平台发布`
  - URL after click: `http://localhost:3200/calendar?versionId=version-content-creator-1caebb927d45-douyin`
- Result:
  - Inspector opened.
  - Page showed selected-detail context.
- Screenshot:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\24-content-to-calendar-existing-deeplink.png`

### Clicking a card opens edit/details

- Result:
  - Existing calendar card click opened `.calendar-inspector-shell`.
- Screenshot:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\25-existing-card-click-inspector.png`

### Manual inspector save date/time matches visible calendar date/time

- Version:
  - `version-content-creator-1caebb927d45-xiaohongshu`
- Saved through UI:
  - input local time `2026-06-07 21:00`
- API:
  - `scheduledAt: 2026-06-07T13:00:00.000Z`
- Visible calendar:
  - `2026-06-07`, hour `21`
- Result:
  - PASS. UTC storage and local visible time are consistent.
- Screenshots:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\28-after-inspector-save.png`
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\29-after-inspector-save-calendar.png`

### Cross-platform same content different dates does not collapse into one misleading card

- Content:
  - `content-creator-1caebb927d45`
- Requested / observed platform dates:
  - 抖音: `2026-06-02 21:00`
  - 视频号: `2026-06-04 21:00`
  - 小红书: `2026-06-06 21:00`
  - B站: `2026-06-07 13:00`
- Result:
  - PASS. Calendar showed separate platform cards on their own dates/times.
- Screenshots:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\30-cross-platform-inspector-existing.png`
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066\31-cross-platform-calendar-existing.png`

## Screenshot Directory

- `D:\codex work\自媒体创作\Data Collection and Background Analysis\.local\human-mouse-calendar-regression-066`

Key screenshots:

- `21-dashboard-fixed-entry.png`
- `22-calendar-before-actions.png`
- `23-empty-slot-dialog-existing-run.png`
- `24-content-to-calendar-existing-deeplink.png`
- `25-existing-card-click-inspector.png`
- `26-before-drag-pending.png`
- `27-after-drag-drop.png`
- `28-after-inspector-save.png`
- `29-after-inspector-save-calendar.png`
- `30-cross-platform-inspector-existing.png`
- `31-cross-platform-calendar-existing.png`
- `32-before-handle-drag.png`
- `33-after-handle-drag.png`

## Verification Commands / Evidence

- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - PASS on port `3200`.
- Browser route/actions:
  - `/dashboard`
  - `/calendar`
  - empty slot click
  - `/content`
  - content-to-calendar link
  - card click
  - pending drag handle drag
  - inspector datetime edit/save
  - cross-platform different-date check

## Git Boundary

- No code changes made.
- No commit performed.
- Existing unrelated dirty/untracked files were not touched.
