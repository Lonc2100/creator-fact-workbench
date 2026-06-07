# DASHBOARD-NUMBER-TRUST-AUDIT-043 Orchestrator Review

## Decision

Accepted as a dashboard number-presentation regression gate.

The new `npm run audit:dashboard-numbers` proves that dashboard-visible business numbers can be checked against trusted audit totals in an isolated browser run.

## Reviewed Evidence

- Worker handoff: `docs/handoffs/DASHBOARD-NUMBER-TRUST-AUDIT-043-worker-handoff.md`
- Audit report inspected: `.local/dashboard-number-trust-audit-043/report.json`
- Screenshot inspected: `.local/dashboard-number-trust-audit-043/dashboard.png`
- Worker verification:
  - `npm run audit:dashboard-numbers` PASS
  - `npm run typecheck` PASS
  - `npm run test:self-media` PASS
  - `npm run verify:harness` PASS
  - `git diff --check` PASS

## Accepted Outcomes

- The audit checks default dashboard visible totals against trusted audit expected totals.
- It covers status strip, weekly summary, real-data scope, KPI total views, platform distribution, platform engagement, weekly platform rows, and content ranking rows.
- It also verifies default dashboard visible text does not expose internal diagnostics.
- Stable UI attributes were added for number verification without showing internals to the user.

## Important Scope Note

The current audit command uses an isolated fixture database. It proves the presentation/audit pipeline and prevents dashboard-number regressions, but it does not itself screenshot-compare the current live 3200 operator DB.

Main-session live API check on June 5, 2026 confirmed the current 3200 trusted totals:

- trusted content: 18
- trusted metric snapshots: 18
- views: 344377
- engagement: 4258
- trusted audit status: pass
- daily ops status: pass
- daily platform gate status: pass

## Recommended Follow-Up

Add a live read-only mode for the number audit, for example `npm run audit:dashboard-numbers -- --base-url=http://127.0.0.1:3200 --live`, to compare current live dashboard UI text against current live trusted audit totals without creating or mutating a database.
