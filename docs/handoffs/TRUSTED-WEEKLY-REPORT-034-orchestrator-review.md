# TRUSTED-WEEKLY-REPORT-034 Orchestrator Review

## Decision

Accepted.

The trusted weekly report is accepted as a local operating report generated from the same trusted dashboard/review scope.

## Accepted Behavior

- `npm run report:trusted-weekly` writes `.local/trusted-weekly-report/report.json` and `.local/trusted-weekly-report/report.md`.
- The report uses trusted real creator-center content-level data only.
- Demo, smoke, manual, csv, mediacrawler, n8n, paused WeChat, unknown local rows, user-excluded content, and Bilibili account metrics are excluded from report totals.
- The current generated totals match the trusted operating baseline: 19 trusted contents, 19 trusted metric snapshots, 344412 views, and 4259 engagement.

## Main Session Decision

Keep `.local/trusted-weekly-report/*` as local evidence by default.

Reason: the report can include real local content titles for operator readability. Do not paste or publish the full report without a separate redaction/export step.

## Main Session Verification

Reran:

- `npm run report:trusted-weekly`: PASS.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run test:self-media`: PASS, 96/96.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not include raw platform payloads, cookies, tokens, request headers, comment bodies, danmu text, or Bilibili account preview diagnostics in the weekly report.
