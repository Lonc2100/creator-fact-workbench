# REVIEW-ACTION-010 Worker Handoff

## Task

- Task ID: `REVIEW-ACTION-010`
- Role: Explorer / Spec
- Goal: 整理复盘行动项的去重、状态流转、负责人、截止时间、证据链接、历史追踪规则，形成后端可实现的任务规格。
- Handoff path: `docs/handoffs/REVIEW-ACTION-010-worker-handoff.md`

## Scope Guard

- 已读 `AGENTS.md`。
- 已读 `docs/handoffs/README.md`，聊天回报按 Short Chat Protocol。
- 本轮只做规格与 handoff，不改 Types / Repo / Service / Runtime / API。
- 未批量删除任何文件或目录。
- 当前工作树已有大量并行 UI / 后端相关 dirty files，本 Worker 未回退、未整理、未触碰这些范围外改动。

## Completed Work

- 梳理现有 `ReviewActionItem`、`SavedReview`、`ActionItemPatchRequest`、`saveReview`、`updateActionItem` 和相关 contract tests 的当前能力与缺口。
- 查阅项目治理与 review 相关规格：
  - `AGENTS.md`
  - `docs/handoffs/README.md`
  - `docs/context/index.md`
  - `ARCHITECTURE.md`
  - `docs/mainline-framework.md`
  - `docs/task-board.md`
  - `docs/spec-governance.md`
  - `docs/product-specs/review-actions-001.md`
  - `docs/product-specs/ui-review-actions-002.md`
- 查阅外部成熟产品/平台规则作为参考：
  - GitHub Issues REST API：issues 具备 assignees、comments、labels、milestones，timeline events 用于展示 issue 活动。
  - GitHub Issue event types：包含 assigned、closed、labeled、marked_as_duplicate 等可审计事件。
  - Linear issue statuses：默认工作流为 Backlog / Todo / In Progress / Done / Canceled，duplicate 会转入 Canceled 类状态。
  - Linear issue relations：支持 blocked、blocking、related、duplicate，并将 duplicate merge 到 canonical issue。
  - Linear assignee / delegation：单一主负责人，agent 可作为 delegated contributor，历史进入 Activity feed。
  - Linear due dates：支持 due date 展示、overdue / due soon 状态、按 due date 过滤和排序。

## Current Implementation Snapshot

### Current Types

`ReviewActionItem` 当前字段：

- `id`
- `reviewId?`
- `title`
- `status: "todo" | "doing" | "done" | "dropped"`
- `priority: "high" | "medium" | "low"`
- `relatedType?`
- `relatedId?`
- `nextAction?`
- `updatedAt`

`SavedReview` 当前保存：

- `actionItemIds`
- `insights`
- 内容、平台版本、指标快照、线索 id 集合

`ActionItemPatchRequest` 当前只支持：

- `id`
- `status`
- `nextAction?`

### Current Service Behavior

- `saveReview(period)` 每次根据 report actions 创建新的 action item，id 格式包含 `Date.now()`。
- 目前没有服务端去重，UI 近期只能做前端合并展示。
- `updateActionItem` 只更新 `status`、`nextAction`、`updatedAt`，没有状态转移合法性、actor、history、reason、owner、due date、evidenceRefs。
- 当前 `relatedType / relatedId` 只支持一个关联对象，无法表达一条行动项依赖多个证据。

### Current Tests

- contract test 只验证保存复盘会产生 action items，状态可更新为 `doing` / `done`，dashboard 可见。
- 未覆盖重复保存复盘后的去重。
- 未覆盖非法状态转移。
- 未覆盖负责人、截止时间、证据 refs、多次更新历史。

## Problem Statement

复盘行动项已经成为 `/reviews` 的执行入口，但后端仍把它当作“每次复盘生成的一次性列表”。随着多轮周/月复盘、导入数据和线索跟进增加，会出现：

- 同一建议跨多次复盘重复生成，dashboard / reviews 看到大量重复行动。
- 状态可以任意覆盖，无法判断谁在什么时候把行动从什么状态推进到什么状态。
- 没有负责人，无法区分 creator、agent、system 或未来 delegated agent 的责任。
- 没有截止时间，无法做逾期、即将到期、排序、提醒。
- 证据只有单个 `relatedType / relatedId`，无法支撑“建议必须引用内部事实”的复盘原则。
- 没有 action history，无法审计行动项为什么被合并、重开、放弃或完成。

## Product Goal

把复盘行动项从“复盘报告附属物”升级为“可追踪、可去重、可审计的经营动作”。

用户视角：

- 每次保存周/月复盘，都能得到一组可执行行动项。
- 重复行动不刷屏，而是合并到同一个 canonical action，保留每次复盘出现的历史证据。
- 行动项能显示负责人、截止时间、证据来源、状态变化历史。
- 被完成或放弃的行动仍能作为历史事实保存，不被 UI 或新复盘静默覆盖。

工程视角：

- 后端规则落在 `Types -> Repo -> Service -> Runtime -> API -> UI` 路线。
- UI 不承担去重、状态机或历史追踪。
- 复盘生成逻辑可以继续输出 actions，但保存阶段必须把 actions 归并为 durable action items。

## Non-Goals

- 本任务不实现代码。
- 不改变复盘 Markdown 生成逻辑。
- 不引入外部任务管理系统或账号体系。
- 不新增 Agent 自主执行行动项。
- 不做提醒/自动通知，只预留 due date 和 overdue 计算。

## Proposed Backend Contract

### 1. ReviewActionStatus

保留当前四态，后端增加状态流转规则：

```text
todo -> doing
todo -> dropped
todo -> done
doing -> done
doing -> dropped
doing -> todo
done -> doing     // 允许复盘验证后重开，必须有 reason
dropped -> todo   // 允许恢复，必须有 reason
dropped -> doing  // 允许恢复并立即推进，必须有 reason
```

禁止：

- `done -> todo` 直接回退；必须先 `done -> doing`，因为完成后的再处理意味着重开。
- 同状态无意义 patch，除非同时更新 `nextAction`、owner、due date 或 evidence refs。
- 无 action item 的 patch 返回 `validation` error。

状态语义：

- `todo`：已确认要做，但未开始。
- `doing`：正在推进，需要出现在高优先工作视图。
- `done`：已完成当前 nextAction，等待下一轮复盘验证效果。
- `dropped`：明确放弃或不再适用，必须保留 reason。

### 2. ReviewActionItem Fields

建议在后端实现阶段扩展为兼容旧字段的结构：

```ts
interface ReviewActionItem {
  id: string;
  canonicalId: string;
  duplicateOf?: string;
  dedupeKey: string;
  sourceReviewIds: string[];
  title: string;
  status: ReviewActionStatus;
  priority: "high" | "medium" | "low";
  owner: {
    type: "creator" | "agent" | "system";
    id: string;
    label: string;
  };
  delegatedAgentId?: string;
  dueDate?: string;       // YYYY-MM-DD, local-first date
  dueState?: "none" | "upcoming" | "due_soon" | "overdue";
  evidenceRefs: EvidenceRef[];
  relatedType?: EvidenceRef["type"]; // compatibility only
  relatedId?: string;                 // compatibility only
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  droppedAt?: string;
}
```

兼容策略：

- 旧 `relatedType / relatedId` 继续保留一个主关联，用于兼容旧 UI。
- 新 `evidenceRefs` 是权威来源；如果存在 `relatedType / relatedId`，应同步塞入 `evidenceRefs`。
- `canonicalId` 对 canonical action 等于自身 `id`。
- duplicate 记录可以不作为独立活跃 action 展示，但必须可审计。

### 3. Action History

新增 durable history 概念，建议实体名：

```ts
interface ReviewActionHistoryEvent {
  id: string;
  actionItemId: string;
  eventType:
    | "created"
    | "deduplicated"
    | "status_changed"
    | "owner_changed"
    | "due_date_changed"
    | "evidence_linked"
    | "next_action_changed"
    | "reopened"
    | "dropped"
    | "completed";
  actor: {
    type: "creator" | "agent" | "system";
    id: string;
    label: string;
  };
  from?: unknown;
  to?: unknown;
  reason?: string;
  reviewId?: string;
  evidenceRefs?: EvidenceRef[];
  traceId: string;
  occurredAt: string;
}
```

规则：

- 所有创建、去重、状态变化、负责人变化、截止时间变化、证据变化都写 history event。
- `done -> doing`、`dropped -> todo/doing` 必须写 `reason`。
- `saveReview` 触发去重时，对 canonical action 写 `deduplicated` event，并记录新的 `reviewId` 和 evidence refs。
- History 是审计事实，不被 UI 删除或覆盖。

### 4. Owner Rules

参考 Linear 的单一主负责人 + agent delegation 模式：

- 每个行动项必须有一个主负责人 owner。
- 默认 owner：
  - `lead` 相关行动：`creator`，label 可为 `创作者` 或未来账号名。
  - 系统生成但没有明确人类动作：`system`，但必须在 UI 中显示为“待分配”。
  - agent 生成建议不能默认由 agent 负责执行；agent 可以作为 `delegatedAgentId`，主 owner 仍应可追责。
- 未来 API 更新 owner 时必须写 `owner_changed` history。
- owner 不存在或为空时，Service 返回 validation error；旧数据迁移可填默认 `creator:self`。

### 5. Due Date Rules

建议用 `dueDate: YYYY-MM-DD`，先不使用具体时分秒，避免本地时区和日历视图复杂度。

默认 due date：

- `high`：保存复盘后的 3 天内。
- `medium`：保存复盘后的 7 天内。
- `low`：保存复盘后的 14 天内。
- 月复盘生成的战略动作可以延长到 30 天，但必须可配置。

dueState 计算：

- `none`：无 dueDate。
- `upcoming`：距离 dueDate 超过 7 天。
- `due_soon`：距离 dueDate 小于等于 7 天且未过期。
- `overdue`：今天晚于 dueDate 且 status 不在 `done / dropped`。

排序建议：

1. overdue
2. due_soon
3. priority high -> medium -> low
4. status doing -> todo -> dropped -> done
5. updatedAt desc

### 6. Evidence Link Rules

权威字段：`evidenceRefs: EvidenceRef[]`。

规则：

- 系统生成行动项必须至少有 1 个 evidence ref，除非行动类型是“补采数据 / 补证据”。
- Evidence refs 可指向：
  - `content`
  - `platform_version`
  - `metric_snapshot`
  - `review`
  - `action_item`
  - `lead`
- Service 必须验证 ref type 合法；如果 repo 能按 type 查询，也应验证 id 存在。
- 多证据 action 的 `relatedType / relatedId` 使用第一条主证据，仅作兼容。
- Action history 里的 `evidence_linked` 应记录新增/移除证据。
- 不允许 UI 传入任意无验证 evidence refs 后直接持久化。

### 7. Dedupe Rules

目标：同一经营动作跨复盘出现时合并为 canonical action，同时保留每次出现的历史。

生成 `dedupeKey`：

```text
normalize(title) + "|" + normalizedEvidenceKey + "|" + actionCategory
```

建议细节：

- `normalize(title)`：
  - trim
  - lower-case ASCII
  - 去掉连续空白
  - 中文不做分词，先保留原字面。
- `normalizedEvidenceKey`：
  - evidenceRefs 按 `type:id` 排序后 join。
  - 如果没有 evidenceRefs，用 `relatedType:relatedId`。
  - 如果仍没有证据，只允许进入 `needs_evidence` 类行动，不能与普通行动合并。
- `actionCategory`：
  - 从 report action id 或 title 推断，例如 `publish_cadence`、`lead_followup`、`content_reuse`、`data_recovery`。
  - 后续可在 review generator 输出结构化 category。

保存复盘时的去重策略：

1. 生成 candidate action。
2. 计算 `dedupeKey`。
3. 查找 canonical action：
   - `canonicalId = id`
   - `status` 不在 `done / dropped` 时，直接复用 canonical。
   - `done` 且新复盘再次出现：创建 `reopened` history，但默认不自动改成 `doing`；状态回到 `todo` 需要 Orchestrator 决策。
   - `dropped` 且新复盘再次出现：创建新的 canonical 或恢复旧 canonical 需要产品决策。建议默认创建新的 canonical，并把旧 action 标为 related evidence。
4. 如果复用 canonical：
   - 不新建活跃 action。
   - 追加 `sourceReviewIds`。
   - merge evidenceRefs。
   - 如果 priority 更高，升级 priority 并写 history。
   - 更新 `updatedAt`。
   - 写 `deduplicated` history event。
5. 如果没有 canonical：
   - 创建新 action。
   - 写 `created` history event。

Open question:

- `done` 后再次出现，是自动 reopen 还是只追加复盘历史？建议主会话决定。Explorer 建议默认不自动 reopen，避免完成事项被系统反复打回。

### 8. API Contract Proposal

保持现有端点，扩展 request body：

```ts
interface ActionItemPatchRequest {
  id: string;
  status?: ReviewActionStatus;
  nextAction?: string;
  owner?: ReviewActionItem["owner"];
  delegatedAgentId?: string | null;
  dueDate?: string | null;
  evidenceRefs?: EvidenceRef[];
  reason?: string;
  actor?: {
    type: "creator" | "agent" | "system";
    id: string;
    label: string;
  };
}
```

Service 规则：

- patch 至少包含一个可更新字段。
- 状态变化走状态机校验。
- owner / dueDate / evidenceRefs 更新分别写 history。
- actor 缺省为 `{ type: "creator", id: "self", label: "创作者" }`，但 Runtime 可覆盖。
- 返回值建议包含 `{ actionItem, historyEventIds, traceId }`。

新增可选查询端点：

- `GET /api/self-media/action-items?status=&owner=&dueState=&reviewId=`
- `GET /api/self-media/action-items/:id/history`

如果暂不新增端点，也应在 dashboard snapshot 里提供 action history 摘要或 action-level `historyCount`。

### 9. Repo / Persistence Proposal

当前 repo 是 entity store 风格，后端实现可以先用两个集合：

- `actionItems`
- `actionItemHistory`

索引建议：

- `dedupeKey`
- `canonicalId`
- `status`
- `owner.id`
- `dueDate`
- `updatedAt`

迁移策略：

- 旧 action item 读取时补默认：
  - `canonicalId = id`
  - `dedupeKey = normalize(title) + "|" + relatedType/relatedId`
  - `sourceReviewIds = reviewId ? [reviewId] : []`
  - `owner = creator:self`
  - `evidenceRefs = relatedType/relatedId ? [{ type: relatedType, id: relatedId }] : []`
  - `createdAt = updatedAt`
- 首次更新旧 action 时补写一条 `created` 或 `migrated` history event。

### 10. Error Handling

遵循项目错误分类：

- validation：
  - action not found
  - invalid status transition
  - missing reason for reopen/drop recovery
  - owner missing
  - invalid dueDate format
  - invalid evidence ref type/id
- persistence：
  - upsert action/history failed
- unknown：
  - unexpected exception

日志事件建议：

- `self_media.action_item_created`
- `self_media.action_item_deduplicated`
- `self_media.action_item_status`
- `self_media.action_item_owner`
- `self_media.action_item_due_date`
- `self_media.action_item_evidence`

### 11. Acceptance Tests for Implementation Task

后续 Worker 实现时至少补以下 contract tests：

1. `saveReview` repeated weekly save deduplicates active action items and appends `sourceReviewIds`.
2. duplicate action writes `deduplicated` history event with review id and evidence refs.
3. generated action item includes default owner and dueDate.
4. action with multiple evidence refs preserves all refs and keeps compatibility `relatedType / relatedId`.
5. illegal status transition rejects with validation error.
6. `done -> doing` without reason rejects.
7. `done -> doing` with reason writes `reopened` or `status_changed` history.
8. owner update writes `owner_changed` history.
9. dueDate update computes dueState and writes history.
10. dashboard snapshot exposes deduped canonical action list and does not lose saved review action linkage.
11. old action item records without new fields still read through compatibility defaults.

### 12. Implementation Plan for Next Worker

Suggested route:

1. Types:
   - Extend `ReviewActionItem`.
   - Add `ReviewActionHistoryEvent`.
   - Extend `ActionItemPatchRequest`.
2. Repo:
   - Add list/upsert helpers for action history if needed.
   - Add lookup by dedupeKey if local entity API supports it.
3. Service:
   - Add dedupe key builder.
   - Add status transition guard.
   - Add default owner/dueDate/evidenceRefs builder.
   - Update `saveReview` to canonicalize action items.
   - Update `updateActionItem` to patch fields and write history.
4. Runtime / API:
   - Preserve existing endpoint.
   - Return expanded action item and trace.
5. Tests:
   - Add contract tests above.
6. UI:
   - After backend lands, remove UI-only duplicate merge if backend returns canonical list.

## Changed Files

- Added `docs/handoffs/REVIEW-ACTION-010-worker-handoff.md`

No core backend files were modified.

## Verification

- `git diff --check`: PASS

No typecheck or harness run was required for this spec-only handoff, but they can be run by Orchestrator if desired.

## Known Issues

- `docs/task-board.md` does not yet list `REVIEW-ACTION-010`; Orchestrator should decide whether to add a formal task board row before implementation.
- Current working tree contains many unrelated dirty files from previous/parallel work. This Explorer did not modify or revert them.
- The dedupe behavior for completed actions that reappear in a later review needs Orchestrator product decision:
  - default no auto-reopen, only append history;
  - or auto-reopen to `todo`;
  - or create a new canonical action linked to the old completed one.

## Next Recommendation

Create a backend Worker task, tentatively `REVIEW-ACTION-BACKEND-011`, with allowed files:

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/repo/sqlite-self-media-repo.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/action-items/route.ts`
- `tests/self-media-contract.test.ts`

Acceptance:

- `npm run test:self-media`
- `npm run typecheck`
- `npm run verify:harness`

## Orchestrator Decision Required

Yes, before implementation:

- Decide completed-action recurrence behavior.
- Decide whether `dropped` recurring action creates a new canonical action or recovers the old one.
- Decide whether dueDate defaults are fixed constants or moved to Config.
