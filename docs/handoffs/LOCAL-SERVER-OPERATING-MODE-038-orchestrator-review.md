# LOCAL-SERVER-OPERATING-MODE-038 Orchestrator Review

## Decision

Accepted with one operating decision.

## What Was Accepted

- Default `npm run check:local-server-health -- --ports=3200,3201` remains read-only diagnostic mode and exits zero when the diagnostic runs.
- Strict mode is available:

```bash
npm run check:local-server-health -- --ports=3200,3201 --strict
```

- Strict mode exits nonzero when there are no healthy ports.
- Reports now distinguish TCP listening, dashboard API readiness, safe weekly API readiness, timeout, old-route/404, and stale/old-route ports.
- Reports remain redacted and do not store full dashboard JSON or safe weekly markdown.
- Runbook now gives manual stale dev server handling only; no automatic process kill, file deletion, server start, or platform collection.

## Main Session Decision

Keep strict health as an operator-run preflight for now. Do not automatically run it inside `ops:daily-self-media` yet.

Reason: `ops:daily-self-media` can be used with explicit `--dashboard-url` and may later support dashboard JSON/offline modes. Hard-wiring strict port checks into the command could make valid non-port workflows fail. A future task can add an explicit opt-in such as `--preflight-health`.

## Main Session Verification

- `npm run check:local-server-health -- --ports=3200,3201 --strict`: PASS
  - healthyPorts: `3201`
  - apiReadyPorts: `3201`
  - safeWeeklyReadyPorts: `3201`
  - staleOrOldRoutePorts: `3200`
  - preferredDashboardUrl: `http://127.0.0.1:3201/api/self-media/dashboard`
- `npm run test:self-media`: PASS, 115/115
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS

## Boundaries

- No existing dev server was killed.
- No files or DB rows were deleted.
- No server was auto-started by the health command.
- No platform capture or login was triggered.
