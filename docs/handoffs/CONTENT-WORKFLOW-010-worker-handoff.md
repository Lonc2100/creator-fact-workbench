# CONTENT-WORKFLOW-010 Worker Handoff

## Task ID

CONTENT-WORKFLOW-010

## Role And Scope

Explorer / Spec only.

This round整理从 `选题 -> 内容草稿 -> 多平台版本 -> 排期 -> 发布确认 -> 发布记录` 的实际使用流程，并形成后端任务规格。不修改核心后端代码。

Explicitly not changed:

- Types
- Repo
- Service
- Runtime
- API

## Completed Work

- Read `AGENTS.md`.
- Read `docs/handoffs/README.md` and confirmed Short Chat Protocol.
- Read core context:
  - `docs/context/index.md`
  - `docs/context/current-state.md`
  - `docs/context/engineering-principles.md`
  - `docs/context/decisions.md`
  - `ARCHITECTURE.md`
  - `docs/mainline-framework.md`
  - `docs/task-board.md`
  - `docs/spec-governance.md`
  - `docs/workflow-boundaries.md`
  - `docs/architecture/current-stage.md`
  - `docs/exec-plans/active/v1.5-backend-mainline.md`
  - `docs/ui-harness/PAGE_BOUNDARIES.md`
  - `docs/ui-harness/ARCHITECTURE.md`
- Read existing feature specs:
  - `docs/product-specs/idea-001.md`
  - `docs/product-specs/content-001.md`
  - `docs/product-specs/publish-001.md`
  - `docs/product-specs/v1.5-publish-data-loop.md`
  - `docs/product-specs/calendar-editor-001.md`
  - `docs/product-specs/review-003.md`
- Inspected current entities and use cases in:
  - `src/domain/self-media/types/self-media-types.ts`
  - `src/domain/self-media/service/self-media-service.ts`
  - `src/domain/self-media/runtime/self-media-runtime.ts`
  - `src/domain/self-media/repo/sqlite-self-media-repo.ts`
  - `src/app/api/self-media/**`
- Checked external mature solutions on GitHub / vendor-reference path and evaluated them on applicability, recency, authority, and popularity.

## Changed Files

- Added `docs/handoffs/CONTENT-WORKFLOW-010-worker-handoff.md`.

No core backend files were modified by this task.

## External Reference Scan

GitHub API checked on 2026-06-03.

| Reference | Applicability | Recency | Authority | Popularity | Notes For This Project |
| --- | --- | --- | --- | --- | --- |
| Postiz / `gitroomhq/postiz-app` | High for publish calendar, multi-platform scheduling, agentic social workflow | Updated/pushed 2026-06-02 / 2026-06-03 window | Open-source product focused on social media operations | 31,419 stars / 5,790 forks | Best reference for content queue, schedule, publish lifecycle, and future AI-assisted posting. |
| Mixpost / `inovector/mixpost` | High for multi-platform scheduling and analytics feedback | Updated 2026-06-03, pushed 2026-03-16 | Focused social media scheduling product | 3,303 stars / 495 forks | Good reference for lightweight calendar cards, platform accounts, publishing status, and analytics recovery. |
| Directus / `directus/directus` | Medium-high for content tables, status fields, revisions, admin API style | Updated/pushed 2026-06-03 | Mature headless CMS / data platform | 36,064 stars / 4,797 forks | Good reference for content-management structure, schema discipline, auditability, and admin-side CRUD. |
| Baserow / `baserow/baserow` | Medium for spreadsheet-like operational tables and simple workflow states | Updated/pushed 2026-06-03 | Mature open-source no-code database | 4,944 stars / 623 forks | Good reference for simple table-first UX and creator-friendly manual operations. |
| n8n / `n8n-io/n8n` | Medium for background jobs and connector execution history | Updated/pushed 2026-06-03 | Mature workflow automation project | 190,901 stars / 58,234 forks | Keep as provider/automation-run reference, not as the primary content lifecycle model. |

Local project already records the same reference direction in `docs/workflow-boundaries.md`, `docs/ui-harness/ARCHITECTURE.md`, and `docs/references/vendor/REFERENCE_MANIFEST.md`.

## Existing Implementation Map

The repository already has most nouns needed for the workflow:

- `TopicIdea`
  - status: `new | selected | discarded | produced`
  - current flow: manual/imported idea can become draft content.
- `ContentItem`
  - status: `idea | draft | scheduled | published | reviewed`
  - current role: root content record.
- `ContentPlatformVersion`
  - status: `draft | needs_review | scheduled | published | failed | blocked`
  - fields: title, body, script, coverNote, scheduledAt, publishedAt, checklist, failureReason, nextAction.
- `PublishCalendarItem`
  - derived from platform versions.
- `PublishRecord`
  - created when platform version becomes `published`, `failed`, or `blocked`.
- `PublishQueueItem`
  - older/lightweight queue model with status `draft -> needs_review -> queued -> scheduled -> publishing -> published`.
- `MetricSnapshot`
  - recovery record after publish.
- `SavedReview` and `ReviewActionItem`
  - downstream review and action loop.

Current important use cases:

- `createIdea`
- `updateIdeaStatus`
- `convertIdeaToContent`
- `upsertPlatformVersion`
- `patchPlatformVersion`
- `calendar`
- `upsertMetricSnapshot`
- `saveReview`
- `updatePublishQueueStatus`

## Real Product Workflow Spec

### 1. Topic Planning

User goal:

- Capture a topic from manual thinking, imported performance signal, competitor observation, or review action.
- Decide whether it deserves production.

Source of truth:

- `TopicIdea`.

Expected states:

```text
new -> selected -> produced
new -> discarded
selected -> discarded
```

Required operations:

- Create idea.
- Update idea status.
- Add rationale, source, target platform(s), confidence, next action.
- Convert selected idea into a content draft.

Current state:

- Basic create/update/convert exists.

Gap:

- Idea currently has one `platform`; real workflow may need target platform set or default platform plus future expansion.
- Idea-to-content conversion creates one platform version. Multi-platform fan-out is not a first-class use case yet.

### 2. Content Draft

User goal:

- Turn selected topic into one reusable content asset.
- Keep platform-independent planning separate from platform-specific copy.

Source of truth:

- `ContentItem`.

Recommended lifecycle:

```text
draft -> in_production -> versioning -> scheduled -> published -> reviewed
draft -> blocked
blocked -> draft
```

Current state:

- `ContentItem.status` is simpler: `idea | draft | scheduled | published | reviewed`.
- Service creates draft content from idea.

Gap:

- No explicit production-stage checklist at content root level.
- Content root does not clearly separate concept, outline, assets, and reusable source material from platform-specific body/script.
- Root content state is not synchronized from platform-version state in a durable service-owned way.

### 3. Multi-platform Versions

User goal:

- Create one version per platform from a content draft.
- Track platform-specific title/body/script/cover/checklist/status.

Source of truth:

- `ContentPlatformVersion`.

Recommended lifecycle:

```text
draft -> needs_review -> scheduled -> published
draft -> needs_review -> blocked -> needs_review
scheduled -> failed -> needs_review
scheduled -> blocked -> needs_review
```

Current state:

- This lifecycle mostly exists.
- `patchPlatformVersion` rejects illegal transitions.
- Editor/calendar API already uses platform version as the operational unit.

Gap:

- There is no bulk `create versions from content` use case.
- No explicit uniqueness rule for `(contentId, platform, accountId?)`.
- Checklist is generic; platform-specific requirements are not configurable yet.
- `needs_review -> scheduled` currently allows scheduling even if checklist is incomplete; that may be acceptable for soft validation, but the product spec should decide.

### 4. Scheduling

User goal:

- Place platform versions on calendar.
- Reschedule with clear status and blockers.

Source of truth:

- `ContentPlatformVersion.scheduledAt`.
- `PublishCalendarItem` is derived, not persisted.

Recommended behavior:

- Calendar reads platform versions.
- Drag/drop or schedule form patches `scheduledAt`.
- Moving to scheduled should preserve an audit/log trace.
- Date/time changes should not create publish records.

Current state:

- `calendar()` derives items from platform versions.
- PATCH can update `scheduledAt`.

Gap:

- No persisted schedule-change history besides logs.
- No timezone/account/campaign metadata.
- No batch scheduling for multiple platform versions of one content item.

### 5. Publish Confirmation

User goal:

- Confirm that a platform version was actually published, failed, or blocked.
- Avoid pretending live API publishing exists before connector support is ready.

Source of truth:

- `ContentPlatformVersion.status`
- `ContentPlatformVersion.publishedAt`
- `PublishRecord`

Recommended confirmation states:

```text
scheduled -> published
scheduled -> failed
scheduled -> blocked
failed -> needs_review
blocked -> needs_review
```

Important product rule:

- "发布确认" is a human or provider-confirmed event.
- It is not the same as schedule placement.

Current state:

- `patchPlatformVersion` creates a `PublishRecord` when status becomes `published`, `failed`, or `blocked`.

Gap:

- `PublishRecord.status` includes `confirmed`, but current service never appears to create that status.
- No explicit `confirmPublish` use case separate from generic patch.
- No dedupe/idempotency rule for repeated confirmation clicks.
- No fields for platform URL, external post ID, manual confirmer, provider run ID, or evidence attachment.

### 6. Publish Record

User goal:

- Keep a durable event ledger for what happened on each platform.
- Feed review, metrics recovery, and later automation audit.

Source of truth:

- `PublishRecord`.

Recommended fields for next backend task:

- `id`
- `platformVersionId`
- `contentId`
- `platform`
- `accountId?`
- `status: published | failed | blocked | confirmed`
- `happenedAt`
- `platformPostId?`
- `platformUrl?`
- `confirmationSource: manual | provider | import`
- `providerRunId?`
- `confirmedBy?`
- `note?`
- `traceId`

Current state:

- Minimal `PublishRecord` exists and is persisted.

Gap:

- Needs stronger semantics and idempotency before real publish connectors.

## Proposed Backend Task Specs

### CONTENT-WORKFLOW-011: Workflow Contract Spec

Type:

- Product spec / no code or minimal docs.

Goal:

- Freeze source-of-truth rules for the full lifecycle.

Acceptance:

- Add `docs/product-specs/content-workflow-011.md`.
- Spec states which entity owns each workflow stage.
- Spec resolves whether `PublishQueueItem` remains active or becomes legacy/compatibility.
- Spec defines publish confirmation vs schedule placement.

### CONTENT-WORKFLOW-012: Content Root Production State

Allowed layer route:

```text
Types -> Repo -> Service -> Runtime -> API -> UI
```

Goal:

- Make root content represent reusable production work, while platform versions represent platform-specific work.

Candidate changes:

- Add root content production fields or a separate production checklist.
- Add service rule for deriving/setting root status from platform version aggregate status.

Acceptance:

- Contract test covers idea -> content draft -> multi-platform versions.
- Illegal root state jumps rejected by Service.
- Existing import and review tests still pass.

### CONTENT-WORKFLOW-013: Multi-platform Version Fan-out

Goal:

- Create/update multiple platform versions from one content item in one service-owned operation.

Candidate operation:

```text
createPlatformVersionsForContent(contentId, platforms[], defaults?)
```

Acceptance:

- One content item can create Douyin/Xiaohongshu/WeChat versions without duplicate platform records.
- Existing version editor still saves one version at a time.
- Calendar shows all scheduled versions.

### CONTENT-WORKFLOW-014: Schedule And Reschedule Audit

Goal:

- Make schedule changes durable enough for review/debugging without turning calendar items into a second source of truth.

Candidate changes:

- Add schedule-change log/event record or structured audit payload.
- Keep `PublishCalendarItem` derived from platform versions.

Acceptance:

- Changing `scheduledAt` does not create a publish record.
- Schedule changes are traceable through logs/audit.
- Calendar filter tests continue to pass.

### CONTENT-WORKFLOW-015: Explicit Publish Confirmation

Goal:

- Separate publish confirmation from generic platform-version patch.

Candidate operation:

```text
confirmPlatformVersionPublish({
  platformVersionId,
  status,
  happenedAt,
  platformPostId?,
  platformUrl?,
  confirmationSource,
  note?
})
```

Acceptance:

- `scheduled -> published/failed/blocked` creates exactly one idempotent publish record per confirmation event key.
- Repeated manual confirmation does not create accidental duplicates.
- `publishedAt` is set from confirmation time.
- Failure/block records keep actionable note or reason.

### CONTENT-WORKFLOW-016: Publish Record Enrichment

Goal:

- Prepare publish records for future provider publishing and imported platform IDs.

Candidate changes:

- Add optional external IDs and URL.
- Add confirmation source.
- Add provider run relation.

Acceptance:

- Manual confirmation works without live provider.
- Future provider confirmation can write the same internal record shape.
- Review can cite publish records as evidence.

## Recommended User-Facing Flow

Daily creation flow:

```text
选题池
  -> 选择选题
  -> 转内容草稿
  -> 补内容根信息
  -> 生成/新增多平台版本
  -> 分平台编辑标题/正文/脚本/封面/checklist
  -> 标为待审核
  -> 排期
  -> 发布前确认
  -> 人工发布或未来 Provider 发布
  -> 回填发布确认
  -> 生成发布记录
  -> 后续导入指标快照
  -> 周/月复盘引用内容、版本、发布记录、指标和行动项
```

Do not collapse:

- 内容草稿 and 平台版本
- 排期 and 发布确认
- 发布确认 and 指标回收
- 发布记录 and 指标快照

## Risk Notes

- `PublishQueueItem` and `ContentPlatformVersion` overlap. Before adding more backend code, Orchestrator should decide whether queue remains a lightweight legacy lane or is replaced by platform-version lifecycle for daily operations.
- Current `PublishRecord.status = confirmed` is semantically unclear because publish records are already confirmation-like events. This should be resolved before API/UI expansion.
- Current `ContentItem.platform` is awkward for multi-platform content. It may remain a primary/default platform, but the spec should name that explicitly.
- Real publishing APIs should stay deferred. Manual confirmation and provider-neutral records are enough for the next stage.
- No batch deletion was performed.

## Verification Commands And Results

- `git diff --check -- docs/handoffs/CONTENT-WORKFLOW-010-worker-handoff.md` - PASS.
- `npm run typecheck` - PASS.

`npm run verify:harness` was not run because this is an Explorer/Spec-only handoff and no core backend or UI implementation files were modified by this task.

## Known Issues

- `CONTENT-WORKFLOW-010` is not currently listed in `docs/task-board.md`. This handoff treats it as a requested Explorer/Spec task from the user.
- Worktree had many pre-existing modified and untracked files before this handoff was created. This task intentionally only adds the requested handoff file.

## Next Recommendation

Orchestrator should review this handoff and choose one path:

1. Add a durable product spec first: `CONTENT-WORKFLOW-011`.
2. If product decisions are already accepted, start backend implementation in fixed layer order with `CONTENT-WORKFLOW-012`.

Recommended decision before implementation:

- Make `ContentPlatformVersion` the primary operational lifecycle for platform-specific publishing.
- Treat `PublishQueueItem` as compatibility/summary unless there is a clear UI reason to keep two state machines.
- Add explicit publish confirmation before connecting live publishing providers.

## Orchestrator Decision Required

Yes.
