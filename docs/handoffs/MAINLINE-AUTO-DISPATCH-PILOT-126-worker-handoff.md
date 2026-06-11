# MAINLINE-AUTO-DISPATCH-PILOT-126 Worker Handoff

## Summary

- Goal: design and implement a safe auto-dispatch pilot that turns completed Worker handoffs into a next-task dispatch queue.
- Result: implemented Level 2 dispatch queue pilot.
- Commit: yes.
- Push: yes.
- Recommended automation level: Level 2.
- Main-session judgment needed: no for this pilot; yes before any future Level 3 automation or real-data dispatch.

## Automation Levels

- Level 1: main session drafts the next prompt; user still copies it manually.
- Level 2: local script generates a structured dispatch queue; main/Ops session reads the queue and decides whether to create or steer a Worker thread.
- Level 3: Trellis hook plus Ops automation automatically dispatches the next Worker after safety checks.

Recommendation: Level 2. It removes most prompt-copy friction while keeping the Orchestrator in charge of PRD scope, real-data saves, login gates, and heavy-gate scheduling.

Why not Level 3 now:

- Current work includes real platform login, QR/captcha risk, trusted data saves, sqlite writes, live 3200 checks, Next builds, and daily gates.
- A hook that opens threads automatically could dispatch while another Worker is editing the same file or running heavy gates.
- User gates for real data and platform login are not machine-verifiable yet.

## Dispatch Queue Format

- Queue directory: `docs/handoffs/dispatch-queue/`.
- Generated queue file: `docs/handoffs/dispatch-queue/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127.json`.
- Generated report: `docs/handoffs/dispatch-queue/latest-report.md`.

Each queue item includes:

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

The pilot candidate is based on 125 and is intentionally `dispatchStatus: "waiting_user_gate"` because Video Account still needs user-provided content-level data with a stable work ID/link before preview/save can run.

## Script / Hook Implementation

- Implemented script: `scripts/self-media-next-dispatch.mjs`.
- Dry-run command: `node scripts/self-media-next-dispatch.mjs --dry-run`.
- The script reads:
  - `docs/handoffs/MAINLINE-VIDEO-ACCOUNT-MANUAL-UPDATE-CYCLE-125-worker-handoff.md`
  - `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- The script writes only:
  - `docs/handoffs/dispatch-queue/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127.json`
  - `docs/handoffs/dispatch-queue/latest-report.md`
- It does not create Codex threads, run platform capture, save data, delete files, commit, push, or edit business code.
- No `.trellis/` hook file was committed because `.trellis/` is gitignored and the task boundary forbids staging `.trellis` local workflow/cache assets. The runbook documents how a future Trellis hook can call the script after a policy decision.

## Actual Sub-Session Dispatch

- Actual Codex child thread created: no.
- Reason: this is a queue-generation pilot and the generated 127 candidate requires a user gate before dispatch.
- Codex thread boundary documented:
  - `create_thread` only from main/Ops when explicitly dispatching a Worker.
  - `send_message_to_thread` only for an already selected thread.
  - Queue script must never call thread tools directly.

## Safety Gates

The queue requires stopping for:

- file deletion;
- real platform data save;
- login, QR code, captcha, or risk-control confirmation;
- force push;
- sensitive material;
- PRD/mainline scope changes;
- possible same-file multi-Worker conflicts;
- heavy gates already running elsewhere.

Sensitive material boundary: no password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM is stored in queue/report docs.

## Duplicate / Infinite Loop Prevention

- Each queue item has a stable `dedupeKey`.
- The 127 item is `waiting_user_gate`, so it cannot be auto-dispatched.
- The script only reads explicit source handoff/status files.
- It does not watch directories or schedule itself.
- Queue files are candidate evidence, not a scheduler.
- A future Level 3 must add active-worker locking before automatic dispatch.

## Heavy Gates

Heavy gates remain serial:

- live 3200 checks;
- browser/E2E;
- sqlite writes;
- Next build;
- daily platform ops gate.

If one Worker is running any of these, other Workers should do docs-only/static work or wait for Ops scheduling.

## Changed Files

- `scripts/self-media-next-dispatch.mjs`
- `docs/runbooks/self-media-auto-dispatch.md`
- `docs/agent-playbook.md`
- `docs/golden-principles.md`
- `docs/trellis-parallel-workflow.md`
- `docs/handoffs/dispatch-queue/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127.json`
- `docs/handoffs/dispatch-queue/latest-report.md`
- `docs/handoffs/MAINLINE-AUTO-DISPATCH-PILOT-126-worker-handoff.md`

## Verification

- `node scripts/self-media-next-dispatch.mjs --dry-run`: PASS; generated queue/report only.
- `git diff --check`: PASS.
- trailing whitespace check: PASS.
- `git status --short`: PASS for scope review; only 126 files plus pre-existing unrelated dirty files were present before staging.

No TypeScript or business-code validation was required because this task did not change TS/JS business code or package scripts.

## Remaining Risks

- Queue generation currently has one explicit pilot rule for the Video Account 125 follow-up. It is not a general planner.
- Dedupe is file/key-based; a future Ops UI may need a dispatched/accepted ledger.
- Level 3 remains unsafe until active-worker locks and user-gate enforcement are durable.
- Queue consumers must still read the handoff and status docs; the queue is not a replacement for Orchestrator judgment.

## Worklog

- Started: 2026-06-11T16:44:34+08:00.
- Finished: 2026-06-11T16:48:24+08:00.
- Elapsed: about 4 minutes.
- Workload class: normal docs/protocol implementation.
- Extra-depth pass: read the local Trellis workflow, config, hook example, parallel-session guide, and 125 handoff; verified `.trellis/` remains untouched/staged out because it is gitignored and forbidden by this task.
- Need main-session judgment: no for Level 2 pilot; yes before Level 3 or any auto real-data dispatch.
