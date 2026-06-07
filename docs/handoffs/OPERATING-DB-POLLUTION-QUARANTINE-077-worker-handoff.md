# OPERATING-DB-POLLUTION-QUARANTINE-077 Worker Handoff

## Summary

- Backed up the real operating DB before any write:
  - `.local/db-backups/self-media-before-quarantine-077.sqlite`
- Did not delete `.local/self-media.sqlite`.
- Did not delete any DB rows.
- Did not store cookies, tokens, headers, raw payloads, or raw capture material.
- Quarantined suspect acceptance/demo/test records by updating JSON metadata only:
  - `dataDomain`
  - `dataDomainUpdatedAt`
  - `dataDomainReason`
  - `acceptanceRunId` where applicable
  - `quarantineTaskId`
  - `quarantineReason`
  - `quarantinedAt`

## Context Read

- `AGENTS.md`
- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/quality-execution-system.md`
- `docs/golden-principles.md`
- `docs/handoffs/MAINLINE-PROD-ACCEPTANCE-DATA-ISOLATION-072-worker-handoff.md`
- `docs/handoffs/ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md`
- `.local/entropy-governance-scan/report.json`

## Migration Result

The first dry run found 713 records needing a 077 quarantine label. Subsequent passes expanded the explicit O2/saved-review/audit recognition and converged to:

- `entities` tagged by 077: 959
- `import_runs` tagged by 077: 76
- final 077 dry run: 0 new candidates, 959 already tagged
- final entropy scan operating DB suspect count: 0

Final tagged entity distribution:

- `audits/system_log`: 1
- `contents/acceptance_run`: 144
- `contents/demo_seed`: 41
- `ideas/acceptance_run`: 39
- `ideas/demo_seed`: 41
- `leads/system_log`: 39
- `metricSnapshots/demo_seed`: 123
- `metrics/demo_seed`: 125
- `operationHistory/system_log`: 24
- `platformVersions/acceptance_run`: 207
- `platformVersions/demo_seed`: 37
- `savedReviews/system_log`: 62

Tagged import runs:

- `acceptance_run`: 41
- `demo_seed`: 35

## Code Changes

- Added `scripts/operating-db-quarantine-077.mjs`
  - dry-run by default;
  - `--apply` creates the required backup if absent;
  - applies metadata updates in an explicit SQLite transaction;
  - writes local migration reports under `.local/operating-db-quarantine-077/`.
- Updated `scripts/entropy-governance-scan.mjs`
  - already quarantined records are no longer counted as unresolved operating DB pollution.
- Updated `src/domain/self-media/service/self-media-service.ts`
  - dashboard default `calendarItems`, publish handoff workbench, ideas, leads, action items, reviews, audits, and curation no longer surface 077-quarantined records;
  - non-quarantined `system_log` operational records remain available, preserving existing action-to-content workflow behavior;
  - seeded audit records are now stable `system_log` so O2/O3 wording does not reappear as unresolved pollution.
- Updated `src/domain/self-media/types/self-media-types.ts`
  - `AuditRecord` supports optional system-log data-domain metadata.
- Updated `src/domain/self-media/ui/screens/ContentPage.tsx`
  - first-screen content task counts use default operating rows instead of all historical local versions.

## Browser Acceptance

Fixed entry and production server:

- `http://localhost:3200/dashboard`

Real browser checks opened:

- `/dashboard`
- `/calendar`
- `/content`

Default visible DOM check excluded closed diagnostic `<details>` content and searched for old pollution markers:

- `072验收测试`
- `O2选题`
- `MAINLINE`
- `小雏菊`
- `AI选题计划`
- `AI短片复盘`
- `想拍一条短视频`

Result:

- `/dashboard`: no visible hits
- `/calendar`: no visible hits
- `/content`: no visible hits

API spot check after rebuild:

- dashboard contents: 12
- dashboard calendar items: 17
- dashboard publish handoff packages: 4
- dashboard publish execution items: 4
- dashboard pollution marker hits: 0
- content workbench publish package marker hits: 0

## Validation

- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS, 134/134
- `npm run test:ui-harness`: PASS, 15/15
- `npm run build`: PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS
- `npm run scan:entropy`: PASS
  - operating DB pollution status: `ok`
  - suspectRecordCount: 0
- `git diff --check`: PASS

Note: one combined validation run briefly failed with temp-dir/parallel cleanup symptoms and stale intermediate assertions; rerunning `npm run test:self-media` alone after the fix passed 134/134. Final recorded validation above is the accepted result.

## Not Staged / Not Committed

- `.local/self-media.sqlite`
- `.local/db-backups/self-media-before-quarantine-077.sqlite`
- `.local/operating-db-quarantine-077/report.json`
- `.local/operating-db-quarantine-077/report.md`
- `.local/entropy-governance-scan/report.json`
- `.local/entropy-governance-scan/report.md`
- `.local/local-server-health/report.json`
- `.local/local-server-health/report.md`

## Residual Notes

- `.local` is still over the entropy size limit; this task intentionally did not delete files.
- Existing unrelated dirty/untracked files remain untouched.
- The production server on port 3200 was restarted for validation against the latest build.
