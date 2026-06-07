# ACTION-TASKS-OPERATING-035 Orchestrator Review

## Decision

Accepted.

The dashboard now has an operating task panel that makes internal action items usable after post-import suggestions are converted into tasks.

## Accepted Behavior

- `/dashboard` shows internal action items with status filters and source filters.
- Task source is visible as review-generated or post-import suggestion.
- Tasks show status, priority, next action, and safe evidence reference summaries.
- Operators can move tasks through `todo`, `doing`, `done`, and `dropped` with the existing `PATCH /api/self-media/action-items`.
- Suggestion-to-task creation remains user-triggered and idempotent.
- Browser requests send only action id/status/nextAction for task status updates and only `suggestionId` for suggestion conversion.

## Main Session Decision

Keep the first operating task panel on `/dashboard`.

Reason: the dashboard is now the daily operating surface where the user sees suggestions, trusted totals, health, and task follow-through together. A later task can extract a shared pattern for `/reviews` if duplication becomes painful.

## Main Session Verification

Reran:

- `npm run test:self-media`: PASS, 98/98.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not auto-create tasks from every generated suggestion. Do not display raw payloads, credentials, request headers, comment bodies, danmu text, or original platform responses as task evidence.
