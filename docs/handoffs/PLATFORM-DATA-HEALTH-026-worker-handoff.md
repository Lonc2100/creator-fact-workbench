# PLATFORM-DATA-HEALTH-026 Worker Handoff

Task: `PLATFORM-DATA-HEALTH-026`

Status: completed for worker scope.

## What Changed

- Added `scripts/platform-data-health.mjs`.
  - Checks four platform raw capture directories by existence, JSON capture count, and latest modified time.
  - Checks each platform mapping preview and save smoke report using whitelisted summary fields only.
  - Validates expected import sources for Douyin, Xiaohongshu, Video Account, and Bilibili.
  - Adds Bilibili account diagnostics for account preview, stability report, `candidateCount`, and the `previewOnly=true` / `saved=false` boundary.
  - Writes `.local/platform-data-health/report.json` and `.local/platform-data-health/report.md`.
- Added `npm run health:platform-data` in `package.json`.
- Added self-media contract tests for:
  - missing raw capture directory reporting;
  - stale mapping preview/save smoke reports;
  - Bilibili account metrics preview-only boundary.

## Boundaries Preserved

- Did not run collection/discovery.
- Did not run save/import smoke beyond the requested health check command.
- Did not read or emit raw payload bodies; raw directories are counted through file metadata only.
- Did not modify dashboard UI.
- Did not modify backend models, repo, service, runtime, providers, or API routes.

## Generated Reports

- `.local/platform-data-health/report.json`
- `.local/platform-data-health/report.md`

Current report summary:

| Field | Result |
| --- | --- |
| status | `ok` |
| platformCount | `4` |
| okCount | `14` |
| warnCount | `0` |
| errorCount | `0` |
| missingCount | `0` |
| staleCount | `0` |
| sourceMismatchCount | `0` |
| bilibiliPreviewOnlyOk | `true` |

## Validation

Completed:

```bash
npm run health:platform-data
npm run test:self-media
npm run typecheck
git diff --check
```

Results:

- `npm run health:platform-data`: passed; wrote both health reports; status `ok`.
- `npm run test:self-media`: passed, 66/66 tests.
- `npm run typecheck`: passed.
- `git diff --check`: passed.

Not run:

- `npm run verify:harness` was not run because this task did not change harness-related files or contracts.

## Notes For Main Session

- The health threshold is `72` hours. Current artifacts are fresh under that threshold.
- Bilibili account metrics remain diagnostics-only: `candidateCount=1`, `previewOnly=true`, `saved=false`.
- The script is intentionally a local evidence/readiness check only; it does not collect, save, or mutate durable application data.

## Needs Main Session Judgment

Yes. Main session should decide whether `72` hours is the desired long-term freshness threshold for platform data health.
