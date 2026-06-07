# ACTION-TASKS-OPERATING-035 Worker Handoff

## Task

Make internal action items more operable after "suggestion to task": filtering, status progression, evidence review, and trusted-scope continuity.

## Files Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/ACTION-SUGGESTION-TO-TASKS-034-orchestrator-review.md`
- `docs/handoffs/TRUSTED-OPERATING-REVIEW-UI-031-orchestrator-review.md`
- Supporting governance/spec context:
  - `docs/context/index.md`
  - `ARCHITECTURE.md`
  - `docs/mainline-framework.md`
  - `docs/task-board.md`
  - `docs/spec-governance.md`
  - `docs/product-specs/review-action-backend-011.md`
  - `docs/product-specs/review-actions-001.md`
  - `docs/workflow-boundaries.md`

## Changed Files

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
  - Added an "内部行动项" operating panel on `/dashboard`.
  - Supports status filters: active/todo/doing/done/dropped/all.
  - Supports source filters: all/review-generated/post-import suggestion.
  - Shows source, status, priority, nextAction, evidence reference count, and safe evidence summaries.
  - Supports todo/doing/done/dropped PATCH updates through existing `/api/self-media/action-items`.
  - Keeps suggestion-to-task creation user-triggered; no auto batch task creation.
- `src/app/globals.css`
  - Added responsive dashboard action task panel styles.
  - Keeps evidence refs wrapped and compact so IDs do not overflow.
- `src/domain/self-media/service/self-media-service.ts`
  - Type-only fix: narrowed `realCaptureStatus` to `RealCaptureFreshnessStatus` so typecheck passes.
  - No behavior change to freshness reports.
- `tests/self-media-contract.test.ts`
  - Added `action task operating loop keeps safe sources and supports four status patches`.
  - Verifies post-import tasks keep safe evidence refs only.
  - Verifies review-generated tasks remain present.
  - Verifies todo/doing/done/dropped PATCH progression.
  - Verifies idempotent suggestion conversion remains one task per `sourceSuggestionId`.
- `docs/handoffs/ACTION-TASKS-OPERATING-035-worker-handoff.md`
  - This handoff.

## Screenshot

- `.local/action-tasks-operating-035.png`

The screenshot shows the dashboard action area with:

- post-import suggestions;
- internal task list;
- task source labels;
- status/source filters;
- safe evidence ref summaries;
- four status buttons.

## Verification

- `npm run test:self-media`: PASS, 97/97 before type fix; PASS, 98/98 in full harness after type fix.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.
- Screenshot saved: `.local/action-tasks-operating-035.png`.

## Boundaries Kept

- Did not add AI generation.
- Did not add a new platform.
- Did not touch WeChat/公众号.
- Did not save Bilibili account-level metrics.
- Did not delete DB.
- Did not add browser collection or platform login flows.
- UI sends only action item id/status/nextAction for PATCH and suggestionId for conversion.
- No raw payload, cookie, token, headers, comment body, or danmu text is displayed.

## Notes

- This is an operating UI closure, not the larger `review-action-backend-011` dedupe/history implementation.
- Existing `/api/self-media/action-items` remains the API surface.
- Main session should review whether the action panel belongs only on `/dashboard` or should later be extracted into a shared pattern for `/reviews`.

## Needs Main Session Judgment

Yes.
