# Active Exec Plan: Engineering Governance Correction

## Objective

Repair project governance after discovering that earlier work may have landed in the parent directory and may include polluted context. The active project is the self-media AI backend management workbench inside `D:\codex work\自媒体创作\Data Collection and Background Analysis`.

## Scope

- Reassert the project root.
- Exclude canvas-workbench context.
- Define self-media backend module boundaries.
- Add spec/task/agent coordination records.
- Add cleanup manifest for parent-directory files.
- Keep all new files inside the active project root.

## Out of Scope

- Building canvas features.
- Importing files from `D:\codex work\desk work`.
- Batch deleting parent-directory files.
- Connecting live external services before internal records exist.

## Tasks

| ID | Status | Work | Evidence |
| --- | --- | --- | --- |
| GOV-001A | Done | Inspect active scaffold and existing Harness checks | Local file reads |
| GOV-001B | Done | Write governance correction docs | `docs/architecture/current-stage.md`, `docs/spec-governance.md`, `docs/task-board.md`, `docs/agent-playbook.md` |
| GOV-001C | Done | Extend checks so governance docs are required | `scripts/context-check.mjs`, `harness-template.json` |
| GOV-001D | Done | Run `npm run verify:harness` | Passed 2026-06-01 |
| GOV-001E | Done | Record parent cleanup candidates without deleting | `docs/cleanup-manifest.md` |
| GOV-001F | Done | Delete parent-directory files after user confirmation | Parent contains only active project folder |
| GOV-001G | Done | Add Chinese mainline framework, workflow boundaries, and Agent setup docs | `docs/mainline-framework.md`, `docs/workflow-boundaries.md`, `docs/agent-team-setup.md` |

## Verification

`npm run verify:harness` passed on 2026-06-01 after governance correction and again after mainline framework docs:

- TypeScript typecheck passed.
- `context-check` passed.
- `harness-lint` passed.
- `tests/harness-structure.test.mjs` passed.
- `template-doctor` passed with no blocking items and no warnings.

## Temporary Decisions

- The old `data-collection` module was removed by `GC-001`; `self-media` is the active product module.
- The next implementation phase should create self-media core entities before UI expansion.
- Parent-directory cleanup is documented but not executed.
- The current task remains in Review until the user confirms the governance direction and whether parent cleanup should proceed.
- The parent directory cleanup was later confirmed by the user and executed one path at a time.

## Open Questions

- Should the parent directory remain a git root, or should this subfolder become the only git/project root?
- Which persisted store should Phase 1 use first: JSON file, SQLite, or another local database?
- Which platforms are first-class for metrics import: Douyin, Xiaohongshu, WeChat Official Account, Video Account, or all four?
