# REVIEW-ACTION-BACKEND-011: Deduped Review Actions And History

## Goal

Upgrade review action items from one-off report outputs into durable, deduped, auditable operating actions with owner, due date, evidence, and history.

This spec converts the accepted `REVIEW-ACTION-010` Explorer handoff into an implementation-ready backend contract.

## Source Of Truth

- Input handoff: `docs/handoffs/REVIEW-ACTION-010-worker-handoff.md`.
- Orchestrator acceptance: `docs/handoffs/BACKEND-PRACTICAL-011-orchestrator-plan.md`.
- Existing baseline specs: `docs/product-specs/review-actions-001.md`, `docs/product-specs/ui-review-actions-002.md`, `docs/product-specs/v1.5-publish-data-loop.md`.
- Backend Service owns dedupe, status transitions, owner defaults, due date defaults, evidence validation, and history creation.

Accepted Orchestrator decisions:

- A completed action that appears again in a later review does not auto-reopen; append history and evidence only.
- A dropped action that appears again creates a new canonical action by default and links the old action as context.
- Due date defaults live in Config, not hard-coded Service logic.

## Product Problem

Saved reviews can repeatedly generate similar action items. Without backend canonicalization, the UI becomes noisy and cannot reliably show what is active, who owns it, when it is due, or why its status changed.

## Non-Goals

- Do not implement reminders or notifications.
- Do not introduce a third-party task manager.
- Do not make UI responsible for dedupe, state machine rules, or history.
- Do not let agent-generated suggestions assign execution ownership to an agent by default.
- Do not delete historical action items or review evidence.

## Action Status Contract

Keep current statuses:

```text
todo, doing, done, dropped
```

Allowed transitions:

```text
todo -> doing
todo -> dropped
todo -> done
doing -> done
doing -> dropped
doing -> todo
done -> doing
dropped -> todo
dropped -> doing
```

Rules:

- `done -> doing` means reopen and requires `reason`.
- `dropped -> todo` and `dropped -> doing` mean recover and require `reason`.
- `done -> todo` is not allowed directly.
- Same-status patch is valid only when it updates another meaningful field, such as `nextAction`, owner, due date, or evidence refs.

## Action Item Contract

Future implementation should extend `ReviewActionItem` while preserving compatibility fields:

```ts
interface ReviewActionItem {
  id: string;
  canonicalId: string;
  duplicateOf?: string;
  dedupeKey: string;
  sourceReviewIds: string[];
  title: string;
  status: "todo" | "doing" | "done" | "dropped";
  priority: "high" | "medium" | "low";
  owner: {
    type: "creator" | "agent" | "system";
    id: string;
    label: string;
  };
  delegatedAgentId?: string;
  dueDate?: string;
  dueState?: "none" | "upcoming" | "due_soon" | "overdue";
  evidenceRefs: EvidenceRef[];
  relatedType?: EvidenceRef["type"];
  relatedId?: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  droppedAt?: string;
}
```

Compatibility:

- `relatedType` and `relatedId` remain compatibility fields only.
- `evidenceRefs` is authoritative.
- If old data has `relatedType/relatedId`, Service should read it as the first evidence ref.
- `canonicalId = id` for canonical active actions.

## History Contract

Add a durable history event concept:

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

Rules:

- Create, dedupe, status, owner, due date, evidence, and next-action changes write history.
- Reopen/recover transitions require reason and write history.
- History is audit data and must not be overwritten by UI updates.

## Dedupe Contract

Canonical dedupe key:

```text
normalize(title) + "|" + normalizedEvidenceKey + "|" + actionCategory
```

Rules:

- Normalize title by trimming, collapsing whitespace, and lower-casing ASCII.
- Build evidence key from sorted `type:id` refs.
- If no evidence exists, only a `needs_evidence` action category may be created.
- Active canonical actions (`todo`, `doing`) are reused.
- When active action is reused, append `sourceReviewIds`, merge evidence refs, optionally upgrade priority, update `updatedAt`, and write `deduplicated` history.
- If the matching action is `done`, do not auto-reopen. Append source review/evidence/history only.
- If the matching action is `dropped`, create a new canonical action by default and link the dropped action as evidence/context.

## Owner And Due Date Defaults

Owner:

- Every action must have one primary owner.
- Default owner for creator-executable work: `{ type: "creator", id: "self", label: "创作者" }`.
- System-owned generated work may use `{ type: "system", id: "self-media", label: "待分配" }` only when the action is truly unassigned.
- Agent suggestions do not make the agent responsible by default; agents may be delegated contributors.

Due date defaults live in Config:

| Priority/type | Default |
| --- | --- |
| high | 3 days |
| medium | 7 days |
| low | 14 days |
| monthly strategic action | 30 days |

Due state:

```text
none, upcoming, due_soon, overdue
```

`overdue` applies only when today is later than due date and status is not `done` or `dropped`.

## Evidence Rules

- `evidenceRefs` is authoritative.
- System-generated actions need at least one evidence ref unless their category is `needs_evidence`.
- Allowed evidence types include content, platform version, metric snapshot, review, action item, and lead.
- Service validates evidence type and, where repo lookup is available, id existence.
- Multi-evidence actions preserve all refs; compatibility fields use the first primary ref.

## Allowed Implementation Files

For `REVIEW-ACTION-BACKEND-011`, suggested allowed files:

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/config/*`
- `src/domain/self-media/repo/sqlite-self-media-repo.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/action-items/route.ts`
- `tests/self-media-contract.test.ts`

Do not edit import preview providers, content workflow confirmation, or UI screens in the same Worker unless the Orchestrator explicitly expands scope.

## Acceptance Tests

Implementation acceptance should include:

- Repeated `saveReview` dedupes active action items and appends source review ids.
- Deduped action writes a `deduplicated` history event with review id and evidence refs.
- Generated action includes default owner and Config-derived due date.
- Multiple evidence refs are preserved while `relatedType/relatedId` remain compatible.
- Illegal status transition returns validation error.
- `done -> doing` without reason is rejected.
- `done -> doing` with reason writes reopen/status history.
- Completed action reappearing in a later review does not auto-reopen.
- Dropped action reappearing creates a new canonical action linked to the old one.
- Owner update writes history.
- Due date update recomputes due state and writes history.
- Dashboard/review snapshot exposes canonical actions without losing saved review linkage.
- Old action records without new fields read through compatibility defaults.

Recommended commands:

```text
npm run test:self-media
npm run typecheck
npm run verify:harness
git diff --check
```

## Open Decisions

- Exact category vocabulary for `actionCategory` should be finalized when review generator output becomes structured.
- Should action history have a dedicated API route immediately, or first appear as summary fields in dashboard/review snapshots?
- Should `needs_evidence` be a category string only, or become a first-class action type?

## Rollback Notes

If dedupe or history introduces regressions, keep old action items readable through compatibility defaults and disable canonicalization in `saveReview` while preserving already written history events.
