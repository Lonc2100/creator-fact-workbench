# OPS-RELIABILITY-PORTS-040 Worker Handoff

## Task ID

OPS-RELIABILITY-PORTS-040

## Completed Work

- Added optional page-level readiness probing to `local-server-health` with `--check-page`.
  - The check probes `/dashboard` and records `dashboardPage.status`, `pageReady`, HTTP status, duration, and error message.
  - Healthy ports now remain explicitly gated by dashboard API, safe weekly API, trusted-data readiness when required, and page readiness when enabled.
  - Summary output now separates `apiReadyPorts`, `safeWeeklyReadyPorts`, `trustedDataReadyPorts`, and `pageReadyPorts`.
  - Page failures are classified separately as `dashboard_page_timeout`, `dashboard_page_old_route`, or `dashboard_page_error`.
- Kept the health check read-only.
  - No process kill, no service start, no file delete, and no port cleanup behavior was added.
- Hardened daily ops preflight.
  - `ops:daily-self-media -- --preflight-health` now invokes `check:local-server-health --strict --require-trusted-data --check-page`.
  - It only adopts `preferredDashboardUrl` when the selected port is API-ready, safe-weekly-ready, trusted-data-ready, and page-ready.
  - Blocking copy now says the preflight failed because no dashboard/safe API/trusted-data/page-ready port exists.
- Exposed the stricter readiness state in the service/UI contract.
  - Daily ops preflight view now includes `trustedDataReadyPorts` and `pageReadyPorts`.
  - `/import` daily ops status copy shows API, safe weekly, trusted data, page-ready, and stale/old-route buckets.
- Updated daily ops documentation.
  - Runbook now documents strict page readiness checks.
  - Multi Next dev server guidance now recommends isolated `NEXT_DIST_DIR`, for example `.next-dev-3211`.
  - Current platform status now records the OPS-RELIABILITY-PORTS-040 boundary.
- Added/updated contract coverage.
  - Service contract covers healthy page-ready ports and rejects page-unavailable ports even when APIs and trusted data are ready.
  - Daily ops preflight contract verifies `--check-page` and the new readiness arrays.
  - UI harness checks that Import UI surfaces `trustedData` and `pageReady` while remaining read-only.

## Changed Files

- `scripts/local-server-health.mjs`
- `scripts/daily-self-media-ops.mjs`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/runbooks/self-media-daily-ops.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/OPS-RELIABILITY-PORTS-040-worker-handoff.md`

Note: the worktree already contains many unrelated modified/untracked files from earlier tasks. This task did not revert or clean them.

## Verification

- `npm run test:self-media` PASS
  - 120 tests passed.
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
  - includes typecheck, context check, arch lint, structure tests, reference tests, UI harness tests, self-media tests, entropy tests, agent trajectory tests, and template doctor.
- `git diff --check` PASS
  - Only warning observed: `tsconfig.json` CRLF will be replaced by LF the next time Git touches it. No whitespace errors.

## Screenshots

- Not captured. This task did not require live browser validation because the new page probe is covered by contract mocks and `verify:harness`; no dev server was started and no port was cleaned.

## Known Issues

- Existing dirty worktree remains dirty and includes many prior task artifacts.
- `git diff --check` reports a CRLF warning for `tsconfig.json`; it is not a whitespace failure.
- The new page probe is optional for `check:local-server-health` and active for daily ops preflight. Default business dashboard/review data scope was not changed.

## Boundaries Kept

- Did not change trusted dashboard/reviews totals or default trusted data口径.
- Did not kill processes, start services, delete files, or clear old ports.
- Did not add automatic `Stop-Process`, kill, or cleanup behavior.
- Did not adopt empty DB, old-route, stale API, or page-unavailable ports in daily ops preflight.

## Next Recommendation

- Orchestrator should review the handoff and diff for the new strict preflight/page-readiness behavior.
- If a real local browser sanity check is desired later, run it on an isolated port with an isolated sqlite profile and isolated `NEXT_DIST_DIR`, then pass `--check-page`.

## Orchestrator Decision Required

Yes.
