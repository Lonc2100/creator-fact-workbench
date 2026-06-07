# OPERATING-E2E-ACTION-TO-CONTENT-038 Orchestrator Review

## Decision

Accepted.

## What Was Accepted

- Added `npm run smoke:operating-action-to-content` as a browser-level proof for the operating workflow:
  - post-import suggestion -> internal action item;
  - action item -> content/platform-version/queue draft;
  - repeated conversion is idempotent;
  - untrusted and user-excluded evidence is blocked;
  - generated draft is visible in content/calendar workflow;
  - trusted dashboard/review totals remain unchanged.
- The smoke uses an isolated sqlite DB and temporary Next dev server.
- It does not run platform login, platform collection, daily ops, WeChat, real publish, or Bilibili account metric save.

## Main Session Verification

- `npm run smoke:operating-action-to-content`: PASS
- `npm run test:self-media`: PASS, 115/115
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS

## Main Session Notes

- The smoke report is `.local/operating-e2e-action-to-content-038/report.json`.
- The screenshot is `.local/operating-e2e-action-to-content-038.png`.
- The temporary E2E server is cleaned up by the script after the run.

## Boundaries

- Accepted as a regression gate for the action-to-content operating path.
- Do not run it in parallel with `ops:daily-self-media` or other browser/E2E gates.
