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

## Parallel Long-Cycle Work

Parallel sessions should be used for bounded long-cycle tasks when they can reduce main-session interruption. A Worker should be able to complete the full loop without repeated user prompts:

- read the required context and task constraints;
- execute the allowed implementation, audit, or verification steps;
- run the requested validation commands in order;
- diagnose failures without changing scope;
- write evidence and handoff notes;
- recommend the next concrete action.

Good parallel long-cycle tasks include docs/status audits, bundle attribution, platform-core verification, screenshot regression, product review, and narrow UI polish. They are not good places to quietly change core Types, Repo, Service, Runtime, package scripts, or shared data models unless the task package explicitly allows it and the Orchestrator has assigned that bundle.

Heavy browser/E2E tasks remain serialized unless the task explicitly provides isolated ports, isolated sqlite paths, and isolated `NEXT_DIST_DIR`. Do not run multiple Playwright/Next/database smoke gates in parallel against the same local server or DB.

## Auto Dispatch Pilot

The project uses a Level 2 dispatch-queue pilot for next-task handoff. Workers may write durable handoffs; a local script may turn an accepted handoff into a queue candidate under `docs/handoffs/dispatch-queue/`; only the Orchestrator or fixed Ops session may decide whether to create or steer a Codex thread.

Automation levels:

- Level 1: generate the next prompt for the user to copy manually.
- Level 2: generate a structured dispatch queue, then let the main/Ops session dispatch after safety checks.
- Level 3: hook or Ops automation opens the next Worker automatically. This is not active for this repo.

Recommended level: Level 2. The queue removes prompt-copy friction while preserving user gates for login, real-data save, deletion, force push, sensitive material, PRD scope changes, and heavy-gate scheduling.

Current pilot target: Level 2.5. A readiness script may turn queue items into a main/Ops dispatch report and a Worker prompt, but it must not call Codex thread tools itself.

Dispatch queue rules:

- A queue item is evidence, not permission to run.
- Queue items must include task id, objective, plain-language summary, required reading, allowed files, forbidden files, validation commands, handoff path, and `needs_user_gate`.
- Queue items must not contain password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM.
- `needs_user_gate: true` means the main/Ops session must wait for the user before dispatch or before the relevant save action.
- Heavy gates remain serial: live 3200, browser/E2E, sqlite writes, Next build, and daily platform ops gate.
- The queue generator must not create Codex threads, modify business code, commit, push, delete files, or save platform data.
- `create_thread` is a main/Ops action for a ready queue item; `send_message_to_thread` is a main/Ops action for an already assigned Worker. A queue item with `needs_user_gate: true` must remain blocked until the user gate is satisfied.

## Runtime Quality Protocol

Worker runtime is a quality signal, not a timer to game. Do not reward or punish agents for merely staying open longer. Use better task planning, task merging, extra-depth passes, and stronger handoffs to improve quality.

Classify every Worker task:

- `micro`: single-file cleanup, read-only existence check, or an explicit narrow fix. These may finish in under 15 minutes.
- `normal`: ordinary implementation, audit, documentation protocol update, bundle attribution, or lightweight verification.
- `long-cycle`: cross-file attribution, heavy verification, platform-loop dry-run, browser/E2E/Next/sqlite gate, or any task expected to reduce main-session interruption.

For `normal` and `long-cycle` tasks, if elapsed time is under 15 minutes, the Worker must do one of the following before finishing:

- run an extra-depth pass such as adjacent spec search, diff review, risk matrix, validation recheck, or handoff evidence tightening;
- explain why extra depth would exceed scope, touch forbidden files, duplicate already completed validation, or conflict with heavy gate serial discipline.

Heavy browser/E2E/Next/sqlite/live 3200 gates remain serial by default. Do not start a heavy gate just to fill time.

## Entropy And Data Isolation

Before cleanup, release closure, or filesystem governance tasks, run `npm run scan:entropy` and record the report path in the handoff. The scan is read-only and writes reports under `.local/entropy-governance-scan/`.

Worker acceptance must use isolated databases by default. Smoke, E2E, fixture, demo, and acceptance data must not write to `.local/self-media.sqlite` unless the task explicitly states a live read-only check and the handoff records that no write path ran.

## Handoff

Record durable context in `docs/context/` before relying on it.

Every handoff must include:

- task ID;
- Started;
- Finished;
- Elapsed;
- Workload class;
- `<15min explanation or extra-depth pass>` when elapsed time is under 15 minutes;
- completed work;
- changed files;
- verification commands and results;
- known issues;
- next recommendation;
- whether Orchestrator decision is required.

Disposable agents should receive only the task package and necessary context files. Their conclusions must be written back into durable docs before their context is discarded.
