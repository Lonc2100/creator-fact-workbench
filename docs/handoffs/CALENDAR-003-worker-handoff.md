# CALENDAR-003 Worker Handoff

## What Was Done

- Added dnd-kit based drag-and-drop to `PublishCalendar`.
- Added week/month grid support and day drop targets.
- Updated `CalendarPage` to handle platform/status filters and persist drag scheduling through `/api/self-media/content-versions`.
- Preserved legal status transitions by routing drafts through `needs_review -> scheduled`.

## Artifacts

- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/app/globals.css`
- `docs/product-specs/calendar-editor-001.md`

## Verification

- `npm run typecheck`
- `npm run test:ui-harness`
- `npm run test:smoke`

## Known Issues

- Month view is a first-pass 5-week grid. It does not yet include month navigation or all 6-week edge cases.
- Dragging keeps the original hour when possible; otherwise it defaults to 09:00.

## Next

- Add richer time editing and month navigation after UI review.
