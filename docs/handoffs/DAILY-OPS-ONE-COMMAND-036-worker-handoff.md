# DAILY-OPS-ONE-COMMAND-036 Worker Handoff

## Task

Create a truly daily-use one-command self-media operating loop without automatic real-platform collection.

## Files Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/REAL-CAPTURE-REFRESH-034-orchestrator-review.md`
- `docs/handoffs/TRUSTED-WEEKLY-REPORT-034-orchestrator-review.md`
- `docs/handoffs/ACTION-SUGGESTION-TO-TASKS-034-orchestrator-review.md`
- `docs/handoffs/ACTION-TASKS-OPERATING-035-orchestrator-review.md`
- `docs/handoffs/REAL-CAPTURE-ASSISTED-REFRESH-035-orchestrator-review.md`
- `docs/handoffs/TRUSTED-WEEKLY-REPORT-EXPORT-035-orchestrator-review.md`
- Supporting core docs:
  - `docs/context/index.md`
  - `ARCHITECTURE.md`
  - `docs/mainline-framework.md`
  - `docs/task-board.md`

## Changed Files

- `package.json`
  - Added `npm run ops:daily-self-media`.
- `scripts/daily-self-media-ops.mjs`
  - New serial daily ops runner.
  - Runs, in order:
    1. `npm run health:platform-data`
    2. `npm run check:real-capture-freshness`
    3. `npm run report:trusted-weekly:safe`
    4. `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard --out-dir=.local/daily-self-media-ops/trusted-dashboard-audit`
    5. `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`
  - Writes `.local/daily-self-media-ops/report.json` and `report.md`.
  - Reads child report summaries only.
  - Does not store child command stdout/stderr.
  - Includes sections for real capture freshness, platform health, safe weekly report, trusted audit, and daily gate.
  - Includes `blockingReasons`, `warnings`, and `nextActions`.
  - Marks safety/scope fields for serial execution, no collection, no platform login, no DB deletion, WeChat paused, Bilibili account metrics not saved, and redacted weekly output only.
- `tests/self-media-contract.test.ts`
  - Added loader/type for daily self-media ops script.
  - Added serial execution/redacted-only safety test.
  - Added failure test for blocking reasons and next actions.

## Output Reports

- `.local/daily-self-media-ops/report.json`
- `.local/daily-self-media-ops/report.md`
- Trusted audit subreport:
  - `.local/daily-self-media-ops/trusted-dashboard-audit/report.json`
  - `.local/daily-self-media-ops/trusted-dashboard-audit/report.md`
- Safe weekly artifact referenced by the report:
  - `.local/trusted-weekly-report/redacted-summary.json`
  - `.local/trusted-weekly-report/redacted-summary.md`

## Safety Boundaries

- No automatic real platform collection.
- No platform browser/login opening.
- No WeChat/公众号 restoration.
- No Bilibili account-level metric save.
- No DB deletion.
- Child commands are awaited one by one; no parallel sqlite report runs.
- Total report excludes child stdout/stderr and rejects sensitive text patterns.
- Weekly report path is redacted-only; full local weekly report is not used by this daily command.

## Verification

- `npm run ops:daily-self-media`
  - First run: FAIL because the nested `smoke:platform-operations-e2e` timed out waiting for a `/import` operation response.
  - Immediate standalone `npm run smoke:platform-operations-e2e`: PASS.
  - Rerun `npm run ops:daily-self-media`: PASS.
  - Final report status: `pass`; health `ok`; real capture freshness `pass`; safe weekly report `pass`; trusted audit `pass`; daily gate `pass`.
- `npm run test:self-media`: PASS, 100/100.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Notes

- The first ops run exposed a transient existing E2E wait timeout, but the nested smoke passed on immediate standalone rerun and the final one-command run passed.
- This task did not change the E2E smoke script because the failure did not reproduce and the accepted gate passed in the final verification.
- `npm run ops:daily-self-media` currently assumes the local dashboard API is available at `http://127.0.0.1:3200/api/self-media/dashboard`, matching the existing daily operating baseline.

## Needs Main Session Judgment

Yes.
