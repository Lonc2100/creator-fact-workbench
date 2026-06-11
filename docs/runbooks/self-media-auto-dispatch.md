# Self-media Auto Dispatch Pilot

## Purpose

This pilot reduces copy-paste work after a Worker finishes a handoff. It does not make the project autonomous. The Orchestrator or a fixed Ops session still decides whether the next task is safe to dispatch.

## Automation Levels

### Level 1: Prompt Draft Only

- Worker or Orchestrator writes the next prompt in the handoff.
- User still copies it into a new session.
- Lowest risk, but it does not reduce enough manual routing.

### Level 2: Dispatch Queue

- A local script reads the latest accepted handoff and status docs.
- It writes a structured dispatch candidate under `docs/handoffs/dispatch-queue/`.
- The main/Ops session reads the candidate, checks user gates and heavy-gate conflicts, then decides whether to create or send a thread.
- Recommended for this project because it removes prompt copying while keeping PRD and real-data gates human-owned.

### Level 2.5: Queue + Main/Ops Thread Dispatch

- A readiness script reads queue items and prepares a dispatch report plus a Worker prompt.
- The script can say `ready`, `blocked_by_user_gate`, or another blocking status.
- The main/Ops session may call Codex thread tools only after reading that report.
- This is the active target for the 127 pilot.

### Level 3: Hook + Ops Automation

- Trellis lifecycle hooks or an Ops automation generates and dispatches the next Worker automatically.
- This is not recommended yet because this repo has live platform login, real-data saves, sqlite writes, and serial browser/Next gates.
- Level 3 can be considered later only after dispatch dedupe, active-worker locking, and user-gate enforcement are proven in Level 2.

## Queue Format

Queue files live in:

```text
docs/handoffs/dispatch-queue/*.json
```

Each queue item must include:

- `taskId`
- `objective`
- `plainLanguage`
- `requiredReading`
- `allowedFiles`
- `forbiddenFiles`
- `validationCommands`
- `handoffPath`
- `needs_user_gate`
- `safetyGates`
- `heavyGatesSerial`
- `dedupeKey`
- `dispatchInstructions`

Queue files must not contain passwords, cookies, tokens, headers, storageState, raw requests, raw responses, screenshots, HAR, trace files, or platform DOM.

## Script

Generate the current pilot queue:

```bash
node scripts/self-media-next-dispatch.mjs --dry-run
```

The script only writes queue/report files and prints a JSON summary. It never creates Codex threads, never commits, never pushes, never deletes files, never runs browser capture, and never saves platform data.

Use `--no-write` to inspect the result without writing files.

Check whether queue items can be dispatched:

```bash
node scripts/self-media-dispatch-readiness.mjs
```

Outputs:

- `docs/handoffs/dispatch-queue/dispatch-readiness.json`
- `docs/handoffs/dispatch-queue/dispatch-readiness.md`
- `docs/handoffs/dispatch-queue/dispatch-ledger.md`

The readiness script does not create Codex threads. It only classifies queue items and prepares a prompt for the main/Ops session.

## Main / Ops Dispatch Protocol

1. Read `docs/handoffs/dispatch-queue/latest-report.md`.
2. Open the referenced queue JSON.
3. Check `dedupeKey` against already dispatched tasks and recent handoffs.
4. Confirm `needs_user_gate`:
   - If `true`, do not dispatch until the gate is satisfied.
   - If the gate is a real-data save, the user must provide the data and explicitly confirm preview rows.
5. Check heavy gates:
   - live 3200 checks
   - browser/E2E
   - sqlite writes
   - Next build
   - daily platform ops gate
6. If no heavy gate conflict exists, create or steer the Worker thread from the main/Ops session.
7. Mark the dispatch in the next handoff; do not rely on chat memory alone.

## Codex Thread Tool Boundary

- Use `create_thread` when the queue item is ready, no user gate is pending, no heavy-gate conflict exists, and a new bounded Worker thread is desired.
- Use `send_message_to_thread` when an existing Worker thread is already assigned to that task and the main/Ops session needs to continue or correct it.
- Do not let the queue script call these tools directly.
- Do not dispatch from a Worker that has not written durable evidence.

Suggested thread title:

```text
Worker <number> - <short task title>
```

Example:

```text
Worker 127 - Video Account Manual Data Intake
```

The thread prompt must include:

- task id;
- objective;
- plain-language summary;
- required reading;
- allowed and forbidden files;
- validation commands;
- handoff path;
- user gate state;
- safety gates and heavy-gate serial requirements.

## Required Stop Gates

Stop and ask the user before:

- deleting files or folders;
- saving real platform data;
- login, QR code, captcha, or risk-control confirmation;
- force push;
- handling sensitive material;
- redefining PRD/mainline scope;
- dispatching when another Worker may edit the same files;
- running heavy gates in parallel without explicit isolation.

## Duplicate / Infinite Loop Prevention

- Every queue item has a `dedupeKey`.
- A queue item with `dispatchStatus: "waiting_user_gate"` must not be auto-dispatched.
- `dispatch-ledger.md` records task id, dedupe key, status, optional thread id, timestamp, and note.
- The script only inspects explicit handoffs; it does not scan an open-ended task stream.
- Generated queue files are evidence, not active schedulers.
- A future Level 3 must add an active-worker lock before automatic dispatch is allowed.

## Current Pilot Candidate

The first pilot candidate comes from 125:

- Video Account manual update needs user-provided current content-level data.
- Queue generation is safe.
- Dispatch must wait for user data and explicit save confirmation.
- Readiness status is expected to be `blocked_by_user_gate` until the user provides title, publish time, stable work ID/link, play/exposure/view count, likes, comments, and available save/share fields.
