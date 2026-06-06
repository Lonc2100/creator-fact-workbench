# Agent Playbook

## Agent Boundary

Agents may plan, explain, build, and review only through the Harness route. They must not use canvas-workbench context for this repository.

## Roles

- Orchestrator: owns task routing, state transitions, phase decisions, and final acceptance.
- Worker: implements one task package through the fixed route.
- Explorer: sidecar researcher for external projects, docs, APIs, or difficult local context. Explorer writes findings into `docs/context/` or task handoff notes.
- Auditor: independent reviewer. Auditor checks architecture boundaries, spec consistency, test evidence, context pollution, and unresolved ambiguity. Auditor does not directly edit implementation files.

## Task Lifecycle

Tasks move through:

```text
Inbox -> Spec Aligned -> Assigned -> In Progress -> Review -> Done | Blocked
```

The Orchestrator owns every state transition. A task cannot enter `In Progress` unless it has a task ID, scope, acceptance command, and handoff path in `docs/task-board.md`.

## Entropy And Data Isolation

Before cleanup, release closure, or filesystem governance tasks, run `npm run scan:entropy` and record the report path in the handoff. The scan is read-only and writes reports under `.local/entropy-governance-scan/`.

Worker acceptance must use isolated databases by default. Smoke, E2E, fixture, demo, and acceptance data must not write to `.local/self-media.sqlite` unless the task explicitly states a live read-only check and the handoff records that no write path ran.

## Handoff

Record durable context in `docs/context/` before relying on it.

Every handoff must include:

- task ID;
- completed work;
- changed files;
- verification commands and results;
- known issues;
- next recommendation;
- whether Orchestrator decision is required.

Disposable agents should receive only the task package and necessary context files. Their conclusions must be written back into durable docs before their context is discarded.
