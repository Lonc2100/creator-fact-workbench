# DAILY-OPS-ONE-COMMAND-036 Orchestrator Review

## Decision

Accepted after main-session hardening.

The daily operating loop now has a single serial command.

## Accepted Behavior

- `npm run ops:daily-self-media` runs the daily checks serially.
- The command runs platform health, real capture freshness, trusted weekly safe report, trusted dashboard audit, and daily gate.
- The command writes `.local/daily-self-media-ops/report.json` and `.local/daily-self-media-ops/report.md`.
- The report stores summaries and statuses only, not child stdout/stderr.
- The weekly report portion is redacted-only.
- No real platform collection, platform login, DB deletion, WeChat restoration, or Bilibili account metric save is performed.

## Main Session Fix

If a child command fails, the runner now ignores that step's existing report file instead of reading stale old output. This prevents misleading states where a command fails but the summary looks like a previous pass.

## Main Session Decision

Accepted as the default daily operator command.

Use the default 3200 dashboard URL when the local server is healthy. In this review, the existing 3200 process was listening but API calls timed out, so live verification used the already-running 3201 server with `--dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard`.

## Main Session Verification

Reran:

- `npm run ops:daily-self-media -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard`: PASS.
- `npm run test:self-media`: PASS, 100/100.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

Also verified:

- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard`: PASS.

## Boundary

Do not run this command in parallel with other browser/E2E daily gates. It is serial internally, but it still invokes commands that can use local sqlite, local ports, and temporary browser sessions.
