# CALENDAR-REAL-SCHEDULING-WORKFLOW-044 Orchestrator Review

Date: 2026-06-05

## Verdict

Accepted.

The calendar now defaults to real actionable scheduling work instead of fake-looking filled slots. Empty days remain empty, and pending real drafts appear in a compact scheduling queue.

## Accepted Evidence

- `npm run typecheck` PASS
- `npm run test:ui-harness` PASS
- `npm run smoke:calendar-real-scheduling` PASS
- `npm run test:self-media` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS, with only the existing `tsconfig.json` CRLF warning
- Screenshot: `.local/calendar-real-scheduling-workflow-044.png`
- Smoke report: `.local/calendar-real-scheduling-workflow-044/report.json`

## Accepted Behavior

- `/calendar` loads dashboard data plus the content workbench snapshot.
- The default calendar shows real scheduled rows and an actionable pending queue.
- The pending queue includes user/local drafts, action-generated drafts, idea-converted drafts, and trusted creator-center rows that still need review or scheduling.
- Dragging from the pending queue into a calendar cell schedules the platform version and updates queue state.
- One-click entry into scheduling review is available from pending items.
- Scheduling or rescheduling updates content/platform-version/queue state only.
- Scheduling does not create publish ledger records, call platform publish APIs, or change trusted metric totals.

## Boundary Decisions

- Fake/demo/smoke/fixture/debug rows must remain hidden from the default calendar.
- Publish success or failure still requires explicit manual publish confirmation and must not be inferred from scheduling.
- Local drafts and schedules are operating workflow data, not trusted metric evidence.

## Follow-Up

- Calendar ergonomics can continue after this acceptance: denser pending queue controls, clearer date focus, and drag target affordances are product polish, not blockers.
