# NightOps Heartbeat Prompt

Continue the self-media NightOps mainline from:

```text
D:\codex work\自媒体创作\Data Collection and Background Analysis
```

Read first:

- `AGENTS.md`
- `docs/night-ops/state.json`
- `docs/night-ops/state-machine.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/trellis-parallel-workflow.md`

Then:

1. Run `node scripts/night-ops-orchestrator.mjs status`.
2. If state is `blocked`, report the blocker and stop.
3. If there is no active task, run `node scripts/night-ops-orchestrator.mjs advance` and use the generated prompt to dispatch or execute the selected task.
4. If there is an active task, inspect its handoff path and git status:
   - if complete, run verification, commit/push scoped changes, then run `node scripts/night-ops-orchestrator.mjs complete <taskId> <commit>`;
   - if still running, do not duplicate dispatch;
   - if failed, repair within the same task scope or block with a clear reason.
5. Continue one task at a time toward closure.

Stop immediately for login/QR/captcha/risk-control, real platform save confirmation, file deletion, sensitive material, force push/reset, WeChat reopening, Bilibili account durable totals, or heavy gate conflicts.
