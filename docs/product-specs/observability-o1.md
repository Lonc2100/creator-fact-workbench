# OBS-001: O1 Structured Observability

## Goal

Make imports, failures, review generation, and audit status visible to Codex and the user through durable internal records.

## Implemented Contract

- Every import request returns an `ImportResult` with `run` and `traceId`.
- Successful imports write:
  - internal `contents` records;
  - internal `metrics` records;
  - an `import_runs` record;
  - a `self_media.import` structured log.
- Failed imports write:
  - a failed `import_runs` record;
  - a `self_media.import_failed` structured log;
  - an error message suitable for UI display.
- Dashboard snapshots expose:
  - latest logs;
  - audit records;
  - import run history;
  - weekly/monthly review output generated from internal records.

## UI Contract

The workbench UI must show:

- O1 status in the top status strip;
- import run table;
- latest logs and audit findings;
- failed import messages in the import console.

## Acceptance

- `npm run test:self-media` covers success and failure import observability.
- `npm run verify:harness` must pass.
- Browser smoke must show the dashboard and no console errors.

## Deferred

- O2: Chrome DevTools screenshots and console checks as a reusable script.
- O3: local observability stack with queryable traces.
