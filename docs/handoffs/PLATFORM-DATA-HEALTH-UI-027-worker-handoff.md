# PLATFORM-DATA-HEALTH-UI-027 Worker Handoff

## Scope

- Task: surface `npm run health:platform-data` report status in the product UI.
- Read first: `AGENTS.md`, `PLATFORM-DATA-HEALTH-026-orchestrator-review.md`, `PLATFORM-BILIBILI-ENABLE-023-rerun-orchestrator-review.md`, `DASHBOARD-FOUR-PLATFORM-POLISH-025-orchestrator-review.md`.
- Boundary kept: UI reads existing `.local/platform-data-health/report.json` only. It does not run `health:platform-data`, collect platform data, save imports, or read raw payload bodies.

## Changes

- Added `PlatformDataHealthView` types to `DashboardSnapshot`.
- Added `readPlatformDataHealthView(cwd)` in service layer to read and normalize `.local/platform-data-health/report.json`.
- Dashboard snapshot now includes `platformDataHealth`.
- `/import` now shows a compact read-only `数据健康` panel above platform import status.
- The panel displays:
  - overall status;
  - four-platform raw counts;
  - mapping preview and save smoke existence/status;
  - latest generated time;
  - missing/stale/source mismatch counts;
  - Bilibili account previewOnly/saved/candidate status.
- Missing report state tells the operator to run `npm run health:platform-data`.
- Added tests for missing, ok, and warn/stale/source-mismatch report states.

## Files Touched

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`

## Screenshot

- `.local/platform-data-health-ui-027.png`
- Captured `/import` from a temporary dev server at `http://127.0.0.1:3201/import`.
- Existing `127.0.0.1:3200` server had a stale `.next` 500 error, so a temporary hidden server was started for screenshot and then stopped.

## Verification

- `npm run test:self-media` -> pass, 69 tests.
- `npm run typecheck` -> pass.
- `npm run verify:harness` -> pass.
- `git diff --check` -> pass.

## Residual Notes

- The UI reflects the latest generated report file only. It intentionally does not refresh or regenerate the report.
- If `.local/platform-data-health/report.json` is stale, the panel surfaces the stale count from that report; it does not recompute file ages.
- Main session should decide whether future UI should expose a manual “run health check” workflow. This task kept it read-only.

## Main Session Judgment

- Required: yes, per task instruction.
