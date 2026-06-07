# DASHBOARD-DATA-ONLY-042 Worker Handoff

## Task ID

DASHBOARD-DATA-ONLY-042

## Completed Work

- Changed `/dashboard` default view toward a data-first operator dashboard:
  - kept KPI strips, chart panels, platform/source table, content performance table, daily/weekly summaries, post-import suggestions, and business action items visible by default;
  - moved internal health/audit/preflight/path/port/command details into a collapsed `dashboard-advanced-diagnostics` section;
  - renamed default action wording from internal/diagnostic copy to business-facing copy such as `今日数据动作`, `周报摘要`, and `业务行动项`.
- Sanitized default dashboard checklist details so report paths, local URLs, command failures, `exitCode`, preflight labels, and ops-gate details collapse into a business review message instead of rendering raw diagnostics.
- Kept trusted dashboard/review metric scope unchanged:
  - no service trusted-total logic was changed;
  - publish ledger/manual publish records remain explanatory UI data only and do not become trusted metric evidence.
- Updated UI copy in the dashboard metric grid so default visible labels avoid debug/source wording.
- Added/updated harness and smoke checks:
  - static UI harness asserts default dashboard business panels exist and diagnostic strings only belong in the advanced diagnostics implementation;
  - browser smoke asserts default `/dashboard` visible text does not contain `.local`, `report.json`, `report.md`, `D:\`, `npm run`, `http://127.0.0.1`, `/api/self-media`, `preflight`, `pageReady`, `apiReady`, `runId`, `rawDir`, `evidenceFile`, `smoke`, `fixture`, `demo/fake`, plus command/exitCode/ops-gate style diagnostic text;
  - smoke now starts Next dev with an isolated `NEXT_DIST_DIR` to avoid shared `.next` cache collisions during browser verification.
- Used native HTML disclosure behavior for advanced diagnostics, following the standard `<details>/<summary>` disclosure pattern documented by MDN: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details

## Changed Files

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/app/globals.css`
- `tests/ui-harness.test.mjs`
- `scripts/operating-e2e-dashboard-import.mjs`
- `docs/handoffs/DASHBOARD-DATA-ONLY-042-worker-handoff.md`

Note: the working tree already contains many unrelated modified/untracked files from prior tasks. I did not revert or clean unrelated files.

## Screenshot

- Dashboard default data-only screenshot: `.local/DASHBOARD-DATA-ONLY-042-dashboard.png`
- Smoke report: `.local/operating-e2e-dashboard-import-036/report.json`

## Verification

- `npm run test:ui-harness` PASS
- `npm run smoke:operating-dashboard-import` PASS
  - isolated DB: yes
  - isolated `NEXT_DIST_DIR`: yes
  - screenshot saved: `.local/DASHBOARD-DATA-ONLY-042-dashboard.png`
- `npm run test:self-media` PASS, 121 tests
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS with non-blocking warning:
  - `warning: in the working copy of 'tsconfig.json', CRLF will be replaced by LF the next time Git touches it`

## Known Issues

- The default dashboard still has a collapsed `高级诊断` disclosure at the bottom of the page. This is intentional and is not expanded by default.
- Some existing UI copy still uses English eyebrows such as `Weekly summary`, `Post-import actions`, and `Operating tasks`; these are not diagnostics and were left unchanged.
- Existing repo dirty state is broad; this handoff only claims the files listed above.

## Next Recommendation

- Orchestrator should inspect the saved screenshot and the dashboard diff to decide whether the default data-only wording is sufficiently business-facing, especially the `今日数据动作` table and bottom advanced diagnostics placement.
- If this pattern is accepted, keep future dashboard diagnostics behind the same collapsed advanced section and extend the visible-text smoke denylist when new internal diagnostics appear.

## Orchestrator Decision Required

Yes.
