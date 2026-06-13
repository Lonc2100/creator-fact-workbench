# NightOps Orchestrator

NightOps is the local overnight operating loop for this self-media project. It combines durable Harness-style state files with local Trellis task packages.

## Operating Model

- Durable project evidence lives in `docs/night-ops/`.
- Local Trellis execution packages live in `.trellis/tasks/night-*` and remain gitignored local workflow assets.
- The Orchestrator advances one task at a time through:
  `preflight -> select_task -> dispatch_worker -> monitor -> accept_or_repair -> commit_push -> next_task -> closure`.
- A Codex heartbeat wakes this main thread and reads `docs/night-ops/state.json` before doing anything.

## Automatic Allowed Work

- Code and docs changes inside a task's allowed scope.
- Tests, typecheck, isolated Next builds, and strict 3200 health checks.
- Commits and pushes for completed task bundles.
- No-intervention import status checks that do not open platform windows or save real data.

## Stop Gates

Stop and wait for the user before:

- login, QR code, captcha, or platform risk-control;
- saving real platform data after a preview;
- deleting files or folders;
- handling password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM;
- force push or branch reset;
- reopening WeChat/Official Account;
- promoting Bilibili account metrics into durable totals;
- running heavy browser/Next/sqlite gates in parallel without isolation.

## Current Queue

The active wave is intentionally biased toward daily usability rather than visual redesign:

1. `134` AI content assistant for `/content`.
2. `135` calendar and local DB governance against test/acceptance pollution.
3. `136` nonintrusive import refresh.
4. `137` entropy/code-governance pass.
5. `138` usable overnight closure and push.

Use `node scripts/night-ops-orchestrator.mjs status` for the current state.
