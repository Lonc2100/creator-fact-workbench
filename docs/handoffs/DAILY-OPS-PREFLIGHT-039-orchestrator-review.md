# DAILY-OPS-PREFLIGHT-039 Orchestrator Review

## Decision

Accepted after main-session hardening.

## Main-Session Findings

The worker implementation was directionally correct, but local validation exposed two operating risks:

- A port can have dashboard and safe weekly APIs available while pointing at an isolated or empty DB. That must not be adopted for daily operations.
- Multiple stale dev servers can occupy the low 3200-range ports, so the preflight needs a wider read-only candidate range.

## Main-Session Fixes

- `scripts/local-server-health.mjs`
  - Expanded default diagnostic candidates to `3200..3212`.
  - Added `--require-trusted-data` so strict operating preflight only treats a port as healthy when it has nonzero trusted content and metric snapshots.
  - Reports `trustedDataReadyPorts` and gives a clear next action for usable APIs backed by the wrong/empty DB.
- `scripts/daily-self-media-ops.mjs`
  - Explicit preflight now runs local server health with `--require-trusted-data`.
  - Generic command failures now produce a useful next action instead of falling through to a misleading no-op message.
- `next.config.mjs`
  - Added optional `NEXT_DIST_DIR` support so operator/dev servers can avoid shared `.next` cache collisions.
- `.gitignore`
  - Ignores `.next-*/` local isolated build directories.

## Verification

- `npm run ops:daily-self-media -- --preflight-health`: PASS
  - Adopted `http://127.0.0.1:3208/api/self-media/dashboard` during validation.
  - Later manual browser inspection used clean `http://127.0.0.1:3212/dashboard`.
- `npm run test:self-media`: PASS, 119/119
- `npm run typecheck`: PASS
- `git diff --check`: PASS

## Boundary

No process was killed. No DB rows were deleted or migrated. Preflight remains explicit only; default `npm run ops:daily-self-media` behavior is unchanged.
