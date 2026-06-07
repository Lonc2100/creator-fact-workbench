# RESIDUAL-HANDOFF-GOVERNANCE-COMMIT-082 worker handoff

## Task

- Task ID: `RESIDUAL-HANDOFF-GOVERNANCE-COMMIT-082`
- Goal: review current untracked 080/081 handoffs and necessary governance docs, then commit only project-history handoff/governance files.

## Included In This Governance Commit

Handoff/history files:

- `docs/handoffs/REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080-worker-handoff.md`
- `docs/handoffs/SAFE-LEGACY-SCRIPTS-CLEANUP-080-worker-handoff.md`
- `docs/handoffs/LOCAL-EVIDENCE-EXACT-DELETE-LIST-081-worker-handoff.md`
- `docs/handoffs/RESIDUAL-HANDOFF-GOVERNANCE-COMMIT-082-worker-handoff.md`

Governance/process docs:

- `AGENTS.md`
- `docs/agent-playbook.md`
- `docs/cleanup-manifest.md`
- `docs/context/current-state.md`
- `docs/golden-principles.md`
- `docs/handoffs/README.md`
- `docs/trellis-parallel-workflow.md`

## Explicitly Excluded

Not staged and not committed in this bundle:

- business code under `src/`;
- tests under `tests/`;
- `package.json`;
- all `scripts/`;
- `.local/`;
- generated timestamp-only evidence: `docs/generated/template-doctor-report.md`.

## Rationale

`REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080` classified the governance/process bundle and cleanup/context bundle as suitable to submit separately from product, package, scripts, and diagnostic bundles. This commit follows that split.

The 080 cleanup handoff is preserved as safety evidence. It was updated only to clarify that it records the cleanup turn's blocked state and that the later 080 attribution handoff should control future script action lists.

The 081 handoff is an exact delete-list planning artifact only. It does not authorize automatic deletion; later cleanup still needs explicit user confirmation and one exact `Remove-Item -LiteralPath ...` per file.

## Verification

- `git diff --check`: PASS.
- Staged file scope check: only docs/governance/handoff files staged.
- Markdown link existence check: PASS, 0 local Markdown links found in staged files.

## Residual Worktree Risk

The worktree still contains modified product/tooling files and untracked scripts. They are intentionally left unstaged for later bundle decisions:

- package/script exposure policy;
- collector companion scripts;
- diagnostic smoke scripts;
- paused WeChat scripts;
- product UI/provider changes;
- generated timestamp-only evidence.
