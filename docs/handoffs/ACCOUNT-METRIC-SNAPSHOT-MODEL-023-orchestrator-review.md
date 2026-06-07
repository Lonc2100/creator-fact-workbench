# ACCOUNT-METRIC-SNAPSHOT-MODEL-023 Orchestrator Review

## Decision

Accepted.

The project now has a generic account-level metric model and dashboard grouping that stay separate from content-level metrics.

## Reviewed Inputs

- Worker handoff: `docs/handoffs/ACCOUNT-METRIC-SNAPSHOT-MODEL-023-worker-handoff.md`
- Screenshot: `.local/account-metric-snapshot-model-023.png`
- Types, Repo, Service, Dashboard UI, and tests

## Accepted Behavior

- `AccountMetricSnapshot` is separate from `MetricSnapshot`.
- Repo supports account snapshot upsert/list.
- Dashboard exposes account snapshots and account groups separately.
- Dashboard UI shows a compact account trend panel.
- Empty state is shown when there are no real account snapshots.
- Weekly/monthly review totals do not include account snapshots.
- Bilibili `accountMetrics` and `dateKeyRows` are still not persisted.

## Screenshot Check

The orchestrator viewed `.local/account-metric-snapshot-model-023.png`.

The account trend section is visible and correctly communicates that account metrics are independent from content-level `MetricSnapshot` totals.

## Orchestrator Verification

The orchestrator reran:

- `npm run test:self-media`: PASS, 57 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS
- `npm run verify:harness`: PASS

## Current Stage

Accepted as the foundation for future account-level analytics.
