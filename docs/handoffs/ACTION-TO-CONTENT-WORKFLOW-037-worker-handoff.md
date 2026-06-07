# ACTION-TO-CONTENT-WORKFLOW-037 Worker Handoff

## Task

ACTION-TO-CONTENT-WORKFLOW-037

## Completed

- Added a service-owned `createContentFromActionItem` workflow that converts a manually selected internal action item into a content draft plus publish queue item plus platform version.
- Added trusted evidence enforcement before conversion:
  - current post-import suggestion evidence must still exist;
  - metric/content evidence must be trusted creator-center content-level evidence;
  - untrusted manual evidence, stale suggestion ids, and user-excluded content are blocked.
- Added idempotent action-to-content behavior:
  - repeated conversion returns the existing content, platform version, and queue item;
  - action item records `contentDraftId`, `platformVersionId`, `publishQueueItemId`, `contentWorkflowStatus`, and `contentWorkflowUpdatedAt`.
- Added `POST /api/self-media/action-items/content` for the manual UI action.
- Enhanced the dashboard internal action item panel with a safe "生成排期草稿" action and linked content/version status.
- Kept generated workflow content visible to Content/Calendar pages by including action-linked content in the dashboard content management visible set, without adding it to trusted review metrics or post-import suggestions.
- Tightened daily self-media ops UI redaction for sensitive command flags such as `--token=...`, discovered while running the required verification.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/action-items/content/route.ts`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/generated/template-doctor-report.md` refreshed by `npm run verify:harness`

## Tests Added

- Trusted post-import action item can convert to scheduled content and calendar entry.
- Repeated action-to-content conversion is idempotent.
- Untrusted manual evidence cannot convert to content.
- User-excluded/stale post-import evidence cannot convert to content.
- Existing daily ops UI redaction test now passes for sensitive command flags.

## Verification

- `npm run test:self-media` PASS
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS
- Screenshot saved: `.local/action-to-content-workflow-037.png`

## Boundary Checks

- Did not add a new platform.
- Did not touch or restore WeChat official account workflow.
- Did not auto-publish or call any real platform API.
- Did not open real platform login.
- Did not save Bilibili account-level metrics.
- Did not delete the DB.
- UI shows only safe IDs/references and does not display raw payload, cookie, token, headers, comments, or danmu.

## Notes

- The dashboard `contents` field now includes action-linked drafts for content/calendar operations while trusted review totals still use trusted creator-center snapshots only.
- The operating DB may already contain unrelated prior-task changes; this task did not revert existing dirty worktree files.

## Main Session Decision

Yes. Orchestrator should confirm whether the default UI action should keep creating a scheduled placeholder immediately, or split into two buttons later: "生成内容草稿" and "生成排期草稿".
