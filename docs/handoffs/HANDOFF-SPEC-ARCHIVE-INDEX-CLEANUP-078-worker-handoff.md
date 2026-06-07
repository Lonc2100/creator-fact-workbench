# HANDOFF-SPEC-ARCHIVE-INDEX-CLEANUP-078 worker handoff

## Task

- Task ID: `HANDOFF-SPEC-ARCHIVE-INDEX-CLEANUP-078`
- Goal: organize historical handoff/spec noise into auditable archive indexes without deleting documents.
- Started: 2026-06-07T11:24:00+08:00
- Finished: 2026-06-07T11:55:00+08:00
- Workload class: normal
- Scope: documentation/index cleanup only.

## Context Read

- `AGENTS.md`
- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/quality-execution-system.md`
- `docs/golden-principles.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/product-specs/index.md`
- `docs/handoffs/ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md`
- `.local/entropy-governance-scan/report.json`

## Completed Work

- Created `docs/handoffs/archive-index.md`.
- Created `docs/product-specs/archive-index.md`.
- Updated `docs/handoffs/README.md` with archive index rules.
- Chose index-only cleanup: no handoff/spec files were moved, deleted, or renamed.
- Added indexed historical handoff/spec Markdown files to git so the archive indexes remain link-resolvable after push.
- Normalized final blank lines in 64 newly tracked historical Markdown files so `git diff --check` passes.
- Kept current mainline handoffs 070-075, `CURRENT-PLATFORM-STATUS.md`, and `README.md` in the active/current protected class.

## Archive Policy

| Class | Meaning | Handling |
| --- | --- | --- |
| Active/current | Current status entrypoints and live operating handoffs. | Keep in root handoff/spec index and read first only when current status says so. |
| Release handoff | Accepted release or mainline closure evidence. | Keep linkable in place for traceability. |
| Historical archive | Superseded implementation, UI, audit, diagnostic, and exploratory records. | Index in place; do not bulk-add to current status. |
| Paused platform archive | WeChat/backend paused scope and Bilibili account diagnostic scope. | Keep separated from active four-platform content-level work. |
| Local-only evidence | `.local/**`, raw captures, sqlite smoke evidence, browser profiles, and generated reports. | Keep local-only; summarize in handoffs when needed. |

## Indexed Counts

- Handoff active/current protected: 11 files, including 070-078 current/governance chain plus `README.md` and `CURRENT-PLATFORM-STATUS.md`.
- Handoff release/mainline evidence: 26 files from 050-069 release/mainline closure records.
- Handoff paused platform archive: 17 files covering WeChat/backend paused records and Bilibili account diagnostic records.
- Handoff historical archive: 265 older UI, platform, import, dashboard, review, audit, and diagnostic records.
- Product specs active/current: 18 active baseline specs.
- Product specs release/supporting: 6 accepted older feature/test-surface specs.
- Product specs paused archive: 3 files, `bilibili-account-metrics-022.md`, `wechat-001.md`, and `wechat-backend-v0.md`.
- Product specs historical archive: 17 UI experiment, browser/demo, and superseded implementation-note specs.

## File Movement And Deletion

- Deleted files: none.
- Moved files: none.
- Directories deleted: none.
- Wildcard operations: none.
- `git clean`: not used.

## Changed Files

- `docs/handoffs/archive-index.md`
- `docs/product-specs/archive-index.md`
- `docs/handoffs/README.md`
- `docs/handoffs/HANDOFF-SPEC-ARCHIVE-INDEX-CLEANUP-078-worker-handoff.md`
- 249 previously untracked historical handoff Markdown files under `docs/handoffs/`
- 20 previously untracked historical/paused product spec Markdown files under `docs/product-specs/`

## Verification

- `git diff --check`: PASS.
- Markdown trailing whitespace check on changed markdown files: PASS.
- Archive index link existence check: PASS.
- `git status -sb` before/after: reviewed; unrelated dirty files remain unstaged.

## Known Issues

- Existing unrelated worktree changes remain present and were intentionally not cleaned or staged.
- `docs/handoffs/README.md` already had pre-existing unstaged changes before this task; only the 078 archive rules were added by this task.
- Physical archive movement was intentionally deferred. A future move task should list 10-20 exact files first and then move them one by one.

## Next Recommendation

Use `docs/handoffs/archive-index.md` and `docs/product-specs/archive-index.md` as the lookup path for historical/superseded files. Future sessions should keep `CURRENT-PLATFORM-STATUS.md` compact and avoid promoting archived records into active reading order unless the Orchestrator explicitly reopens that scope.

## Orchestrator Decision Required

No for this index-only cleanup. Yes for any future physical moves or deletions.
