# MAINLINE-CALENDAR-REAL-PLANNER-CORRECTNESS-066 Worker Handoff

## Scope
- Fixed calendar behavior toward a real planner model: local dates are trustworthy, empty operating slots can start a schedule, existing cards open detail/edit state, content-page calendar links deep-link into the correct platform version, and same-content multi-platform cards no longer hide different scheduled dates under the earliest date.
- Did not restore WeChat Official Account into operating flow.
- Kept Bilibili account metrics preview-only.
- Did not call real publish APIs and did not store sensitive/raw platform material.

## Implementation
- Added shared local datetime helpers in `src/domain/self-media/ui/foundations/format.ts`.
  - `localDateTimeInputValue()` formats with local `getFullYear/getMonth/getDate/getHours/getMinutes`.
  - `isoFromLocalDateTime()` converts user-entered local `datetime-local` values back to ISO for persistence.
  - Removed the UTC-slice pattern from calendar/content scheduling paths.
- Updated content and calendar editors to use the shared helpers:
  - `src/domain/self-media/ui/patterns/ContentManagement.tsx`
  - `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
  - `src/domain/self-media/ui/screens/ContentPage.tsx`
- Fixed calendar grouping in `PublishCalendar`.
  - Group key is now `content/platform + local date + week time bucket`.
  - Same content on different dates renders as separate cards instead of being anchored to the earliest date.
  - Same content on the same date/time still merges platforms.
- Made operating calendar empty slots actionable.
  - Empty buttons now expose `data-calendar-empty`, `data-calendar-empty-hour`, and exact `aria-label` values.
  - Clicking an empty slot opens an add panel and pre-fills a read-only `datetime-local` value for that exact local date/time.
- Stabilized card click behavior.
  - Existing card selection clears the create-slot state and opens the platform detail inspector.
  - Drag behavior is separated onto a small card drag handle so normal card-content clicks are not swallowed by DnD activation.
- Added `/calendar?versionId=...` handling in `CalendarPage`.
  - Initial render opens the requested version detail when present.
  - Later workbench refreshes re-apply the URL request and close any create panel.
- Locked behavior in `tests/ui-harness.test.mjs`.
  - Guards against `toISOString().slice(0, 16)`.
  - Guards empty slot hour metadata, deep-link handling, create-slot prefill, card click cleanup, and date/time-aware grouping.

## Browser Evidence
- Started from `http://localhost:3200/dashboard`, then opened `/calendar` for focused calendar verification on the same 3200 service.
- Operating calendar loaded with visible empty time slots:
  - 13 visible `data-calendar-empty` slots.
  - Example: `2026-06-01` hour `9`, label `新增排期 2026-06-01 09:00`.
- Clicked empty slot `2026-06-01 09:00`.
  - Add panel opened.
  - `calendar-create-schedule-input` value was `2026-06-01T09:00`.
- Clicked an existing card content/title area with real mouse coordinates.
  - Add panel closed.
  - Page stayed on `/calendar`.
  - Detail still referenced the clicked card content.
- Opened `http://localhost:3200/calendar?versionId=version-bilibili-BV1g44y1n793-bilibili`.
  - Calendar detail opened for `我最喜欢的 《小雏菊》`.
  - No create panel was open.
- From `/content`, clicked visible `打开日历` link with `/calendar?versionId=version-content-creator-1caebb927d45-douyin`.
  - Landed on `/calendar?versionId=version-content-creator-1caebb927d45-douyin`.
  - Matching card was visible and detail text referenced `056真人走查：AI短片从想法到四平台发布`.
- Multi-date same-content check:
  - API showed `content-creator-1caebb927d45` scheduled across `2026-06-02`, `2026-06-04`, `2026-06-06`, `2026-06-07`.
  - DOM rendered visible split cards for `2026-06-02`, `2026-06-04`, and `2026-06-06` in the current operating view instead of only showing the earliest date.

## Verification
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 129 tests.
- `npm run test:ui-harness` passed: 15 tests.
- `npm run build` passed.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed on the restarted 3200 service.

## Notes
- The local 3200 server was a stale `next start` process during verification, so it was restarted after the final build. Current listener is a fresh `npm run start` process on `127.0.0.1:3200`.
- The working tree contains many unrelated dirty and untracked files from previous work. Only the files listed by this task should be staged for the 066 commit.
