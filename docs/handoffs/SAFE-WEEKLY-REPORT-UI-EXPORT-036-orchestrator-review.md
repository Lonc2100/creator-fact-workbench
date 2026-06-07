# SAFE-WEEKLY-REPORT-UI-EXPORT-036 Orchestrator Review

## Decision

Accepted.

The safe weekly report now has a read-only API and dashboard UI path.

## Accepted Behavior

- `GET /api/self-media/reports/trusted-weekly-safe` returns only the safe summary report and safe markdown.
- The service recomputes the summary from trusted dashboard/review scope.
- The API does not read or return `.local/trusted-weekly-report/report.md`.
- `/dashboard` can view and copy the safe summary.
- The API/UI omit real content titles, internal content ids, account metrics, capture details, original platform responses, credentials, headers, comment bodies, and danmu text.
- The safe summary is the default shareable artifact.

## Main Session Decision

Accepted as the safe external sharing path.

This aligns with OWASP Logging Cheat Sheet guidance to avoid logging/exporting sensitive data while keeping useful operational and audit records.

## Main Session Verification

Reran:

- `npm run report:trusted-weekly:safe`: PASS.
- Live safe API on `http://127.0.0.1:3201/api/self-media/reports/trusted-weekly-safe`: PASS, 200 response, no `contentId`, no forbidden sensitive terms.
- `npm run test:self-media`: PASS, 100/100.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not add a download endpoint for the full local weekly report without a separate main-session approval. The shareable endpoint is the safe summary only.
