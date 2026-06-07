# DATA-FRESHNESS-NEXT-033 Orchestrator Review

## Decision

Accepted.

The product now separates real capture freshness, smoke freshness, and audit freshness. A fresh smoke report must not make stale real capture evidence look fresh.

## Accepted Behavior

- Platform health reports `latestRealCaptureAt`, `latestSmokeAt`, and `latestAuditAt` separately.
- Health summary includes `realCaptureStaleCount`.
- Daily gate and trusted audit carry freshness summaries forward.
- `/import` displays summary freshness only.
- Smoke time remains separate from real capture time.

## Main Session Decision

Real capture staleness remains warning-only for now.

Reason: the real collection cadence is not fixed yet, and making stale captures blocking today would make the daily gate fail even when the dashboard/audit contract is otherwise correct. Revisit this once the operator cadence for real platform collection is defined.

## Main Session Verification

Reran:

- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run test:self-media`: PASS, 92/92.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

## Boundary

This task does not add collection, browser automation, WeChat work, or any raw payload UI.
