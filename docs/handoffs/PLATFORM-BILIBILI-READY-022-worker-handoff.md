# PLATFORM-BILIBILI-READY-022 Worker Handoff

## Task

Prepare a no-risk Bilibili operations entry after preview mapping acceptance, without enabling Bilibili durable save before save-smoke acceptance.

## Status

Completed.

## Source Of Truth Used

- `PLATFORM-READINESS-021-orchestrator-review.md`
- `PLATFORM-IMPORT-UX-021-orchestrator-review.md`
- `BILIBILI-PERSONAL-V1-METRICS-021-orchestrator-review.md`

Current accepted Bilibili stage remains:

```text
real discovery -> preview mapping accepted -> durable save pending
```

## Implemented

- Bilibili readiness now shows:
  - stage: `preview_ready`
  - mapping: `V1 preview mapping 已接受`
  - save: `save pending`
  - dashboard/review: not entered
  - operations: save disabled until save-smoke acceptance
- Added config-layer operation capabilities:
  - Douyin, Xiaohongshu, Video Account: preview/save/save-smoke enabled
  - Bilibili: preview enabled, save/save-smoke disabled
- Service exposes operation capabilities through dashboard snapshot.
- Runtime save whitelist is derived from config and excludes Bilibili.
- `/import` displays Bilibili as a prepared read-only/preview row with disabled save button:
  - button label: `待开放`
  - note: `待保存烟测通过后开放`
- `npm run import:bilibili -- --save` remains disabled and writes a preview-only rejection if called.
- No Bilibili real save, capture, or WeChat backend work was run.

## Screenshot

Saved:

```text
.local/platform-bilibili-ready-022.png
```

Visual check:

- Bilibili row is visible in the operation strip.
- Bilibili save button is disabled.
- The disabled reason is visible without text overlap.

## Tests Added/Updated

- Bilibili save path stays disabled until save-smoke is accepted.
- Bilibili is not in the save-enabled platform operation whitelist.
- Bilibili runtime save operation returns the disabled reason before reading raw captures.
- Readiness status keeps Bilibili as preview-ready/save-pending.
- Platform import statuses remain the three durable platforms only.

## Verification

- `npm run test:self-media`: PASS, 50 tests
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- Screenshot generated: PASS
- `git diff --check`: PASS

## Notes

- Existing Bilibili preview provider remains available for mapping summaries.
- Account-level Bilibili metrics, date-key survey rows, comment text, danmu text, raw payloads, cookies, tokens, and headers are not persisted by this task.
- Bilibili durable save should only be enabled after an accepted save-smoke handoff/review updates the config flag.

## Orchestrator Decision Required

Yes.
