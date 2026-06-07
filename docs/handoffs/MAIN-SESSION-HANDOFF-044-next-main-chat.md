# MAIN-SESSION-HANDOFF-044 Next Main Chat

Date: 2026-06-05

## Purpose

Use this file to start a new main Orchestrator chat without losing PRD alignment or project quality. The current main chat is long enough that a fresh main chat is recommended for lower coordination risk, but the project state is preserved in durable handoff/status files.

## Required Reading Order

1. `AGENTS.md`
2. `docs/handoffs/README.md`
3. `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
4. This file

Do not reopen every historical handoff unless a specific task needs it.

## Current Accepted Operating State

- Fixed operator inspection server: `npm run dev:operator`
- Fixed user URL: `http://localhost:3200/dashboard`
- Fixed local operating DB profile: `.local/self-media.sqlite`
- Seed mode is off for operator inspection.
- Four active content-level platforms are Douyin, Xiaohongshu, Video Account, and Bilibili.
- WeChat Official Account remains paused.
- Bilibili account-level metrics remain preview-only.
- Default dashboard/reviews/action suggestions use trusted real creator-center content-level snapshots only.
- Default UI is data-only: show useful operating metrics, charts, tables, drafts, schedule state, and next actions.
- Internal diagnostics must not appear in default user-facing views.

## Latest 044 Accepted State

### Dashboard Number Trust

`DASHBOARD-LIVE-NUMBER-AUDIT-044` is accepted.

Current live 3200 trusted totals:

- Trusted content rows: 18
- Trusted metric snapshots: 18
- Views: 344377
- Engagement: 4258

The live dashboard-number audit is read-only and should be preferred for validating what the user actually sees on 3200.

### Calendar Real Scheduling

`CALENDAR-REAL-SCHEDULING-WORKFLOW-044` is accepted.

Calendar now defaults to actual scheduling work:

- Empty days stay empty.
- Real pending drafts appear in a compact queue.
- Pending items can enter schedule review.
- Drag scheduling updates content/platform-version/queue state.
- Scheduling does not create publish ledger records and does not affect trusted metric totals.

### Operator UX Polish

`OPERATOR-UX-FINAL-POLISH-044` is accepted.

Main operator pages now use more Chinese, business-facing copy and keep diagnostics away from the primary view. `/ui-lab` remains an internal component-lab surface.

## Non-Negotiable Guardrails

- Do not resume WeChat work unless the user explicitly reopens it.
- Do not promote Bilibili account metrics into durable account snapshots or content totals.
- Do not call real platform publish APIs.
- Do not treat manual publish ledger records as trusted metric evidence.
- Do not treat action-generated drafts or schedules as trusted metric evidence.
- Do not show local paths, report paths, npm commands, API URLs, raw dirs, run ids, evidence files, pageReady/apiReady/preflight internals, smoke/demo/fixture/debug rows, or implementation wording in default user-facing pages.
- Do not delete, clear, migrate, or sanitize local DB rows without a separate explicit main-session approval and backup plan.
- Do not run E2E/browser/server-heavy commands in parallel unless their scripts are explicitly isolated.
- Keep persistent operator inspection on port 3200.

## Recommended 045 Mainline

### 1. MAINLINE-PRD-RECONCILIATION-045

Review `docs/product-specs/index.md`, `docs/task-board.md`, current handoff index, and accepted 041-044 decisions. Produce a short PRD gap matrix:

- Already usable now
- Usable but needs product polish
- Internal-only and should stay hidden
- Not implemented
- Explicitly paused

No business code changes.

### 2. LIVE-OPERATOR-WALKTHROUGH-045

Run a read-only live walkthrough of 3200:

- `/dashboard`
- `/import`
- `/content`
- `/calendar`
- `/reviews`
- any top-level operator entry page if present

Confirm user-facing pages obey the data-only rule and capture screenshots. Do not mutate data except for explicitly safe read-only checks.

### 3. ACTION-QUEUE-ERGONOMICS-045

Improve dashboard action/task density if live walkthrough confirms the list is too long:

- grouping
- paging
- collapse/expand
- status/source filtering polish

Keep trusted evidence validation and no automatic conversion.

### 4. REMAINING-SURFACE-POLISH-045

Polish or hide secondary pages that still feel internal, especially `/ui-lab`, overview/leads if exposed, and any page showing debug or implementation copy by default.

## Copyable New Main Chat Prompt

```text
请作为新的主会话 Orchestrator 接手自媒体项目。先阅读：
1. AGENTS.md
2. docs/handoffs/README.md
3. docs/handoffs/CURRENT-PLATFORM-STATUS.md
4. docs/handoffs/MAIN-SESSION-HANDOFF-044-next-main-chat.md

不要重新开启大规划循环，也不要回滚已有工作。继续 044 后主线：固定使用 http://localhost:3200/dashboard 审查；保持四平台真实数据、默认 UI data-only、诊断信息折叠/隐藏、公众号暂停、B站账号指标 preview-only。先给我当前项目状态、PRD 对齐风险、以及下一步 045 并行任务提示词。
```
