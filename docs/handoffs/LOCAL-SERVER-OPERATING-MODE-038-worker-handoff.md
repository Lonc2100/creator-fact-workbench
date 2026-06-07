# LOCAL-SERVER-OPERATING-MODE-038 Worker Handoff

## Task

LOCAL-SERVER-OPERATING-MODE-038

## Completed Work

- Kept the default local server health command as diagnostic/read-only mode: it still writes `.local/local-server-health/report.json` and `report.md`, prints a summarized JSON result, and exits 0 when the diagnostic itself runs.
- Added strict operating preflight mode:
  - `npm run check:local-server-health -- --ports=3200,3201 --strict`
  - no `healthyPorts` now exits nonzero while still writing the report.
- Expanded the local server health report with clearer operating fields:
  - `apiReadyPorts`
  - `safeWeeklyReadyPorts`
  - `oldRoutePorts`
  - `staleOrOldRoutePorts`
  - per-port `issue`
  - per-endpoint `apiReady`
- Kept the report redacted: it stores trusted totals summaries and safe weekly readiness only, not full dashboard JSON or safe weekly markdown.
- Updated the daily ops runbook with:
  - strict health preflight before daily/audit/ops;
  - using `preferredDashboardUrl` for `ops:daily-self-media`;
  - stale dev server handling as manual confirmation steps only, with no automatic kill/restart.
- Updated `CURRENT-PLATFORM-STATUS.md` so future workers see strict local server health as the current operating mode.
- Fixed a narrow TypeScript status comparison in content draft review that surfaced during required typecheck.

## Changed Files

- `scripts/local-server-health.mjs`
- `tests/self-media-contract.test.ts`
- `docs/runbooks/self-media-daily-ops.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `src/domain/self-media/service/self-media-service.ts`
- `docs/generated/template-doctor-report.md` refreshed by `npm run verify:harness`

## Tests Added / Updated

- Healthy local server report now asserts API-ready and safe-weekly-ready ports.
- Timeout/stale server test now asserts `staleOrOldRoutePorts` and per-port issue.
- Added old-route/404 test distinct from not-listening.
- Added CLI diagnostic-vs-strict exit behavior test.
- Safe scan coverage remains in place and verifies sensitive payloads are not echoed.

## Verification

- `npm run test:self-media` PASS
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS
- `npm run check:local-server-health -- --ports=3200,3201` PASS
  - Current healthyPorts: `3201`
  - Current preferredDashboardUrl: `http://127.0.0.1:3201/api/self-media/dashboard`
  - Current staleOrOldRoutePorts: `3200`

## Boundary Checks

- Did not kill processes.
- Did not delete files or database rows.
- Did not auto-start a dev server.
- Did not collect platform data.
- Did not print full dashboard JSON or safe weekly markdown.
- Did not expose cookies, tokens, headers, raw payload, comments, or danmu.
- Did not touch WeChat or Bilibili account-level metric save behavior.

## Orchestrator Decision Required

Yes. Main session should decide whether daily scripts should automatically call `check:local-server-health --strict` before `ops:daily-self-media`, or keep strict preflight as an operator-run command only.
