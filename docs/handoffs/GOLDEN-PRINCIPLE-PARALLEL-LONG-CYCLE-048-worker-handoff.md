# GOLDEN-PRINCIPLE-PARALLEL-LONG-CYCLE-048 worker handoff

Date: 2026-06-05
Mode: docs-only. No business code changes, no deletion, no staging, no commit.

## Context read

- `AGENTS.md`
- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- `docs/trellis-parallel-workflow.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`

## Completed work

Added a new golden principle for parallel long-cycle work:

- Parallel sessions should prefer bounded long-loop tasks that can read context, execute, validate, diagnose, preserve evidence, write handoff, and recommend next actions with minimal user interruption.
- Suitable work includes docs/status audits, bundle verification, screenshot regressions, product review, narrow UI polish, and single-platform research when scope is clear.
- Heavy browser/E2E/Next/sqlite gates must remain serial unless isolated ports, isolated DBs, and isolated `NEXT_DIST_DIR` are explicitly assigned.

Synchronized the same rule into:

- `docs/agent-playbook.md`
- `docs/trellis-parallel-workflow.md`

## Changed files

- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- `docs/trellis-parallel-workflow.md`
- `docs/handoffs/GOLDEN-PRINCIPLE-PARALLEL-LONG-CYCLE-048-worker-handoff.md`

## Verification

- `git diff --check`: PASS.
- Trailing whitespace check on changed docs: PASS.

Note:
- `docs/trellis-parallel-workflow.md` and this handoff are currently untracked, so the explicit trailing-whitespace check covered them in addition to tracked diffs.

## Known issues / residual risk

- This task updates governance docs only; it does not update `.trellis/spec/guides/self-media-parallel-sessions.md`.
- If Trellis spec files become the primary injected rule source, a separate policy task should decide whether to track and update that guide.

## Next recommendation

Use this rule when assigning future parallel Workers: give each Worker a narrow scope and enough time to finish the full read/execute/verify/diagnose/evidence/handoff loop, while keeping browser/E2E/database gates serial unless explicitly isolated.

## Orchestrator decision required

No for this docs-only governance update.

Yes if the main session wants to update or track `.trellis/spec/**` as part of the formal injected worker rule set.
