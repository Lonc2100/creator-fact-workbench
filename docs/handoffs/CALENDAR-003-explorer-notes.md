# CALENDAR-003 Explorer Notes

## Role

Calendar Explorer only researched local files and vendor references. It did not edit code.

## Findings

- Existing `PATCH /api/self-media/content-versions` is the right persistence entry for drag scheduling.
- `@dnd-kit` should stay in UI interaction code; drag only emits intent.
- Draft versions cannot jump directly to `scheduled`; the UI must either patch only `scheduledAt` or route through `needs_review -> scheduled`.
- `PublishCalendar` should remain a pattern with callbacks, while `CalendarPage` owns fetch and dashboard refresh.
- Smoke should verify both API persistence and real browser drag because dnd-kit interactions can be flaky under automation.

## Applied Decision

Implemented a callback-only calendar pattern and screen-owned persistence. Browser smoke uses explicit mouse movement to verify drag rescheduling.
