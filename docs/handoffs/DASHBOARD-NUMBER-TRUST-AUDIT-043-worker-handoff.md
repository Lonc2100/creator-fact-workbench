# DASHBOARD-NUMBER-TRUST-AUDIT-043 Worker Handoff

## Task ID

DASHBOARD-NUMBER-TRUST-AUDIT-043

## Completed Work

- Added a user-facing dashboard number consistency audit:
  - new command: `npm run audit:dashboard-numbers`;
  - runs an isolated SQLite database and isolated `NEXT_DIST_DIR`;
  - starts a temporary Next dev server;
  - runs the existing trusted dashboard audit against `/api/self-media/dashboard`;
  - opens `/dashboard` in Playwright and checks the default UI numbers against the trusted audit expected totals.
- The browser audit checks:
  - trusted dashboard audit status and mismatches;
  - default UI forbidden diagnostics are not visible;
  - default KPI total views and engagement;
  - trusted status strip trusted content/snapshot/views/engagement;
  - weekly summary trusted content/snapshot/views/engagement;
  - platform distribution views;
  - platform engagement totals;
  - weekly platform rows;
  - content ranking row order, views, and engagement.
- Tightened the default dashboard copy:
  - trusted consistency label now uses `数据一致` for pass and `需复核` otherwise;
  - default consistency row displays only key business numbers: trusted content, snapshots, views, engagement;
  - changed visible weekly wording from `最近审计` to `最近检查`.
- Added stable UI attributes for number verification without showing internals in visible text:
  - `dashboard-trusted-status`
  - `dashboard-weekly-summary`
  - `dashboard-real-data-scope`
  - `dashboard-kpi-total-views`
  - `dashboard-platform-distribution-row`
  - `dashboard-platform-engagement-row`
  - `dashboard-weekly-platform-row`
  - `dashboard-content-ranking-row`
- Added service-level contract coverage proving dashboard business number surfaces align with trusted audit totals.
- Updated UI harness coverage to keep dashboard number test ids and default data-only diagnostics boundary in place.

## Changed Files

- `package.json`
- `scripts/dashboard-number-trust-audit.mjs`
- `src/domain/self-media/ui/primitives/Panel.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/DASHBOARD-NUMBER-TRUST-AUDIT-043-worker-handoff.md`

Note: the repo already has a broad dirty/untracked working tree from prior tasks. I only claim the files above for this task.

## Evidence

- Dashboard number audit report: `.local/dashboard-number-trust-audit-043/report.json`
- Trusted audit report used by number audit: `.local/dashboard-number-trust-audit-043/trusted-dashboard-audit/report.json`
- Screenshot: `.local/dashboard-number-trust-audit-043/dashboard.png`
- Final number audit expected totals:
  - trusted content: `4`
  - trusted snapshots: `4`
  - views: `4770`
  - engagement: `502`
  - mismatches: `[]`

## Verification

- `npm run test:ui-harness` PASS
- `npm run typecheck` PASS
- `npm run audit:dashboard-numbers` PASS
- `npm run test:self-media` PASS, 122 tests
- `npm run verify:harness` PASS
- `git diff --check` PASS with non-blocking warning:
  - `warning: in the working copy of 'tsconfig.json', CRLF will be replaced by LF the next time Git touches it`

## Known Issues

- The audit report and screenshot live under `.local/` and intentionally include internal paths in the report artifact. The default `/dashboard` visible UI does not expose those paths.
- The dashboard still has some English eyebrows such as `Data actions`, `Weekly summary`, `Source / Platform`, `Post-import actions`, and `Operating tasks`. These are product copy polish items, not diagnostic leaks.
- The new browser audit uses an isolated four-platform fixture set, so it proves the UI/audit number pipeline and mismatch reporting. It does not mutate or validate the real operator DB on port 3200.

## Next Recommendation

- Orchestrator should inspect `.local/dashboard-number-trust-audit-043/dashboard.png` and `.local/dashboard-number-trust-audit-043/report.json`.
- If accepted, keep `npm run audit:dashboard-numbers` as the regression gate whenever dashboard number presentation changes.

## Orchestrator Decision Required

Yes.
