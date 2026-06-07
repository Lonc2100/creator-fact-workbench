# DAILY-OPS-PREFLIGHT-039 Worker Handoff

## Summary

Implemented optional strict local-server health preflight for `npm run ops:daily-self-media`.

Default daily ops behavior remains unchanged. The new behavior is enabled only with:

```bash
npm run ops:daily-self-media -- --preflight-health
```

When enabled, daily ops first runs:

```bash
npm run check:local-server-health -- --ports=3200,3201 --strict --out-dir=.local/daily-self-media-ops/local-server-health
```

If preflight passes, daily ops automatically uses the health report's `preferredDashboardUrl` for trusted audit and daily gate. If preflight fails or has no healthy port, daily ops writes a parent blocking report at `.local/daily-self-media-ops/report.*` and stops before reading old weekly/audit/gate child reports.

## Files Changed

- `scripts/daily-self-media-ops.mjs`
  - Added `--preflight-health`.
  - Added optional `--ports=` / `--preflight-ports=`.
  - Added strict local health step under `.local/daily-self-media-ops/local-server-health/report.json`.
  - Adopted `preferredDashboardUrl` after a passing preflight.
  - Wrote blocking parent report on preflight failure without continuing into stale child reports.
  - Kept command read-only: no process kill, no file deletion, no server start.
- `src/domain/self-media/types/self-media-types.ts`
  - Added daily self-media ops preflight view shape and step key.
- `src/domain/self-media/service/self-media-service.ts`
  - Added daily ops preflight view normalization for `/import`.
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Added read-only strict preflight status copy and port summaries to the daily ops panel.
- `src/app/globals.css`
  - Added compact styling support for the preflight block.
- `tests/self-media-contract.test.ts`
  - Added disabled/pass/fail preflight coverage.
  - Added UI view coverage for strict preflight status.
- `tests/ui-harness.test.mjs`
  - Added harness scan proving `/import` exposes preflight as read-only status, not as kill/start/delete actions.
- `docs/runbooks/self-media-daily-ops.md`
  - Documented optional preflight usage, failure behavior, reports, and safety boundary.
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - Updated daily ops/current guardrails from 038 default-off decision to 039 optional preflight.

## Verification

- `npm run test:self-media` PASS
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
- `npm run ops:daily-self-media -- --preflight-health` PASS
  - Adopted `http://127.0.0.1:3201/api/self-media/dashboard`.
  - Reported 3201 as healthy/API-ready/safe-weekly-ready.
  - Reported 3200 as listening but dashboard API timeout.
  - Wrote `.local/daily-self-media-ops/report.json` and `.local/daily-self-media-ops/report.md`.
- `git diff --check` PASS

## Safety Notes

- No DB was deleted.
- No process was killed.
- No local server was started automatically.
- The preflight path is explicit only; `npm run ops:daily-self-media` without flags keeps its previous default behavior.
- Failure path writes a current parent daily ops report and does not reuse stale child weekly/audit/gate reports.

## Needs Main Session Judgment

Yes.
