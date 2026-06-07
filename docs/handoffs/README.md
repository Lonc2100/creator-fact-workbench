# Handoffs

This directory stores durable handoff records between Orchestrator, Worker, Explorer, and Auditor roles.

Each handoff must include:

- task ID;
- completed work;
- changed files;
- verification commands and results;
- known issues;
- next recommendation;
- whether Orchestrator decision is required.

## Handoff Retention And Entropy Scan

Use `npm run scan:entropy` for release/status closure, cleanup, or filesystem governance tasks. The command writes a local report under `.local/entropy-governance-scan/` and does not delete files or write databases.

Retention rules:

- Current release, current runbook, and active operating handoffs belong in `CURRENT-PLATFORM-STATUS.md`.
- Historical, superseded, paused, duplicate, and diagnostic-only handoffs should be collected by a future archive index instead of bulk-added to the current status entry.
- Untracked handoffs are not automatically disposable. They must first be classified as keep, archive, migrate, or delete-only-after-user-confirmation.
- Handoff cleanup must follow `docs/entropy-governance.md` and the project rule that deletion requires explicit user confirmation and one explicit `Remove-Item -LiteralPath ...` per file.

## Archive Index Rules

Use `docs/handoffs/archive-index.md` for historical handoffs that must stay audit-readable but should not crowd the current handoff path. A handoff is active only while it is part of the current release/status baseline, a live operating runbook, or the current task chain called out by `CURRENT-PLATFORM-STATUS.md`.

Release handoffs may stay in the root directory for traceability, but they should not be added to `CURRENT-PLATFORM-STATUS.md` unless a future Worker genuinely needs them as first-read context. Paused platform work, diagnostic-only browser/E2E notes, superseded UI experiments, and local evidence summaries should be indexed under the archive policy instead.

Physical archive moves are optional and require a separate exact file list. If a future task moves handoffs, move only a small batch with one explicit `Move-Item -LiteralPath ...` per file; do not use wildcard moves, recursive moves, deletes, or `git clean`.
