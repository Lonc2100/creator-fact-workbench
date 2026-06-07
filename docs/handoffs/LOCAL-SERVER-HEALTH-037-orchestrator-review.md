# LOCAL-SERVER-HEALTH-037 Orchestrator Review

## Decision

Accepted.

## What Was Accepted

- Added `npm run check:local-server-health -- --ports=3200,3201` as a read-only local server diagnostic.
- The script separates TCP listening from API readiness for `/api/self-media/dashboard` and `/api/self-media/reports/trusted-weekly-safe`.
- It writes summarized reports to `.local/local-server-health/report.json` and `.local/local-server-health/report.md`.
- It records trusted totals summaries and next actions only; it does not print full dashboard JSON or safe weekly markdown.
- It does not kill processes, delete files, start servers, or collect platform data.

## Main Session Verification

- Started a clean review server on `http://127.0.0.1:3410`.
- `npm run check:local-server-health -- --ports=3200,3201,3410 --timeout-ms=8000`: PASS
  - Healthy ports in the current report: `3201`, `3410`.
  - `3200` is listening but dashboard and safe weekly APIs time out.
  - Preferred dashboard URL from the current report: `http://127.0.0.1:3201/api/self-media/dashboard`.
- Direct checks on `3410`:
  - `/api/self-media/dashboard`: HTTP 200
  - `/api/self-media/reports/trusted-weekly-safe`: HTTP 200
- `npm run test:self-media`: PASS, 111/111
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS

## Main Session Judgment

The health command is accepted as an operator diagnostic. Its shell exit code indicates that the diagnostic command ran; operators should read `report.status`, `report.passed`, and `summary.healthyPorts` to decide whether a port is usable.

The current local machine has at least one stale or wedged dev server: `3200` is TCP-listening but API-unhealthy. Do not assume a listening port is usable. Run the health check and pass a healthy dashboard URL into daily/audit commands.

## References

- Node.js TCP client API: https://nodejs.org/api/net.html
- Node.js `AbortSignal.timeout`: https://nodejs.org/api/globals.html#abortsignaltimeoutdelay
