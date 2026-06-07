# PLATFORM-RUNBOOK-019 Worker Handoff

## Task ID

PLATFORM-RUNBOOK-019

## Completed Work

- Added `docs/handoffs/PLATFORM-RUNBOOK-019.md`.
- Consolidated the accepted Douyin, Xiaohongshu, and Video Account logged-in capture/import/save-smoke loops into one executable local runbook.
- Documented required PowerShell project-root cwd and the `C:\Program Files\PowerShell\7` / `npm ENOENT` failure mode.
- Documented why the login browser uses an isolated `.local/<platform>-personal-v0/chrome-profile` profile instead of the user's daily browser.
- Documented login-state persistence/expiry, Docker restart impact boundaries, field validation, and failure recovery.
- Explicitly marked WeChat Official Account / WeChat backend work as paused unless the user reopens it.

## Changed Files

- `docs/handoffs/PLATFORM-RUNBOOK-019.md`
- `docs/handoffs/PLATFORM-RUNBOOK-019-worker-handoff.md`

No business code was changed.

## Source Context Read

- `AGENTS.md`
- `docs/context/index.md`
- `docs/context/current-state.md`
- `docs/context/engineering-principles.md`
- `docs/context/decisions.md`
- `docs/context/llms.txt`
- `ARCHITECTURE.md`
- `docs/architecture/current-stage.md`
- `docs/spec-governance.md`
- `docs/agent-playbook.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/handoffs/PLATFORM-PRIORITY-019-orchestrator-decision.md`
- `docs/handoffs/BROWSER-COLLECTOR-V0-orchestrator-plan.md`
- `docs/handoffs/DOUYIN-PERSONAL-V0-REAL-CAPTURE-orchestrator-review.md`
- `docs/handoffs/PLATFORM-V0-REAL-CAPTURE-016-orchestrator-review.md`
- V1 mapper/save-smoke handoffs for Douyin, Xiaohongshu, and Video Account
- `package.json`
- platform discover/import scripts

## Verification

- `git diff --check`: PASS

## Known Issues

- The worktree already had many unrelated modified/untracked files before this task. I did not revert, normalize, delete, or clean them.
- `docs/handoffs/PLATFORM-RUNBOOK-019.md` is a new runbook; it does not add task-board links or README links because the user asked not to change unrelated project files unless links were required.
- No live platform discover/import/smoke command was run in this task; the requested validation gate was `git diff --check`.

## Next Recommendation

- Use `docs/handoffs/PLATFORM-RUNBOOK-019.md` as the operator checklist before asking future workers to run platform capture/import.
- If the user later wants UI/API trigger surfaces for these imports, create a separate task that changes Runtime/UI intentionally.

## Orchestrator Decision Required

No.
