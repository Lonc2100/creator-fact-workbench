# TRUSTED-WEEKLY-REPORT-EXPORT-035 Orchestrator Review

## Decision

Accepted.

The trusted weekly report now has a safe redacted export path and a read-only dashboard summary.

## Accepted Behavior

- `npm run report:trusted-weekly` still writes full local evidence under `.local/trusted-weekly-report/report.*`.
- `npm run report:trusted-weekly:safe` writes only the redacted summary under `.local/trusted-weekly-report/redacted-summary.*`.
- The redacted summary keeps trusted totals, platform overview, performance ranks without titles, freshness, excluded counts, recommendation types, and consistency checks.
- The redacted summary omits real content titles, content ids, account metrics, capture details, platform interaction text, credentials, headers, raw payload bodies, comment bodies, and danmu text.
- `/dashboard` shows a read-only safe weekly summary and tells operators that full reports are local evidence while external sharing should use the redacted summary.

## Main Session Decision

Approve the redacted summary as the default shareable/exportable weekly report artifact.

The full local report remains local evidence only. This aligns with OWASP Logging Cheat Sheet guidance to avoid logging or exporting sensitive data while retaining useful operational and audit information.

## Main Session Verification

Reran:

- `npm run report:trusted-weekly:safe`: PASS, redacted summary generated.
- `npm run report:trusted-weekly`: PASS after running sequentially.
- `npm run test:self-media`: PASS, 98/98.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `git diff --check`: PASS.

## Main Session Note

Do not run `npm run report:trusted-weekly` and `npm run report:trusted-weekly:safe` in parallel against the same local sqlite DB. Running them sequentially avoids transient `database is locked` failures.

## Boundary

Do not paste or publish `.local/trusted-weekly-report/report.*` wholesale. Use `.local/trusted-weekly-report/redacted-summary.*` for external sharing unless a separate redaction/export task approves a different artifact.
