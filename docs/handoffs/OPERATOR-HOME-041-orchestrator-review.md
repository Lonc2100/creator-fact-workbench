# OPERATOR-HOME-041 Orchestrator Review

## Decision

Not accepted as the final default `/dashboard` user view.

Accepted only as an intermediate diagnostic/operating prototype that must be cleaned or moved behind advanced diagnostics.

## Reviewed Evidence

- Worker handoff: `docs/handoffs/OPERATOR-HOME-041-worker-handoff.md`
- Screenshot inspected: `.local/OPERATOR-HOME-041-dashboard.png`
- Health check reported by worker:
  - `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS

## What Works

- The panel gives a compact "what needs attention today" status.
- It is read-only.
- It does not call real platform APIs.
- It does not change trusted dashboard/review totals.
- 3200 is healthy in the worker evidence.

## Why It Is Not Product-Accepted

The default dashboard screenshot still exposes internal diagnostics directly in the first viewport:

- `http://127.0.0.1:3200/dashboard`
- `.local/daily-self-media-ops/report.json`
- `page=yes / api=yes / trustedData=yes`
- `daily ops gate`
- `trusted audit`
- command-copy buttons such as copying health check, daily ops, and audit commands

This conflicts with `OPERATOR-VIEW-DATA-ONLY-041`: default dashboard should show data, charts, tables, and user-actionable business tasks. Internal health/preflight/audit details belong in advanced diagnostics or a developer/operator-only view.

## Current Operating Finding

The dashboard correctly surfaces a real gate failure, but the failure should be summarized in user language instead of showing internal command/report details.

Current failure source:

- `daily_platform_ops_gate` failed.
- `smoke:platform-ops-with-health` failed.
- `smoke:platform-operations-e2e` failed because isolated `/import` returned HTTP 500.

## Required Follow-Up

Create `DASHBOARD-DATA-ONLY-042`:

- remove default command-copy buttons from `/dashboard`;
- remove local URLs and report paths from first viewport;
- summarize health as business-level freshness/readiness badges;
- move preflight/audit/server details into collapsed advanced diagnostics or `/import` diagnostics;
- add a UI harness/smoke assertion that default `/dashboard` does not show `.local`, `npm run`, `http://127.0.0.1`, `/api/self-media`, `preflight`, `pageReady`, `apiReady`, `runId`, or report paths.
