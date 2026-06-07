# OPS-RELIABILITY-PORTS-040 Orchestrator Review

## Decision

Accepted with note: the worker handoff file named in chat was not present at review time.

## Review

The implementation was reviewed through code and verification artifacts. `docs/handoffs/OPS-RELIABILITY-PORTS-040-worker-handoff.md` was not found in the worktree, but the expected implementation exists:

- `local-server-health` supports optional `/dashboard` page readiness probing with `--check-page`.
- Strict daily preflight now requires API readiness, safe weekly readiness, trusted-data readiness, and page readiness.
- Reports include `pageReadyPorts`.
- The command remains read-only: it does not kill processes, start servers, delete files, or print full dashboard/safe weekly payloads.

The main operator service is now fixed to port 3200 via `npm run dev:operator`, using the real `.local/self-media.sqlite` DB and isolated `.next-operator` build output.

## Verification

- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page --out-dir=.local/orchestrator-040-final-3200-health`: PASS
  - healthyPorts: `3200`
  - apiReadyPorts: `3200`
  - safeWeeklyReadyPorts: `3200`
  - trustedDataReadyPorts: `3200`
  - pageReadyPorts: `3200`
- `npm run verify:harness`: PASS
  - `local server health rejects page-unavailable ports even when APIs and trusted data are ready`: PASS
- `git diff --check`: PASS

## Operator State

After cleanup, only port `3200` remained listening in the project 3200-3212 range.

Use:

```bash
npm run dev:operator
```

Then inspect:

```text
http://localhost:3200/dashboard
```

## Follow-Up

Future browser/E2E tasks may still use temporary ports, but they must clean up their child dev server and use isolated `NEXT_DIST_DIR`. The persistent operator view should stay on 3200.
