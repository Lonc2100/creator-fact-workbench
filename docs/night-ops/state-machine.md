# NightOps State Machine

## States

| State | Meaning | Allowed automatic action |
| --- | --- | --- |
| `preflight` | Check repo, active docs, dirty baseline, 3200 availability, and user gates. | Read files, run light checks, record state. |
| `select_task` | Pick the next pending task from `state.json`. | Mark one task active if no blocker exists. |
| `dispatch_worker` | Create or steer one bounded Worker, or run inline if no thread tools are available. | Dispatch only from task PRD and allowed files. |
| `monitor` | Wait for task handoff or commit evidence. | Read handoff, check git status, avoid duplicate dispatch. |
| `accept_or_repair` | Verify Worker output and either accept, repair narrowly, or block. | Run validation gates and record results. |
| `commit_push` | Commit/push the accepted bundle. | Commit only scoped files, never `git add .`. |
| `next_task` | Move completed task to done and choose next. | Advance state and continue if safe. |
| `closure` | Run final acceptance and write closure handoff. | Final gates, status docs, push, stop heartbeat. |
| `blocked` | A stop gate was hit. | Record blocker and wait for user. |

## Invariants

- The current task is the only implementation scope.
- Heavy gates are serial: browser/E2E, Next build, sqlite writes, daily gate, and fixed 3200 live checks.
- `state.json` is the source of truth for active task, blockers, and completed task list.
- `.trellis/tasks/night-*` PRDs define the local task envelope; Worker handoffs define evidence.
- User gates override all automation.

## Heartbeat Behavior

Each heartbeat should:

1. Read `AGENTS.md`, `docs/night-ops/state.json`, and the active task PRD.
2. Check whether a Worker is active, completed, blocked, or missing.
3. If no Worker is active and no blocker exists, dispatch or run the next task.
4. If a Worker completed, verify and commit/push if safe.
5. If login, deletion, real-data save, sensitive material, or PRD scope change is needed, move to `blocked`.
