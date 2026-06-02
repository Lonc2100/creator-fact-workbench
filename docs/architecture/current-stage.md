# Current Stage Architecture

## Stage

Engineering governance correction for the self-media AI workbench.

## Objective

Make the repository safe to continue before product implementation:

- all active files live under `D:\codex work\自媒体创作\Data Collection and Background Analysis`;
- canvas-workbench context is excluded;
- the self-media backend workflow is the only product direction;
- task, spec, agent handoff, quality, and cleanup records are durable files;
- acceptance does not rely on chat memory.

## Not Doing

- No canvas UI or canvas workflow.
- No import from `D:\codex work\desk work`.
- No bulk deletion of parent-directory files.
- No live external connector until internal models and fake/manual flows are stable.

## Product Spine

```text
collect -> internal store -> analyze -> topic planning -> content production -> publish queue -> metrics recovery -> weekly/monthly review -> monetization follow-up
```

## Backend Modules

- Content: drafts, published items, platform variants, status history.
- Platform metrics: views, likes, comments, saves, shares, follower deltas, platform snapshots.
- Ideas: topics, source signals, confidence, target platform, next action.
- Competitors: account profiles, representative content, observed patterns.
- Experiments: hypothesis, treatment, result, learning.
- Contacts: people, organizations, channels, relationship notes, monetization leads.
- Reviews: weekly and monthly structured results plus Markdown reports.

## State Rules

Internal records are the source of truth. Chat discussion can propose changes, but it cannot be the state store.

Every mutation must define:

- input contract;
- state transition;
- persistence target;
- error class;
- review or audit evidence.

## Phase Gate

This stage is complete only when:

- `npm run verify:harness` passes;
- `docs/task-board.md` has active and next tasks;
- `docs/spec-governance.md` defines the alignment process;
- `docs/agent-playbook.md` defines handoff and review;
- `docs/cleanup-manifest.md` lists parent-directory cleanup candidates without deleting them.
