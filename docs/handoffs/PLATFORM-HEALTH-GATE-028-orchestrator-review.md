# PLATFORM-HEALTH-GATE-028 Orchestrator Review

## Decision

Accepted as the default operator smoke gate around local platform import work.

Use:

```bash
npm run smoke:platform-ops-with-health
```

as the combined gate when a worker changes `/import`, platform save smoke, platform operation history, or platform data health behavior.

## What This Gate Proves

- Health evidence exists before platform operation smoke runs.
- Missing platforms, health errors, and source mismatches block the full smoke.
- Four-platform save smoke still runs through the existing platform save path.
- `/import` operation E2E smoke still verifies the operator UI and history path.
- Health is checked again after the operation smoke.

## Important Boundary

This gate does not prove that the dashboard is using the correct business data scope.

It can confirm platform evidence freshness and source matching, but it does not by itself exclude older demo, smoke, manual, csv, mediacrawler, n8n, or paused WeChat rows from dashboard/review aggregation.

So this gate is accepted as an operations regression gate, not as the final answer to the current data-trust issue.

## Follow-up Required

After `REAL-DATA-SCOPE-029`, this gate should either:

- include a trusted-real-data assertion, or
- call a separate trusted scope smoke before reporting the local platform state as operator-ready.

## Notes For Future Workers

- Do not resume WeChat Official Account work through this gate.
- Do not promote Bilibili account diagnostics into durable content metrics through this gate.
- Keep reports to command summaries and health summaries only.
- Do not write raw platform payloads, cookies, tokens, headers, comment bodies, or private content into the report.
