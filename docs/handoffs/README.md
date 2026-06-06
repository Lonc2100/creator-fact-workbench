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
