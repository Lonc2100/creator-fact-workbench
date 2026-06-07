# Handoffs

This directory stores durable handoff records between Orchestrator, Worker, Explorer, and Auditor roles.

## Current Status Entry

Before reading many individual handoffs, start here:

1. `AGENTS.md`
2. `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
3. The small set of orchestrator reviews listed inside `CURRENT-PLATFORM-STATUS.md`
4. `docs/handoffs/PLATFORM-RUNBOOK-019.md` only when operating collectors, imports, smoke checks, or platform health checks

Current accepted platform baseline:

- Four content-level closed-loop platforms: Douyin, Xiaohongshu, Video Account, and Bilibili.
- WeChat Official Account / backend is paused unless the user explicitly reopens it.
- Bilibili account-level metrics are preview-only; do not save them into durable account snapshots yet.
- Standing smoke gate: `npm run smoke:platform-operations-e2e`.
- Platform data health command: `npm run health:platform-data`.
- Daily ops preflight: `npm run ops:daily-self-media -- --preflight-health` uses strict local health plus trusted-data readiness before adopting a dashboard URL.
- Draft review browser E2E: `npm run smoke:draft-review-ui-e2e`.
- Operator dev server: `npm run dev:operator`, then open `http://localhost:3200/dashboard`.
- Default user-facing UI rule: show filtered real operating data, charts, and tables first. Internal paths, commands, audit/preflight details, smoke/demo/debug rows, and developer diagnostics belong in collapsed advanced diagnostics or explicit debug views.

Each handoff must include:

- task ID;
- completed work;
- changed files;
- verification commands and results;
- known issues;
- next recommendation;
- whether Orchestrator decision is required.

## Short Chat Protocol

The durable handoff file is the source of truth. Chat messages are only a relay signal for the user and Orchestrator.

When a Worker finishes, do not paste the full handoff into chat. Reply with only this compact status:

```text
【任务完成：TASK-ID】
handoff: docs/handoffs/TASK-ID-worker-handoff.md
验证: typecheck PASS / diff PASS / harness PASS
需主会话判断: 否
```

If blocked, use:

```text
【任务阻塞：TASK-ID】
handoff: docs/handoffs/TASK-ID-worker-handoff.md
阻塞点: 一句话说明
需主会话判断: 是
```

Screenshots, changed files, detailed risks, and next recommendations must be written inside the handoff file, not pasted into chat unless the Orchestrator explicitly asks.

## User Relay Contract

The user should only need to paste short trigger or relay messages between sessions.

Start a Worker:

```text
请执行 TASK-ID。按 docs/handoffs/README.md 的 Short Chat Protocol 回报，详细内容写 handoff。
```

Relay a completed Worker back to Orchestrator:

```text
TASK-ID 完成，handoff: docs/handoffs/TASK-ID-worker-handoff.md
```

Relay a blocked Worker back to Orchestrator:

```text
TASK-ID 阻塞，handoff: docs/handoffs/TASK-ID-worker-handoff.md
```

The Orchestrator must read the referenced handoff file directly, inspect the relevant diff/screenshots when needed, and should not ask the user to paste long reports that already exist in the repository.

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
