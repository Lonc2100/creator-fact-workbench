# MAINLINE-CALENDAR-CREATE-PERSISTENCE-067 Worker Handoff

## Timing
- Started: 2026-06-06 21:49:06 +08:00
- Finished: 2026-06-06 21:59:08 +08:00
- Elapsed: 10m 02s
- Workload class: M

## Extra-Depth Pass
- This run completed in under 15 minutes, so I added an explicit extra-depth pass instead of stopping at static fixes:
  - Checked scheduler behavior against Metricool, Buffer, Hootsuite, Postiz, and Mixpost principles: calendar slot creates should carry the selected time into composition; schedule/save UI should reflect durable save state; multi-channel posts need explicit per-platform versions; scheduling APIs return or expose stored scheduled time.
  - Ran a real browser flow from `http://localhost:3200/dashboard`.
  - Verified API persistence separately through `content-workbench` and `calendar` endpoints.
  - Verified a pending drag target by comparing visible target `2026-06-07T21:00` to stored UTC `2026-06-07T13:00:00.000Z`.

## Scope
- Fixed the 066 P0/P1 regression path where a calendar empty-slot flow could look saved without proving durable API persistence.
- Preserved guardrails:
  - WeChat Official Account remains paused.
  - Bilibili account metrics remain preview-only and are not included in durable content totals.
  - No real publish API calls.
  - No sensitive login material or raw platform request data stored.
  - No batch deletion.

## Implementation
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
  - Added `contentCreateHref(scheduledAt)` and changed the empty-slot create CTA to `/content?scheduledAt=<ISO>#new-video`.
  - Added `data-testid="calendar-create-content-link"` for the real slot handoff.
  - Updated drag schedule save feedback to refresh `content-workbench` and verify the persisted platform version `scheduledAt` matches the target before showing success.
- `src/domain/self-media/ui/screens/ContentPage.tsx`
  - Added `requestedScheduledAtFromUrl()` so `/content?scheduledAt=...#new-video` pre-fills the creator form datetime input in local time.
  - Moved `setResult(body)` until after API save and post-save verification.
  - After save, fetches `/api/self-media/content-workbench` and verifies:
    - content exists,
    - the returned platform version count is persisted,
    - scheduled versions carry the same scheduled time.
  - On any save/verification failure, clears generated saved result UI with `setResult(null)` and shows the failure message.
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
  - Added `dropTargetFromEvent()` to derive date/hour from droppable data or droppable id.
  - Added `data-calendar-target-at` to visible time cells so browser/API tests can compare the user-visible target with persisted local time.
- `tests/ui-harness.test.mjs`
  - Locked slot query propagation, post-save verification, honest failure state, calendar create link, and drag target parsing.
- `tests/self-media-contract.test.ts`
  - Strengthened creator draft contract: scheduled creator video creates four scheduled platform versions, four scheduled queue rows, and four calendar items at the requested time.

## Browser Evidence
- Entry: started from `http://localhost:3200/dashboard`, then opened `/calendar`.
- Empty-slot create:
  - Clicked visible empty slot `2026-06-07 09:00`.
  - Calendar create panel showed `calendar-create-schedule-input = 2026-06-07T09:00`.
  - CTA href was `/content?scheduledAt=2026-06-07T01%3A00%3A00.000Z#new-video`.
  - Content form prefilled `creator-video-scheduled-at = 2026-06-07T09:00`.
- Created content:
  - Title: `067空白格持久化-1780754218258`.
  - UI showed saved only after post-save verification.
- API verification:
  - `content-workbench` found content `content-creator-ac3ece012b4e`.
  - Four platforms persisted: `bilibili`, `douyin`, `video_account`, `xiaohongshu`.
  - All four scheduled at `2026-06-07T01:00:00.000Z`.
  - Calendar API returned four calendar items at the same time.
- Calendar verification:
  - Calendar displayed one merged four-platform card at `2026-06-07 09:00`.
  - Card text: `09:00067空白格持久化4个平台 · 等待发布确认`.
- Drag verification:
  - Pending version: `version-content-creator-9922e0c2c972-douyin`.
  - Visible drop target: `2026-06-07T21:00`.
  - After mouse drag, visible card was in date `2026-06-07`, hour `21`.
  - API persisted `scheduledAt = 2026-06-07T13:00:00.000Z`, matching local `21:00`.
  - Calendar API also returned `2026-06-07T13:00:00.000Z`.

## Verification
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 129 tests.
- `npm run test:ui-harness` passed: 15 tests.
- `npm run build` passed.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed.

## Notes / Residual Risk
- The browser/API verification intentionally mutated the local operating DB by creating the `067空白格持久化-1780754218258` content and dragging one existing pending draft into schedule. This was required by the task's real persistence acceptance.
- The current dirty worktree still contains many unrelated modified/untracked files from previous work. This task should stage only the 067 files listed above plus this handoff.
