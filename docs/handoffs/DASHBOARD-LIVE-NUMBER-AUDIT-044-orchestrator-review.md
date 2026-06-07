# DASHBOARD-LIVE-NUMBER-AUDIT-044 Orchestrator Review

Date: 2026-06-05

## Verdict

Accepted.

This closes the 043 follow-up for dashboard number trust by adding a live, read-only audit path against the fixed operator server.

## Accepted Evidence

- `npm run audit:dashboard-numbers -- --live --base-url=http://127.0.0.1:3200` PASS
- Fixture dashboard-number audit PASS
- `npm run test:ui-harness` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS, with only the existing `tsconfig.json` CRLF warning

## Current Live Trusted Totals

- Trusted content rows: 18
- Trusted metric snapshots: 18
- Views: 344377
- Engagement: 4258

Platform distribution from the accepted live audit:

| Platform | Content | Snapshots | Views | Engagement |
| --- | ---: | ---: | ---: | ---: |
| Bilibili | 9 | 9 | 581 | 27 |
| Douyin | 5 | 5 | 73423 | 1222 |
| Video Account | 3 | 3 | 259706 | 2876 |
| Xiaohongshu | 1 | 1 | 10667 | 133 |

## Boundary Decisions

- Live mode is read-only. It must not create fixture DBs, start servers, write real databases, or delete local files.
- Dashboard default UI must not expose local paths, npm commands, API URLs, run ids, raw dirs, evidence files, smoke/demo/fixture wording, or audit/debug fields.
- Fixture mode remains useful as a regression harness, but current-operator acceptance should prefer live mode when validating what the user sees on 3200.

## Follow-Up

- Future dashboard number changes should run both fixture and live audit when 3200 is the target user-inspection server.
