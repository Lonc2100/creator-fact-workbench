# CONTENT-CURATION-E2E-032 Worker Handoff

## Task

Give `排除出运营看板 / 恢复` a real UI E2E proof: operate `/content`, exclude one Bilibili content-level archives item, confirm `/dashboard`, `/reviews`, and trusted audit numbers drop, then restore and confirm numbers rise again. Do not output private titles or raw payload.

## Completed Work

- Added `scripts/content-curation-e2e.mjs`.
- The script creates an isolated sqlite database under `.local/content-curation-e2e/` with seed mode off.
- The script seeds only sanitized Bilibili creator-center content-level archives facts.
- Playwright opens `/content`, clicks the visible `排除出运营看板` button, checks dashboard/review counts, opens `/dashboard` and `/reviews`, runs trusted dashboard audit, then clicks `恢复` and repeats the checks.
- The report stores content id, platform/source, counts, audit summaries, and screenshot paths only. It does not store raw payload and marks title storage as false.
- Fixed `scripts/platform-operations-e2e-smoke.mjs` default smoke DB path formatting from Windows `path.join` output to stable POSIX-style relative text so the existing contract test passes on Windows.

External reference checked: Playwright screenshot API docs, <https://playwright.dev/docs/screenshots>.

## Evidence

E2E command:

```bash
node --import tsx scripts/content-curation-e2e.mjs
```

Result: PASS.

Report:

- `.local/content-curation-e2e/report.json`

Screenshots:

- `.local/content-curation-e2e/screenshots/01-content-before-exclude.png`
- `.local/content-curation-e2e/screenshots/02-content-after-exclude.png`
- `.local/content-curation-e2e/screenshots/03-dashboard-after-exclude.png`
- `.local/content-curation-e2e/screenshots/04-reviews-after-exclude.png`
- `.local/content-curation-e2e/screenshots/05-content-after-restore.png`
- `.local/content-curation-e2e/screenshots/06-dashboard-after-restore.png`
- `.local/content-curation-e2e/screenshots/07-reviews-after-restore.png`

Numeric proof from the sanitized E2E report:

| Phase | Trusted contents | Trusted snapshots | User-excluded contents | Review views | Review engagement | Bilibili trusted snapshots | Bilibili excluded snapshots | Audit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| before | 2 | 2 | 0 | 2000 | 192 | 2 | 0 | pass |
| after exclude | 1 | 1 | 1 | 1280 | 120 | 1 | 1 | pass |
| after restore | 2 | 2 | 0 | 2000 | 192 | 2 | 0 | pass |

Safety checks from the E2E report:

- isolatedDatabase: true
- seedMode: off
- noDeleteOperation: true
- targetDataStillStoredAfterExclude: true
- targetRemovedFromDefaultDashboardAfterExclude: true
- targetSnapshotRemovedFromDefaultDashboardAfterExclude: true
- targetRestoredToDefaultDashboard: true
- targetSnapshotRestoredToDefaultDashboard: true
- consoleErrors: 0
- httpFailures: 0

## Changed Files

- `scripts/content-curation-e2e.mjs`
- `scripts/platform-operations-e2e-smoke.mjs`
- `docs/handoffs/CONTENT-CURATION-E2E-032-worker-handoff.md`

Note: this worktree already contains many unrelated modified and untracked files from prior/current sessions. `scripts/platform-operations-e2e-smoke.mjs` is currently untracked in this worktree, but was part of the accepted platform operations handoff set.

## Verification

- `node --import tsx scripts/content-curation-e2e.mjs`: PASS.
- `npm run test:self-media`: PASS, 90/90.
  - First run exposed a Windows path separator mismatch in `platform-operations-e2e-smoke.mjs`; fixed narrowly and reran successfully.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Known Issues

- The repo worktree is not clean and contains many unrelated modified/untracked files. I did not revert or clean them.
- The E2E uses a sanitized isolated Bilibili creator-center archives fixture, not the dirty/history operating database, to avoid leaking real titles and to avoid mutating real operating data.

## Next Recommendation

Orchestrator should review the new E2E evidence and decide whether to promote `node --import tsx scripts/content-curation-e2e.mjs` into a package script or keep it as task-specific evidence.

## Orchestrator Decision Required

Yes.
