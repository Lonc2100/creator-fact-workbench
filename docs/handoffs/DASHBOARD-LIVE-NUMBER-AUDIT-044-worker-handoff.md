# DASHBOARD-LIVE-NUMBER-AUDIT-044 Worker Handoff

## Status

- Completed.
- Added live read-only mode for `npm run audit:dashboard-numbers -- --live --base-url=http://127.0.0.1:3200`.
- Live mode compares the current `/dashboard` UI against the current `/api/self-media/dashboard` snapshot and trusted dashboard audit totals without creating a fixture DB, starting an isolated server, deleting data, or writing the operating DB.

## Implementation

- `scripts/dashboard-number-trust-audit.mjs`
  - Added `--live` and `--base-url` parsing with default live target `http://127.0.0.1:3200`.
  - Fixture mode still seeds an isolated sqlite DB and temporary Next dev port.
  - Live mode only waits for the supplied 3200 dashboard API to be ready, then runs the trusted dashboard audit against the live dashboard URL using the current environment.
  - Report now records `mode`, `liveReadOnly`, `dbPath`, `nextDistDir`, and a `scope` block:
    - `readOnly: true`
    - `fixtureDatabaseCreated: false`
    - `realDatabaseWrites: false`
    - `serverStarted: false`
    - `databaseDeletion: false`
  - Added API snapshot checks for trusted operating status, real data scope, weekly summary, audit status, audit mismatches, and platform distribution.
  - Dashboard UI checks cover trusted status, weekly summary, KPI totals, real data scope, platform distribution, platform engagement, weekly platform rows, visible content ranking, and hidden default diagnostics.
  - Content ranking now respects the default UI's visible Top 8 rows while full totals remain covered by KPI, platform, weekly, and trusted audit checks.

- `tests/ui-harness.test.mjs`
  - Added a static contract that live mode is read-only against existing 3200 and does not use the fixture DB/server path.
  - Kept default operator copy quiet while allowing explicit publish confirmation / ledger safety copy.

- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
  - Restored/kept explicit manual publish confirmation copy needed by existing UI contracts:
    - manual confirmation only records local results;
    - no real platform API call;
    - publish ledger records are not trusted metric evidence.

## Live Evidence

- Command: `npm run audit:dashboard-numbers -- --live --base-url=http://127.0.0.1:3200`
- Result: PASS
- Report: `.local/dashboard-number-trust-audit-043/report.json`
- Screenshot: `.local/dashboard-number-trust-audit-043/dashboard.png`
- Trusted audit report: `.local/dashboard-number-trust-audit-043/trusted-dashboard-audit/report.json`
- Live report fields:
  - `mode: "live"`
  - `liveReadOnly: true`
  - `dbPath: null`
  - `nextDistDir: null`
  - `scope.fixtureDatabaseCreated: false`
  - `scope.realDatabaseWrites: false`
  - `scope.serverStarted: false`
  - `scope.databaseDeletion: false`
  - `mismatches: []`

## Current Live Trusted Totals

- Trusted content: 18
- Trusted metric snapshots: 18
- Views: 344377
- Engagement: 4258
- Platform distribution:
  - Bilibili: 9 contents, 9 snapshots, 581 views, 27 engagement
  - Douyin: 5 contents, 5 snapshots, 73423 views, 1222 engagement
  - Video account: 3 contents, 3 snapshots, 259706 views, 2876 engagement
  - Xiaohongshu: 1 content, 1 snapshot, 10667 views, 133 engagement

## Default UI Diagnostics Guard

The live audit checks default `/dashboard` visible text does not expose internal diagnostics including:

- `.local`
- `npm run`
- `http://127.0.0.1`
- `/api/self-media`
- report paths
- `runId`
- `rawDir`
- `preflight`
- `pageReady`
- `apiReady`
- fixture/demo/fake/audit/dashboard-json/dashboard-url terms

## Verification

- `npm run audit:dashboard-numbers -- --live --base-url=http://127.0.0.1:3200` PASS
- `npm run audit:dashboard-numbers` PASS
- `npm run test:ui-harness` PASS
- `npm run verify:harness` PASS
  - Includes `npm run typecheck`
  - Includes `npm run test:self-media` with 122 passing tests
- `git diff --check` PASS
  - Note: command exited 0 with existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.

## Boundaries

- Did not delete or migrate any DB.
- Did not restore WeChat.
- Did not call any real platform publish API.
- Did not write the operating DB in live mode.
- Did not expose raw payload, cookie, token, header, comment, or danmu data in default UI.
