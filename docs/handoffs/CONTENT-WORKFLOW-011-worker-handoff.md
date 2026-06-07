# CONTENT-WORKFLOW-011 Worker Handoff

## Task ID

CONTENT-WORKFLOW-011

## Scope

Implemented the backend lifecycle foundation for content-to-publish while keeping the task inside backend/API contract boundaries. No dashboard/reviews/calendar UI redesign, no import provider changes, no review action dedupe/history work, no live platform API integration, and no batch deletion.

## Completed Work

- Added explicit publish confirmation contract types:
  - `ConfirmPlatformVersionPublishRequest`
  - `ConfirmPlatformVersionPublishResult`
  - optional publish record metadata for manual/provider/import confirmation source, platform post id/url, provider run id, confirmer, and idempotency key.
- Made `ContentPlatformVersion` the primary platform publish lifecycle surface:
  - `scheduledAt` remains a scheduling field handled by platform version patch.
  - `confirmPlatformVersionPublish` is now the explicit publish confirmation entrypoint.
  - `patchPlatformVersion` no longer creates `PublishRecord` rows for `published` / `failed` / `blocked`.
- Added manual publish confirmation semantics:
  - allowed confirmation target statuses: `published`, `failed`, `blocked`;
  - transition validation reuses `platformVersionTransitions`;
  - failed/blocked confirmation requires a reason;
  - published confirmation sets `publishedAt` and marks `checklist.humanConfirmed = true`.
- Added idempotent publish record rules:
  - explicit `idempotencyKey` is honored;
  - default key is stable from platform version/status/source/platform metadata and does not depend on retry time;
  - repeated confirmation returns the same publish record and preserves the first `happenedAt`.
- Tightened platform version upsert behavior:
  - default upsert without `id` now reuses an existing `(contentId, platform)` platform version;
  - this avoids accidental duplicate platform records while still allowing multiple platform versions across different platforms for the same content.
- Exposed runtime/API path:
  - `confirmSelfMediaPlatformVersionPublish`;
  - `PATCH /api/self-media/content-versions` routes `action: "confirm_publish"` to the confirmation path and preserves existing patch behavior otherwise.
- Added contract tests for:
  - scheduling patch does not create publish records;
  - manual publish confirmation creates one idempotent publish record;
  - failed confirmation requires and records a manual failure reason;
  - platform version upsert is idempotent per content/platform.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - Added confirmation request/result types.
  - Extended `PublishRecord` with optional confirmation metadata.
- `src/domain/self-media/service/self-media-service.ts`
  - Added `confirmPlatformVersionPublish`.
  - Removed publish record creation from generic platform version patch.
  - Reused existing platform version by `(contentId, platform)` during default upsert.
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added runtime wrapper for publish confirmation.
- `src/app/api/self-media/content-versions/route.ts`
  - Added `action: "confirm_publish"` branch for explicit publish confirmation.
- `tests/self-media-contract.test.ts`
  - Added CONTENT-WORKFLOW-011 lifecycle contract coverage.

## Verification

- `npm run test:self-media` PASS
  - 31 tests passed.
- `npm run typecheck` PASS
  - `tsc --noEmit` completed successfully.
- `npm run verify:harness` PASS
  - context, arch lint, structure, references, UI harness, self-media contract, entropy, agent trajectory, and template doctor all passed.
- `git diff --check` PASS

## Boundary Checks

- Did not modify real import provider implementation for this task.
- Did not modify import preview UI for this task.
- Did not modify dashboard/reviews/calendar UI for this task.
- Did not modify review action dedupe/history.
- Did not modify publish workflow UI or live provider publishing.
- Did not add persistent repo schema tables or perform any migration; the repo stores optional fields through the existing JSON entity mechanism.
- Did not delete files.

## Known Issues / Notes

- The working tree had many pre-existing dirty and untracked files before this task began, including prior handoffs/specs and UI/import-preview changes. I did not revert or clean them.
- `npm run verify:harness` refreshes `docs/generated/template-doctor-report.md`; that file was already dirty before this task.
- API confirmation currently uses the existing content versions route with `action: "confirm_publish"`. A dedicated route can be added later if the product wants a more explicit REST surface.
- Generic `patchPlatformVersion` can still transition status according to the existing transition table, but it no longer writes `PublishRecord`; callers that need publish evidence must use explicit confirmation.

## Next Recommendation

- Orchestrator should review whether UI workers should add a small explicit publish-confirm action later.
- Future live provider publishing should call the same `confirmPlatformVersionPublish` path after provider-side success/failure, using provider-specific idempotency keys.

## Orchestrator Decision Required

No.
