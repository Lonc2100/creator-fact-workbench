# CALENDAR-REAL-SCHEDULING-WORKFLOW-044 worker handoff

## Task

Make `/calendar` usable when real scheduling data is sparse without showing fake schedule cards. Add a real pending scheduling queue for user-created drafts, action-generated drafts, and review-needed drafts. Scheduling must only update platform version / queue state; publish records remain manual confirmation only.

## Completed

- `/calendar` now loads both trusted dashboard data and the content workbench snapshot, so it can show real pending drafts even when the default calendar has no scheduled items.
- Added a compact "真实待排内容" queue beside the calendar. It includes only real actionable drafts:
  - user/local drafts
  - action-generated drafts
  - idea-converted drafts
  - trusted creator-center rows that are still draft / needs review
- The pending queue supports:
  - drag from queue into calendar day/time cells
  - one-click "进入排期编辑" to open the existing schedule editor
- Empty default calendar now shows the actual calendar grid plus the real pending queue, with copy that says there are no scheduled drafts and no fake placeholders are used.
- Default calendar filtering continues to hide demo/smoke/fixture/debug diagnostic rows unless the user explicitly opens the all-local / diagnostic scope.
- Scheduling a pending draft reuses the existing content-version PATCH path and updates platform version / queue state only.
- Publish records are still created only through manual confirmation.
- Added a browser smoke command that seeds an isolated DB with real pending drafts plus a diagnostic scheduled row, then proves:
  - default calendar starts with zero scheduled cards
  - real pending queue is visible
  - no fake schedule slot is shown
  - diagnostic scheduled row is hidden by default
  - one-click edit opens the schedule editor
  - drag scheduling updates platform version / queue
  - no publish record is created
  - trusted dashboard totals remain unchanged

## Modified files

- `package.json`
- `src/app/calendar/page.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/app/globals.css`
- `tests/ui-harness.test.mjs`
- `scripts/calendar-real-scheduling-smoke-044.mjs`
- `docs/handoffs/CALENDAR-REAL-SCHEDULING-WORKFLOW-044-worker-handoff.md`

## Verification

- `npm run typecheck` PASS
- `npm run test:ui-harness` PASS
- `npm run smoke:calendar-real-scheduling` PASS
- `npm run test:self-media` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS

`git diff --check` emitted only the pre-existing worktree warning:

```text
warning: in the working copy of 'tsconfig.json', CRLF will be replaced by LF the next time Git touches it
```

## Artifacts

- Screenshot: `.local/calendar-real-scheduling-workflow-044.png`
- Smoke report: `.local/calendar-real-scheduling-workflow-044/report.json`
- Isolated smoke DB kept in place, not deleted:
  `.local/calendar-real-scheduling-workflow-044/self-media-calendar-real-2026-06-05T06-28-13-442Z.sqlite`

Smoke report key evidence:

- `defaultScheduledCardsBefore`: `0`
- `pendingDraftCardsBefore`: `2`
- `defaultFakeSlotsBefore`: `0`
- `diagnosticRowHidden`: `true`
- `oneClickOpenedScheduleEditor`: `true`
- `scheduledStatus`: `scheduled`
- `queueStatus`: `scheduled`
- `publishRecordsBefore`: `0`
- `publishRecordsAfter`: `0`
- `trustedContentCountUnchanged`: `true`
- `trustedMetricSnapshotCountUnchanged`: `true`

## Safety notes

- No fake schedule rows were generated.
- No real platform publish API was called.
- No publish record is created by schedule patch / drag scheduling.
- No database was deleted.
- WeChat publishing remains untouched.
- Bilibili account-level metrics remain untouched.
- Trusted dashboard / reviews default totals are not changed by local/action drafts.

## Known notes

- The smoke drag target records an intended date and the actual dnd-kit drop cell separately; the assertion verifies actual scheduled state, queue state, visible scheduled card, no publish record, and unchanged trusted totals.
- The worktree had existing unrelated changes from prior tasks; this task did not revert or delete them.

## Needs orchestrator decision

Yes.
