# TRUSTED-OPERATING-REVIEW-UI-031 Orchestrator Review

## Decision

Accepted.

Trusted scope, profile, seed mode, and latest audit status are now visible in the UI instead of being hidden only in scripts.

## Accepted Behavior

- `/dashboard` shows a compact trusted operating strip.
- `/import` shows the trusted audit command and latest report summary.
- Missing audit reports display as unaudited, not pass.
- UI reads only summarized report fields.
- No collection buttons, raw payload reads, cookies, tokens, headers, comments, or danmu text are added.

## Main Session Verification

Reran after review:

- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run test:self-media`: PASS, 85/85.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

## Boundary

This UI is status and review only. It must not trigger platform collection or platform login flows from the trusted audit panel.
