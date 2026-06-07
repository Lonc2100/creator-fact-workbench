# CONTENT-WORKFLOW-011: Content To Publish Lifecycle Contract

## Goal

Freeze the operational workflow from topic idea to content draft, platform version, schedule placement, publish confirmation, publish record, metric recovery, and review.

This spec converts the accepted `CONTENT-WORKFLOW-010` Explorer handoff into an implementation-ready product contract. It intentionally separates product decisions from backend implementation.

## Source Of Truth

- Input handoff: `docs/handoffs/CONTENT-WORKFLOW-010-worker-handoff.md`.
- Orchestrator acceptance: `docs/handoffs/BACKEND-PRACTICAL-011-orchestrator-plan.md`.
- Existing baseline specs: `docs/product-specs/idea-001.md`, `docs/product-specs/content-001.md`, `docs/product-specs/publish-001.md`, `docs/product-specs/v1.5-publish-data-loop.md`, `docs/product-specs/calendar-editor-001.md`.
- `ContentPlatformVersion` is the primary operational lifecycle for platform-specific publishing.
- `PublishQueueItem` is compatibility/summary unless a later UI reason proves a separate queue state machine is still needed.

## Product Problem

The current system has the right nouns, but schedule placement, platform-version workflow, publish confirmation, and publish records can still blur together. Without a fixed contract, future backend Workers may add duplicate state machines or make publish records mean different things across features.

## Non-Goals

- Do not connect live publishing APIs.
- Do not make `PublishCalendarItem` a persisted source of truth.
- Do not add a second active queue state machine.
- Do not use generic patch operations as the only publish confirmation mechanism in future implementation.
- Do not change UI layout in the backend lifecycle implementation task unless separately approved.

## Workflow Ownership

| Stage | Source of truth | Derived or compatibility view |
| --- | --- | --- |
| Topic planning | `TopicIdea` | Topic pool UI |
| Reusable content draft | `ContentItem` | Content library row/card |
| Platform-specific draft/review/schedule/publish state | `ContentPlatformVersion` | Calendar item, editor status |
| Calendar placement | `ContentPlatformVersion.scheduledAt` | `PublishCalendarItem` |
| Publish confirmation | explicit Service operation on `ContentPlatformVersion` | Publish action in UI/API |
| Publish event ledger | `PublishRecord` | Review evidence, dashboard summary |
| Metric recovery | `MetricSnapshot` | Dashboard/review metrics |
| Review and action loop | `SavedReview`, `ReviewActionItem` | Reviews page/dashboard actions |

## State Contracts

### TopicIdea

Accepted lifecycle:

```text
new -> selected -> produced
new -> discarded
selected -> discarded
```

Future implementation may support target platform sets, but the current default platform field may remain as primary/default platform until a dedicated multi-target spec expands it.

### ContentItem

Content root represents reusable production work, not a platform-specific post.

Recommended future lifecycle:

```text
draft -> in_production -> versioning -> scheduled -> published -> reviewed
draft -> blocked
blocked -> draft
```

The current implementation may keep its simpler status values while the next Worker adds only the parts needed for version fan-out and publish confirmation. Root status should be Service-owned, not UI-derived.

### ContentPlatformVersion

Accepted operational lifecycle:

```text
draft -> needs_review -> scheduled -> published
draft -> needs_review -> blocked -> needs_review
scheduled -> failed -> needs_review
scheduled -> blocked -> needs_review
```

Service must reject illegal jumps. Scheduling is not publishing. Confirmation is not metric recovery.

### PublishCalendarItem

Calendar items are derived from platform versions. Changing `scheduledAt` must not create a publish record.

### PublishRecord

Publish records are durable events that say what happened on a platform. `PublishRecord.status = confirmed` needs semantic cleanup before expanding publish APIs. Future implementation should prefer explicit statuses:

```text
published, failed, blocked
```

If `confirmed` remains for compatibility, the implementation must state whether it means "manual/provider confirmation event" or a separate verified status.

## Publish Confirmation Contract

Scheduling and confirmation must stay separate.

Recommended operation:

```ts
confirmPlatformVersionPublish({
  platformVersionId,
  status,
  happenedAt,
  platformPostId?,
  platformUrl?,
  confirmationSource,
  providerRunId?,
  confirmedBy?,
  note?,
  traceId?
})
```

Rules:

- Valid confirmation statuses: `published`, `failed`, `blocked`.
- Confirmation source: `manual`, `provider`, or `import`.
- Confirmation sets `ContentPlatformVersion.status`.
- `published` sets `publishedAt` from `happenedAt`.
- `failed` or `blocked` must preserve a reason, failure reason, or note.
- Repeated confirmation with the same event key must be idempotent.
- Confirmation creates or updates exactly one intended publish record, not accidental duplicates.

## Allowed Implementation Files

For a future `CONTENT-WORKFLOW-011` or follow-up backend Worker, suggested allowed files are:

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/repo/sqlite-self-media-repo.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/content-versions/route.ts`
- `src/app/api/self-media/publish-records/route.ts` if such a route is approved
- `tests/self-media-contract.test.ts`

Do not edit import provider behavior, review action dedupe behavior, or UI screens in the same Worker unless the Orchestrator explicitly expands scope.

## Acceptance Tests

Implementation acceptance should include:

- Idea can become reusable content, and content can own multiple platform versions without duplicate platform records.
- Calendar reads platform versions and remains derived.
- Changing `scheduledAt` does not create a publish record.
- Illegal platform-version state jumps are rejected by Service.
- Explicit publish confirmation transitions `scheduled -> published/failed/blocked`.
- Publish confirmation creates an idempotent publish record with source, happened time, trace id, and optional platform URL/external id.
- Manual confirmation works without live provider connectors.
- Dashboard/review can still cite publish records and metric snapshots after the change.

Recommended commands:

```text
npm run test:self-media
npm run typecheck
npm run verify:harness
git diff --check
```

## Open Decisions

- Should `ContentItem.status` be expanded now, or should root status remain compatibility-only until multi-platform fan-out needs it?
- What exact idempotency key should publish confirmation use: `platformVersionId + status + happenedAt`, an explicit `traceId`, or a provider event id?
- Should `PublishRecord.status = confirmed` be removed, renamed, or retained only as compatibility?
- Does any current UI still need `PublishQueueItem` as more than a summary/legacy view?

## Rollback Notes

Workflow contract changes should be implemented through Service-owned operations. If publish confirmation creates duplicate records or ambiguous status, roll back the explicit operation and keep generic platform-version patch behavior until the status contract is corrected.
