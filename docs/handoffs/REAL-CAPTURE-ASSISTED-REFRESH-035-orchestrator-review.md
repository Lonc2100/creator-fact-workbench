# REAL-CAPTURE-ASSISTED-REFRESH-035 Orchestrator Review

## Decision

Accepted.

Real capture freshness now has a read-only assisted operator loop in reports and `/import`.

## Accepted Behavior

- `npm run check:real-capture-freshness` includes per-platform manual next actions and command plans.
- `npm run health:platform-data` includes `realCaptureStatus`, `nextAction`, and safe command strings for the four active content platforms.
- `/import` displays real capture freshness, recent real capture time, recent smoke time, recent audit time, and per-platform command cards.
- The command cards are guidance only; they do not run commands, open real platform pages, log in, collect data, or write the DB.
- WeChat remains paused.
- Bilibili assisted refresh is archives/content-level only; account-level metrics remain preview-only.

## Main Session Decision

This is sufficient for the daily operator surface for now.

Reason: it closes the missing usability gap without crossing into automatic real-platform collection. A later compact dashboard variant can be considered after the user has run the daily loop a few times.

## Main Session Verification

Reran:

- `npm run check:real-capture-freshness`: PASS, stale platforms none, missing platforms none.
- `npm run health:platform-data`: PASS, status ok, checks ok=14, warn=0, error=0.
- `npm run test:self-media`: PASS, 98/98.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not convert the assisted command cards into one-click real-platform collection without a separate main-session decision. They must remain read-only operator guidance.
