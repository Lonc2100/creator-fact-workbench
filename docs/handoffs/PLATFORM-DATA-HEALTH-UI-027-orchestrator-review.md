# PLATFORM-DATA-HEALTH-UI-027 Orchestrator Review

## Decision

Accepted.

The `/import` page now displays the latest platform data health report as a read-only operational status panel.

## Reviewed Inputs

- Worker handoff: `docs/handoffs/PLATFORM-DATA-HEALTH-UI-027-worker-handoff.md`
- Screenshot: `.local/platform-data-health-ui-027.png`
- Service/UI/types/test changes

## Accepted Behavior

The UI reads `.local/platform-data-health/report.json` and displays:

- overall status;
- four-platform raw counts;
- preview/smoke state;
- latest generated time;
- missing/stale/source mismatch counts;
- Bilibili account `previewOnly` / `saved=false` / candidate status.

The UI does not:

- run `npm run health:platform-data`;
- collect platform data;
- save imports;
- read raw payload bodies.

Missing report state points operators to run:

```text
npm run health:platform-data
```

## Screenshot Check

The orchestrator viewed `.local/platform-data-health-ui-027.png`.

The health panel is compact, readable, and correctly shows Bilibili account metrics as preview-only.

## Orchestrator Verification

The orchestrator reran:

- `npm run smoke:platform-operations-e2e`: PASS
- `npm run test:self-media`: PASS, 69 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS
- `npm run verify:harness`: PASS

## Follow-Up

Keep this panel read-only for now. A manual "run health check" workflow should be a separate task because it would execute local scripts from UI/API.

## Current Stage

Accepted as the read-only data health surface for platform operations.
