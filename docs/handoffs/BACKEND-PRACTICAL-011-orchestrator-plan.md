# BACKEND-PRACTICAL-011 Orchestrator Plan

## Purpose

This plan merges the three 010 Explorer / Spec handoffs into the next backend practical-use sequence.

Input handoffs:

- `docs/handoffs/IMPORT-REAL-010-worker-handoff.md`
- `docs/handoffs/CONTENT-WORKFLOW-010-worker-handoff.md`
- `docs/handoffs/REVIEW-ACTION-010-worker-handoff.md`

## Orchestrator Decisions

### Import

Accept `IMPORT-REAL-010`.

Decisions:

- Keep normalized metrics stable: views, likes, comments, saves, shares, followersDelta.
- Add native platform fields as raw/native metrics instead of forcing them into normalized fields.
- Support CSV and XLSX preview.
- Treat Xiaohongshu and Video Account headers as draft-realistic until the user provides real exports.
- Ask for one real exported file per platform later, but do not block initial implementation on that.

### Content Workflow

Accept `CONTENT-WORKFLOW-010`.

Decisions:

- `ContentPlatformVersion` is the primary operational lifecycle for platform-specific publishing.
- `PublishQueueItem` becomes compatibility / summary unless a later UI reason proves a separate queue state machine is still needed.
- Scheduling and publish confirmation must stay separate.
- Manual/provider publish confirmation gets an explicit service operation before live publishing connectors.
- `PublishRecord.status = confirmed` needs semantic cleanup before expanding publish APIs.

### Review Actions

Accept `REVIEW-ACTION-010`.

Decisions:

- A completed action that appears again in a later review does not auto-reopen; append history and evidence only.
- A dropped action that appears again creates a new canonical action by default and links the old action as context.
- dueDate defaults live in Config, not hard-coded Service logic.

Initial due date defaults:

- high: 3 days
- medium: 7 days
- low: 14 days
- monthly strategic action: 30 days

## Next Work Sequence

Do not start three backend implementation Workers that all edit Types / Repo / Service at the same time.

Use this order:

1. `BACKEND-SPEC-011`: write durable product specs from the accepted 010 handoffs.
2. `IMPORT-REAL-011`: implement provider-level import preview upgrades first.
3. `CONTENT-WORKFLOW-011`: implement explicit workflow contract and publish confirmation shape.
4. `REVIEW-ACTION-BACKEND-011`: implement action dedupe/history after import/content evidence contracts are stable.

## Recommended Parallel Work

Allowed to run in parallel now:

- One Spec Worker to write product specs.
- One UI/QA Auditor to inspect current UI polish diffs and screenshots.
- One Explorer to collect real sample export files from the user-provided files if they become available.

Not allowed to run in parallel now:

- Multiple backend Workers editing `self-media-types.ts`, repo, service, runtime, or API at the same time.
- Any Worker changing both import storage and review action evidence rules in one task.

## Next Worker Trigger: BACKEND-SPEC-011

Use this as the next safe Worker task:

```text
请执行 BACKEND-SPEC-011。

工作目录：
D:\codex work\自媒体创作\Data Collection and Background Analysis

任务目标：
把 IMPORT-REAL-010、CONTENT-WORKFLOW-010、REVIEW-ACTION-010 三份 handoff 收敛成可执行产品规格文件。本轮只写 docs/product-specs，不改 Types / Repo / Service / Runtime / API / UI。

必须遵守：
- 先读 AGENTS.md
- 读 docs/handoffs/README.md
- 读 docs/handoffs/BACKEND-PRACTICAL-011-orchestrator-plan.md
- 不批量删除任何文件
- 详细内容写 handoff
- 聊天只按 Short Chat Protocol 回报

建议新增规格：
- docs/product-specs/import-real-011.md
- docs/product-specs/content-workflow-011.md
- docs/product-specs/review-action-backend-011.md

handoff 路径：
docs/handoffs/BACKEND-SPEC-011-worker-handoff.md
```

## Acceptance For BACKEND-SPEC-011

- `git diff --check`
- Specs explicitly state source of truth, non-goals, allowed implementation files, acceptance tests, and open decisions.
- No core backend or UI files modified.

## Implementation Gate

After `BACKEND-SPEC-011` returns, the Orchestrator should choose exactly one backend implementation task to start first. Recommended first implementation is `IMPORT-REAL-011`, because practical import unlocks better dashboard, calendar evidence, and review actions.
