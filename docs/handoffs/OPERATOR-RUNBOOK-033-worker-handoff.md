# OPERATOR-RUNBOOK-033 Worker Handoff

## Task

Create a practical daily operator runbook for the self-media workbench. The runbook should be operational, not technical prose.

## Context Read

- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/CONTENT-CURATION-E2E-032-orchestrator-review.md`
- `docs/handoffs/DAILY-GATE-STATUS-UI-032-orchestrator-review.md`
- `docs/handoffs/SMOKE-ISOLATION-REGRESSION-032-orchestrator-review.md`
- `docs/handoffs/README.md`
- `package.json`

## Completed Work

- Added `docs/runbooks/self-media-daily-ops.md`.
- Added the daily sequence:
  - start `npm run dev`;
  - run `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`;
  - check `/dashboard`, `/import`, `/content/`, and `/reviews`;
  - exclude/restore content from `/content/`;
  - rerun trusted dashboard audit after curation changes.
- Added a command safety table:
  - safe/read-only or report-only commands;
  - commands that write isolated smoke DBs;
  - commands that can write the real operating DB;
  - commands not to run in daily operations.
- Added hard daily boundaries:
  - do not run WeChat Official Account / backend commands;
  - do not save Bilibili account-level metrics;
  - do not delete DB files;
  - keep Bilibili content-level archives separate from account trend.
- Added failure handling:
  - audit missing;
  - daily gate fail;
  - port 3200 not reachable;
  - `/content` 404, use `/content/`;
  - exclude/restore numbers not changing.

## Changed Files

- `docs/runbooks/self-media-daily-ops.md`
- `docs/handoffs/OPERATOR-RUNBOOK-033-worker-handoff.md`

No business code was changed.

## Verification

- `git diff --check`: PASS.

## Known Issues

- The repository worktree already contains unrelated modified/untracked files from other sessions. I did not revert or clean them.
- The new runbook is not yet linked from a top-level docs index. I did not add links because the task only required creating/updating `docs/runbooks/self-media-daily-ops.md` and no broken link was found.

## Next Recommendation

Orchestrator should decide whether to link `docs/runbooks/self-media-daily-ops.md` from `docs/handoffs/CURRENT-PLATFORM-STATUS.md` or a docs index after review.

## Orchestrator Decision Required

Yes.
