# TRELLIS-PARALLEL-LONG-CYCLE-SPEC-048 Worker Handoff

Date: 2026-06-05
Mode: docs-only. No business-code edits, no deletion, no staging, no commit.

## Task ID

TRELLIS-PARALLEL-LONG-CYCLE-SPEC-048

## Context Read

- `docs/handoffs/GOLDEN-PRINCIPLE-PARALLEL-LONG-CYCLE-048-worker-handoff.md`
- `docs/trellis-parallel-workflow.md`
- `.trellis/spec/guides/self-media-parallel-sessions.md`

## Completed Work

Synchronized the parallel long-cycle principle into the Trellis injected guide:

- Parallel Workers should prefer bounded long-cycle tasks that can complete a full context/read/work-or-audit/verify/diagnose/evidence/handoff/next-action loop with minimal user interruption.
- Long tasks are acceptable only when they remain narrow, non-overlapping, and have clear allowed files and validation commands.
- Safe parallel task examples now include docs/status audits, bundle verification, screenshot regressions, product review, and narrow UI polish.

Added explicit heavy gate serial discipline:

- Browser, E2E, Next, sqlite, and live 3200 daily gates run serially by default.
- Parallel heavy gates are allowed only when the Orchestrator explicitly assigns isolated ports, isolated sqlite DB paths, and isolated `NEXT_DIST_DIR` values.
- When one Worker is running a heavy gate, other Workers should do docs-only review, static audits, or wait for scheduling.

Updated Worker finish expectations:

- Handoffs should include failure diagnosis and evidence paths when validation fails or times out.

## Changed Files

- `.trellis/spec/guides/self-media-parallel-sessions.md`
- `docs/handoffs/TRELLIS-PARALLEL-LONG-CYCLE-SPEC-048-worker-handoff.md`

## Verification

- `git diff --check`: PASS.
- Trailing whitespace check on changed docs: PASS.

## Known Issues / Residual Risk

- `.trellis/spec/guides/self-media-parallel-sessions.md` is currently untracked in this worktree, so `git diff --check` does not fully cover it as a tracked diff. The explicit trailing-whitespace check covers this changed untracked file.
- This task updates Trellis policy only; it does not start, stop, or inspect any running Worker sessions.
- No business code, tests, local data, staging, commit, or deletion was performed.

## Orchestrator Decision Required

No for accepting this docs-only policy synchronization.

Yes for any later decision to track, ignore, or restructure `.trellis/**` as a project workflow asset.
