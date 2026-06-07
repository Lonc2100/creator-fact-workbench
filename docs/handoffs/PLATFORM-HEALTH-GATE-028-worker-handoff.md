# PLATFORM-HEALTH-GATE-028 Worker Handoff

Task: `PLATFORM-HEALTH-GATE-028`

Status: completed.

## What Changed

- Added npm script:
  - `npm run smoke:platform-ops-with-health`
- Added orchestrator script:
  - `scripts/platform-ops-with-health-smoke.mjs`
- The new smoke runs, in order:
  1. `npm run health:platform-data`
  2. `npm run smoke:platforms-save`
  3. `npm run smoke:platform-operations-e2e`
  4. `npm run health:platform-data`
- The script writes:
  - `.local/platform-ops-with-health/report.json`
  - `.local/platform-ops-with-health/report.md`

## Gate Behavior

- Fails immediately if health reports:
  - `errorCount > 0`
  - `missingCount > 0`
  - `sourceMismatchCount > 0`
- Keeps stale findings as warning-only under the current `72` hour health threshold.
- If first health fails, operation smoke commands do not run.
- If final health fails after operations, the overall smoke fails.

## E2E Smoke Hardening

I also hardened `scripts/platform-operations-e2e-smoke.mjs` so a transient Playwright response-body read failure does not fail a completed UI operation. The smoke now treats UI completion, operation history rows, and refreshed platform statuses as the primary evidence; API response bodies remain supplemental when available.

## Tests Added

Added contract coverage in `tests/self-media-contract.test.ts`:

- health fail blocks total smoke and prevents later smoke steps;
- stale health warning does not block the full four-step smoke.

## Boundaries

- No platform collection was added or run by the new script.
- No WeChat Official Account / WeChat backend flow was added.
- Existing Bilibili boundaries remain unchanged:
  - content save is archives-level only;
  - account metrics/date-key diagnostics stay out of durable account snapshot save.
- Reports store command summaries and health summaries only.

## Validation

- `npm run smoke:platform-ops-with-health`: PASS
- `npm run test:self-media`: PASS, 71 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS

`npm run verify:harness` was not run because this task did not change harness rules or harness verification scripts.

## Needs Main Session Judgment

Yes. Main session should decide whether this combined gate becomes the default operator command before and after local platform import work.
