# MAINLINE-ENTROPY-GOVERNANCE-137 worker handoff

## Task

- Task ID: `MAINLINE-ENTROPY-GOVERNANCE-137`
- Goal: run a non-destructive entropy governance pass for duplicate code, stale docs, unused entrypoint candidates, and test pollution risk.
- Started: 2026-06-14T01:24:00+08:00
- Finished: 2026-06-14T01:32:34+08:00
- Elapsed: about 9 minutes initial pass plus extra-depth scan/test/diff pass.
- Workload class: normal
- `<15min explanation or extra-depth pass>`: completed extra-depth pass by re-reading prior entropy/archive handoffs, extending scanner coverage, adding targeted tests, rerunning the scanner, and checking staged scope. Continuing into deletion, DB cleanup, or physical archive movement would violate this PRD.

## Context read

- `AGENTS.md`
- `docs/night-ops/state.json`
- `docs/night-ops/state-machine.md`
- `.trellis/tasks/night-137-entropy-governance/prd.md`
- `.trellis/tasks/night-137-entropy-governance/task.json`
- `.trellis/tasks/night-137-entropy-governance/implement.jsonl`
- `.trellis/tasks/night-137-entropy-governance/check.jsonl`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/README.md`
- `docs/trellis-parallel-workflow.md`
- `docs/quality-execution-system.md`
- `docs/golden-principles.md`
- `docs/entropy-governance.md`
- `docs/cleanup-manifest.md`
- `docs/context/index.md`
- `docs/context/current-state.md`
- `docs/context/engineering-principles.md`
- `docs/context/decisions.md`
- `docs/context/llms.txt`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/night-ops/tasks/137-entropy-governance.md`
- `docs/handoffs/ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md`
- `docs/handoffs/archive-index.md`
- `docs/product-specs/archive-index.md`

External reference check, per AGENTS "stand on giants" rule:

- `jscpd` on GitHub: mature direction for duplicate code scanning.
- `knip` official docs/GitHub: mature direction for TypeScript/JavaScript unused files, exports, and dependency graph analysis.
- `depcheck` on GitHub: narrower unused dependency baseline.
- Decision for this task: do not add dependencies or modify package/lockfile in NightOps; fold the mature-tool categories into the existing read-only local scanner.

## Completed work

- Extended `scripts/entropy-governance-scan.mjs` while keeping it read-only:
  - adds `dirtyBaseline` by comparing current git status with `docs/night-ops/state.json` `baselineDirtyPaths`;
  - adds `staleDocs` drift candidates for current status/task-board mismatch against the active NightOps task;
  - adds `entrypoints` candidates for package-unreferenced scripts and paused/diagnostic app entries;
  - adds `codeDuplicates` heuristic windows across `src/`, `scripts/`, and `tests/`;
  - keeps `.local/browser-profiles/**`, `chrome-profile/**`, cookies/tokens/credentials/raw capture, and `.local/self-media.sqlite` in sensitive/local-only classification.
- Updated `docs/entropy-governance.md` with the 137 scan fields and no-action semantics.
- Added targeted tests in `tests/entropy-cleanup.test.mjs` for scanner safety, category presence, and no destructive cleanup operations.
- Regenerated local scan report under `.local/entropy-governance-scan/`; report remains ignored and was not staged.

## Scan result summary

Latest pre-handoff scan command:

```bash
npm run scan:entropy
```

Result:

- Command status: PASS.
- Report paths: `.local/entropy-governance-scan/report.json`, `.local/entropy-governance-scan/report.md`.
- Git modified count: 8.
- Git untracked count: 4.
- Dirty baseline: `has_unexpected_dirty`; matched known baseline `9`; unexpected dirty `3` from this task.
- Status/doc drift candidates: `3`.
- `docs/handoffs` files: `396`; untracked: `3`.
- `docs/product-specs` files: `47`; unindexed: `28`.
- `.local` files: `6493`; size: `946.64 MiB`; sqlite/db count: `19`; over limit: `true`.
- Scripts: `47` files; untracked `1`; not referenced by package scripts `17`; duplicate groups `3`.
- Entrypoint candidates: `17`; app entrypoints scanned: `33`.
- Source duplicate blocks sampled: `40`; files scanned: `145`.
- Operating DB suspect acceptance/demo/test records: `2`.

Key findings:

- Known unrelated dirty baseline exactly matches `state.json` for 9 paths:
  - `docs/generated/template-doctor-report.md`
  - `scripts/smoke-self-media.mjs`
  - `src/domain/self-media/ui/screens/LeadsPage.tsx`
  - `src/domain/self-media/ui/screens/UiLabPage.tsx`
  - `tests/agent-trajectory.test.mjs`
  - `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
  - `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`
  - `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
  - `scripts/check-browser-automation.mjs`
- Status drift candidates:
  - `CURRENT-PLATFORM-STATUS.md` still names active task `MAINLINE-AI-CONTENT-ASSISTANT-134`.
  - `CURRENT-PLATFORM-STATUS.md` still names worker thread `019ec1c0-ffb8-76c1-8bbf-df8c73506d8b`.
  - `docs/task-board.md` does not yet list `MAINLINE-ENTROPY-GOVERNANCE-137`.
- Duplicate source candidates cluster around repeated local port probing in smoke/E2E scripts and repeated local API `isLocalRequest` guards.
- Package-unreferenced entrypoint candidates include older smoke/E2E, discovery, dispatch-readiness, and quarantine scripts; these are review candidates, not deletion candidates.
- `.local/browser-profiles` is now sensitive/local-only and no longer appears in delete-confirmation candidates.

## Changed files

Task-owned files:

- `docs/entropy-governance.md`
- `scripts/entropy-governance-scan.mjs`
- `tests/entropy-cleanup.test.mjs`
- `docs/handoffs/MAINLINE-ENTROPY-GOVERNANCE-137-worker-handoff.md`

Local generated reports, not for git staging:

- `.local/entropy-governance-scan/report.json`
- `.local/entropy-governance-scan/report.md`

Unrelated dirty baseline deliberately not staged:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
- `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

## Verification

Completed before writing this handoff:

- `npm run scan:entropy`: PASS.
- `npm run test:entropy`: PASS.

Final gates after this handoff was written:

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run scan:entropy`: PASS.
  - Final report counted modified `8`, untracked `5`, matched known baseline `9`, unexpected dirty `4` from task-owned files, status drift `3`, entrypoint candidates `17`, source duplicate blocks `40`, DB suspect records `2`.
- `npm run test:entropy`: PASS, 4/4 tests.

## Safety notes

- No files or directories were deleted.
- No `Remove-Item`, `git clean`, reset, checkout, or destructive cleanup command was run.
- No sqlite rows were inserted, updated, deleted, migrated, or vacuumed.
- No real platform save, login, QR, captcha, WeChat reopen, Bilibili durable account metrics, or heavy browser/E2E gate was attempted.
- `.local/**` reports were regenerated locally and are ignored by git.

## Recommended next actions

1. Orchestrator may accept the scanner/test/doc bundle after final gates pass.
2. Handle `CURRENT-PLATFORM-STATUS.md` and `docs/task-board.md` drift in a status closure task; do not bulk-add historical handoffs to current status.
3. Review duplicate `findPort`/local-server helpers and repeated `isLocalRequest` guards in a future slim refactor task.
4. Review package-unreferenced scripts by exact path list before any archive move or deletion.
5. Treat the 2 operating DB suspect samples as investigation leads only; any DB cleanup requires backup, exact plan, and user approval.

## Orchestrator decision required

No for this non-destructive scan bundle after verification. Yes before any follow-up deletion, DB cleanup, archive movement, package dependency addition, or status-scope widening.
