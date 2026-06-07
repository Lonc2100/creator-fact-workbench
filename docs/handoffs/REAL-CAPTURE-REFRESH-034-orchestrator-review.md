# REAL-CAPTURE-REFRESH-034 Orchestrator Review

## Decision

Accepted.

The refresh loop is accepted as a read-only freshness check after manual platform collection. It does not collect platform data, open browser sessions, read raw payload bodies, write the operating DB, or touch WeChat.

## Accepted Behavior

- `npm run check:real-capture-freshness` writes only `.local/real-capture-freshness/report.json` and `.local/real-capture-freshness/report.md`.
- The report covers Douyin, Xiaohongshu, Video Account, and Bilibili content-level loops only.
- Real capture freshness is judged from local raw capture file modification time.
- Smoke freshness remains separate and must not make stale real capture evidence look fresh.
- WeChat Official Account remains paused.

## Main Session Decision

Real capture stale status is still warning-first, not an automatic DB blocker.

Reason: the operator cadence is still being stabilized. The check is now the daily signal for whether the user should refresh capture manually before preview/save/audit.

## Main Session Verification

Reran:

- `npm run check:real-capture-freshness`: PASS, stale platforms none, missing platforms none.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run test:self-media`: PASS, 96/96.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not turn this command into an automatic real-platform crawler or hidden login runner. Manual login/capture remains separate from preview/save/audit.
