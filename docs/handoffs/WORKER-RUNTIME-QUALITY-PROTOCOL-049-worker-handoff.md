# WORKER-RUNTIME-QUALITY-PROTOCOL-049 Worker Handoff

## Task ID

WORKER-RUNTIME-QUALITY-PROTOCOL-049

## Runtime

- Started: 2026-06-05 19:36:49 +08:00
- Finished: 2026-06-05 19:38:04 +08:00
- Elapsed: 1m 15s
- Workload class: normal
- <15min explanation or extra-depth pass: Extra-depth pass completed. Reviewed the changed docs diff, searched all touched docs for runtime/workload/15-minute/heavy-gate keywords, and fixed malformed `<15min explanation or extra-depth pass>` placeholders before final validation.

## Scope

Document the worker runtime and quality protocol for child sessions.

Boundaries kept:

- Did not change business code.
- Did not stage.
- Did not commit.
- Did not delete files.
- Did not run heavy browser/E2E/Next/sqlite/live 3200 gates.

## Context Read

- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- `docs/trellis-parallel-workflow.md`
- `.trellis/spec/guides/self-media-parallel-sessions.md`

## Completed Work

Updated project collaboration docs to require Worker handoffs to record:

- Started
- Finished
- Elapsed
- Workload class
- `<15min explanation or extra-depth pass>`

Added runtime quality rules:

- `micro` tasks may be under 15 minutes for single-file cleanup, read-only existence checks, or explicit narrow fixes.
- `normal` and `long-cycle` tasks under 15 minutes must add an extra-depth pass or explain why continuing would exceed scope.
- The protocol rejects drag-time incentives; quality should improve through task planning, task merging, extra-depth passes, and stronger handoffs.
- Heavy browser/E2E/Next/sqlite/live 3200 gates remain serial by default and must not be launched merely to fill time.

## Changed Files

```text
docs/golden-principles.md
docs/agent-playbook.md
docs/trellis-parallel-workflow.md
.trellis/spec/guides/self-media-parallel-sessions.md
docs/handoffs/WORKER-RUNTIME-QUALITY-PROTOCOL-049-worker-handoff.md
```

## Verification

- `git diff --check`: PASS
- changed docs trailing-whitespace check: PASS

## Known Issues

- This protocol does not update historical handoffs retroactively.
- Future task templates may need a separate pass if the main session wants every template to include the new runtime fields.

## Next Recommendation

Use these fields in new Worker handoffs immediately. For short `normal` or `long-cycle` tasks, require either an extra-depth pass or a concrete scope-boundary explanation.

## Orchestrator Decision Required

No for this docs/protocol update.

Yes if the main session wants to retrofit old handoffs or Trellis task templates.
