# ACTION-SUGGESTION-TO-TASKS-034 Orchestrator Review

## Decision

Accepted.

Dashboard post-import suggestions can now be converted into internal action items after explicit user action.

## Accepted Behavior

- `POST /api/self-media/action-items` accepts a `suggestionId` and creates an internal action item.
- The server recomputes current trusted post-import suggestions before creating a task.
- Untrusted, stale, manual, or user-excluded suggestion ids cannot create action items.
- Conversion is idempotent by `sourceSuggestionId`.
- Action item evidence stores safe references only: platform, content id, metric snapshot id, source, and import run id.
- The dashboard shows `转为任务` before conversion and `已转任务` after conversion.

## Main Session Decision

Suggestion-to-task conversion must remain user-triggered. Do not auto-create action items from every generated suggestion.

Reason: suggestions are operating recommendations, not committed work. The user should decide which ones enter the task board.

## Main Session Verification

Reran:

- `npm run test:self-media`: PASS, 96/96.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not send raw suggestion/evidence payloads from the browser. The browser sends only `suggestionId`; the service recomputes trusted evidence server-side.
