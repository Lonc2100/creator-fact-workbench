# MAINLINE-AUTO-DISPATCH-CODEX-THREAD-INTEGRATION-127 Worker Handoff

## Summary

- Goal: connect the 126 dispatch queue to a safe main/Ops Codex-thread dispatch protocol.
- Result: implemented Level 2.5 readiness reporting. The queue can now be read, classified, converted into a Worker prompt, and recorded in a lightweight ledger.
- Commit: yes.
- Push: yes.
- Actual Codex child thread created: no.
- Main-session judgment needed: no for the readiness layer; yes before dispatching any user-gated real-data Worker.

## 127 Queue Current State

- Queue item: `MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127`.
- Queue path: `docs/handoffs/dispatch-queue/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127.json`.
- Dedupe key: `50e2023272d8d9fe`.
- Dispatch status: `waiting_user_gate`.
- Readiness status: `blocked_by_user_gate`.
- Can dispatch: no.

Reason: the task would save real Video Account data, but the user has not yet provided current owned content-level rows with stable work ID/link and explicit preview confirmation.

Required user data before dispatch:

- 视频号作品标题.
- 发布时间.
- 稳定作品 ID 或链接.
- 播放 / 曝光 / 浏览.
- 点赞.
- 评论.
- 收藏 / 转发 / 分享等可用字段.

## Dispatch Readiness Script

- Added: `scripts/self-media-dispatch-readiness.mjs`.
- Command: `node scripts/self-media-dispatch-readiness.mjs`.
- Reads: `docs/handoffs/dispatch-queue/*.json`.
- Writes:
  - `docs/handoffs/dispatch-queue/dispatch-readiness.json`
  - `docs/handoffs/dispatch-queue/dispatch-readiness.md`
  - `docs/handoffs/dispatch-queue/dispatch-ledger.md`
- Does not:
  - create Codex threads;
  - send messages to existing threads;
  - save platform data;
  - delete files;
  - commit or push;
  - run heavy gates;
  - bypass user gates.

## Codex Thread Dispatch Protocol

This project is now documented as Level 2.5:

```text
Worker handoff -> dispatch queue -> readiness report -> main/Ops safety check -> optional Codex thread dispatch
```

Use `create_thread` when:

- readiness is ready;
- `needs_user_gate` is false or already satisfied;
- no heavy gate is running;
- a new bounded Worker is desired.

Use `send_message_to_thread` when:

- an existing Worker has already been assigned to the task;
- the main/Ops session needs to continue, correct, or unblock that same Worker.

Suggested thread name:

```text
Worker 127 - Video Account Manual Data Intake
```

Worker prompt must include:

- task id;
- objective;
- plain-language explanation;
- required reading;
- allowed files;
- forbidden files;
- validation commands;
- handoff path;
- user gate state;
- safety gates;
- heavy-gate serial requirements.

## Dispatch Ledger

- Ledger path: `docs/handoffs/dispatch-queue/dispatch-ledger.md`.
- It records:
  - timestamp;
  - task id;
  - dedupe key;
  - status;
  - optional thread id;
  - note.
- Current ledger status for 127: `blocked_by_user_gate`.
- Thread id is blank because no child thread was created.

## Duplicate / Infinite Loop Prevention

- The queue item has `dedupeKey: 50e2023272d8d9fe`.
- Readiness output records `canDispatch: false` for the current item.
- The script does not watch files and does not loop.
- The script does not call `create_thread` or `send_message_to_thread`.
- `dispatch-ledger.md` is a review artifact, not an automation daemon.
- Any future `dispatched` status should be written by the main/Ops session after a real thread is created.

## User Stop Gates

Must stop for:

- saving real platform data;
- login, QR code, captcha, or risk-control checks;
- file deletion;
- force push;
- sensitive material;
- PRD/mainline scope changes;
- same-file multi-Worker conflicts;
- heavy gate conflicts.

Sensitive material boundary: no password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM was saved in queue/readiness/ledger docs.

## Changed Files

- `scripts/self-media-dispatch-readiness.mjs`
- `docs/runbooks/self-media-auto-dispatch.md`
- `docs/agent-playbook.md`
- `docs/trellis-parallel-workflow.md`
- `docs/handoffs/dispatch-queue/dispatch-readiness.json`
- `docs/handoffs/dispatch-queue/dispatch-readiness.md`
- `docs/handoffs/dispatch-queue/dispatch-ledger.md`
- `docs/handoffs/dispatch-queue/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127.json`
- `docs/handoffs/dispatch-queue/latest-report.md`
- `docs/handoffs/MAINLINE-AUTO-DISPATCH-CODEX-THREAD-INTEGRATION-127-worker-handoff.md`

## Verification

- `node scripts/self-media-next-dispatch.mjs --dry-run`: PASS.
- `node scripts/self-media-dispatch-readiness.mjs`: PASS; generated 1 blocked item, 0 ready items.
- `git diff --check`: PASS.
- trailing whitespace check: PASS.
- `git status --short`: PASS for scope review; only 127 files plus pre-existing unrelated dirty files were present before staging.

No TypeScript/business-code validation was required because this task changed only Node docs tooling and governance docs, not application TS, package scripts, providers, services, or UI behavior.

## Remaining Risks

- The readiness classifier is intentionally conservative and currently optimized for queue items shaped like the 126 pilot.
- `dispatch-ledger.md` is append-like evidence but not a locking system.
- A future real dispatched thread should record the actual thread id in a follow-up ledger update.
- Level 3 remains out of scope until active-worker locks and user-gate enforcement are proven.

## Worklog

- Started: 2026-06-11T17:02:23+08:00.
- Finished: 2026-06-11T17:04:56+08:00.
- Elapsed: about 3 minutes.
- Workload class: normal docs/tooling protocol implementation.
- Extra-depth pass: caught and fixed a self-readiness recursion bug where the script attempted to read its own generated `dispatch-readiness.json` as a queue item; repeated readiness execution now stays stable with 1 blocked item and 0 ready items.
- Need main-session judgment: no for blocked readiness; yes before dispatching the user-gated Video Account intake Worker.
