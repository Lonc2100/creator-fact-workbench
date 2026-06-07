# BACKEND-SPEC-011 Worker Handoff

## Task ID

BACKEND-SPEC-011

## Role And Scope

Spec Worker.

Goal: converge `IMPORT-REAL-010`, `CONTENT-WORKFLOW-010`, and `REVIEW-ACTION-010` into executable product specs for the next backend sequence.

This round only wrote durable specs and this handoff. No Types, Repo, Service, Runtime, API, UI, tests, scripts, or package files were modified.

## Required Reading Completed

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/BACKEND-PRACTICAL-011-orchestrator-plan.md`
- `docs/handoffs/IMPORT-REAL-010-worker-handoff.md`
- `docs/handoffs/CONTENT-WORKFLOW-010-worker-handoff.md`
- `docs/handoffs/REVIEW-ACTION-010-worker-handoff.md`

Additional governance/context read:

- `docs/context/index.md`
- `docs/context/current-state.md`
- `docs/context/engineering-principles.md`
- `docs/context/decisions.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/spec-governance.md`
- `docs/exec-plans/active/v1.5-backend-mainline.md`

Relevant existing specs sampled:

- `docs/product-specs/import-001.md`
- `docs/product-specs/connector-001.md`
- `docs/product-specs/content-001.md`
- `docs/product-specs/publish-001.md`
- `docs/product-specs/v1.5-publish-data-loop.md`
- `docs/product-specs/calendar-editor-001.md`
- `docs/product-specs/review-actions-001.md`

## Completed Work

Added three executable product specs:

- `docs/product-specs/import-real-011.md`
- `docs/product-specs/content-workflow-011.md`
- `docs/product-specs/review-action-backend-011.md`

Updated product spec index:

- `docs/product-specs/index.md`

The specs explicitly include:

- source of truth;
- product problem;
- non-goals;
- implementation scope;
- allowed implementation files;
- acceptance tests and commands;
- open decisions;
- rollback notes.

## Spec Summary

### IMPORT-REAL-011

Turns `IMPORT-REAL-010` into a provider-level real import preview contract.

Key decisions captured:

- Keep normalized metric fields stable: `views`, `likes`, `comments`, `saves`, `shares`, `followersDelta`.
- Preserve platform-native fields as raw/native preview data.
- Support CSV pasted content, CSV files, and XLSX files.
- Treat Xiaohongshu and Video Account headers as `draft_realistic` until real exported files are provided.
- Stop before durable `nativeMetrics/rawFields` storage changes unless Orchestrator approves the Types/Repo shape.

### CONTENT-WORKFLOW-011

Turns `CONTENT-WORKFLOW-010` into a lifecycle contract.

Key decisions captured:

- `ContentPlatformVersion` is the primary operational lifecycle for platform-specific publishing.
- `PublishQueueItem` is compatibility/summary unless a later UI reason proves otherwise.
- Calendar placement is derived from `ContentPlatformVersion.scheduledAt`.
- Scheduling and publish confirmation are separate.
- Future backend work should add an explicit publish confirmation operation before live provider publishing.
- `PublishRecord.status = confirmed` requires semantic cleanup before API/UI expansion.

### REVIEW-ACTION-BACKEND-011

Turns `REVIEW-ACTION-010` into a backend action dedupe/history contract.

Key decisions captured:

- Completed actions that reappear do not auto-reopen; append history and evidence only.
- Dropped actions that reappear create a new canonical action by default and link the old one as context.
- Due date defaults live in Config:
  - high: 3 days
  - medium: 7 days
  - low: 14 days
  - monthly strategic action: 30 days
- Service owns dedupe, status transitions, owner defaults, due state, evidence validation, and history creation.

## Changed Files

- Added `docs/product-specs/import-real-011.md`
- Added `docs/product-specs/content-workflow-011.md`
- Added `docs/product-specs/review-action-backend-011.md`
- Updated `docs/product-specs/index.md`
- Added `docs/handoffs/BACKEND-SPEC-011-worker-handoff.md`

## Scope Guard

- Did not modify Types / Config / Repo / Providers / Service / Runtime / API / UI.
- Did not modify tests.
- Did not modify scripts.
- Did not delete files or directories.
- Did not perform any batch deletion.
- Existing dirty/untracked files in the worktree were left untouched.

## Verification Commands And Results

```text
git diff --check
PASS
```

Tracked docs diff check:

```text
git diff --check -- docs/product-specs/index.md
PASS
```

New-file whitespace check:

```text
git diff --check --no-index -- /dev/null docs/product-specs/import-real-011.md
PASS for whitespace; command returns diff-style nonzero for new-file comparison, with no whitespace-error output.

git diff --check --no-index -- /dev/null docs/product-specs/content-workflow-011.md
PASS for whitespace; command returns diff-style nonzero for new-file comparison, with no whitespace-error output.

git diff --check --no-index -- /dev/null docs/product-specs/review-action-backend-011.md
PASS for whitespace; command returns diff-style nonzero for new-file comparison, with no whitespace-error output.

git diff --check --no-index -- /dev/null docs/handoffs/BACKEND-SPEC-011-worker-handoff.md
PASS for whitespace; command returns diff-style nonzero for new-file comparison, with no whitespace-error output.
```

Scope/status check:

```text
git status --short -- docs/product-specs docs/handoffs/BACKEND-SPEC-011-worker-handoff.md
Shows this task's `docs/product-specs/index.md` modification and four new BACKEND-SPEC-011 files, plus pre-existing untracked product-spec files in `docs/product-specs`.
```

Typecheck/harness are not required for this docs-only spec task, but the implementation specs list them as future Worker acceptance gates.

## Known Issues

- `IMPORT-REAL-011`, `CONTENT-WORKFLOW-011`, and `REVIEW-ACTION-BACKEND-011` are not yet listed in `docs/task-board.md`. This Worker did not edit task board because the requested scope was product specs plus handoff.
- Real Xiaohongshu and Video Account exported files are still needed to graduate draft-realistic headers to confirmed sampled presets.
- `PublishRecord.status = confirmed` remains a product/API cleanup item before publish API expansion.

## Next Recommendation

Orchestrator should start exactly one backend implementation Worker next.

Recommended first implementation:

- `IMPORT-REAL-011`

Reason:

- Real import preview unlocks better dashboard facts, publish-calendar evidence, and later review action dedupe.

Suggested sequence remains:

1. `IMPORT-REAL-011`
2. `CONTENT-WORKFLOW-011` or follow-up implementation task
3. `REVIEW-ACTION-BACKEND-011`

## Orchestrator Decision Required

No for this spec-convergence task.

Yes before implementation if the next Worker needs to expand allowed files beyond the spec, especially for durable native import metrics, publish record status cleanup, or review action history API routes.
