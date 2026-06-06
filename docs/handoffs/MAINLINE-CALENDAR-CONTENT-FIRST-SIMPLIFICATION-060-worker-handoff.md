# MAINLINE-CALENDAR-CONTENT-FIRST-SIMPLIFICATION-060 Worker Handoff

## Runtime

- Started: 2026-06-06
- Finished: 2026-06-06
- Workload class: M

## Mature Reference

- Reviewed current scheduling references before implementation:
  - Hootsuite publishing planner/calendar: multi-account post creation, scheduling, and calendar management model.
  - Postiz: active open-source social media scheduler for multi-platform planning.
  - Existing repository Mixpost reference files under `docs/references/vendor/mixpost/`.
- Borrowed workflow shape only: content-first post planning, one calendar object representing the content, platform-specific schedule/edit details in the side panel.
- No external code copied.

## What Changed

- Changed `/calendar` card grouping from content plus time to content-first grouping:
  - default calendar cards are keyed by `contentId`;
  - a multi-platform content item renders as one card;
  - the card displays merged platform icons and a merged status note.
- Updated calendar card click behavior:
  - clicking a merged card opens a content-level schedule inspector;
  - the inspector lists each platform version for that content;
  - each platform row can edit schedule time, move draft/failed/blocked work back through legal status transitions, and manually confirm published or failed results.
- Updated `/calendar` top action:
  - main button now reads `计划新视频 / 新增排期`;
  - it keeps linking to `/content#new-video`.
- Hardened clear-future-schedules UX:
  - kept the existing non-destructive backend behavior;
  - added a browser confirmation explaining it clears future schedule times and queue entries only;
  - content, publish records, and metric snapshots are not deleted.
- Kept paused-platform boundaries:
  - `/calendar` default filters still exclude WeChat Official Account;
  - `/content` platform filter no longer shows `公众号` as a visible platform choice;
  - Bilibili account metrics remain preview-only / separate from content totals.
- Added static UI harness assertions for contentId grouping and content-level inspector.

## Files Changed

- `src/app/globals.css`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-CALENDAR-CONTENT-FIRST-SIMPLIFICATION-060-worker-handoff.md`

## Verification

- PASS: `npm run typecheck`
- PASS: `npm run test:self-media`
- PASS: `npm run test:ui-harness`
- PASS: `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- PASS: `git diff --check`
  - Existing warning only: `tsconfig.json` CRLF will be replaced by LF if Git touches it.

## Live Acceptance

Fixed entry: `http://localhost:3200/dashboard`

- `/dashboard`
  - PASS: page loaded on fixed port 3200.
  - PASS: navigation includes `/content` and `/calendar`.
  - PASS: Bilibili remains visible only as the established content/account separated surface; no account durable-total promotion was made.
- `/calendar`
  - PASS: page loaded.
  - PASS: main button shows `计划新视频 / 新增排期`.
  - PASS: visible calendar cards were content-level grouped: `cardCount=8`, `uniqueContentCount=8`.
  - PASS: merged card platform icons rendered, with a live card showing up to 4 platform icons.
  - PASS: clicking a merged card opened content schedule inspector.
  - PASS: inspector showed per-platform rows with schedule inputs and manual publish/failure confirmation buttons.
  - PASS: visible `/calendar` text did not show `公众号`.
  - PASS: clear future schedules button remained visible and non-destructive confirmation copy was added.
- `/content`
  - PASS: page loaded.
  - PASS: new-video anchor and calendar link remained available.
  - PASS: visible `/content` text did not show `公众号` after the platform filter cleanup.

## Boundary Notes

- No real platform publish API is called.
- Manual publish records remain ledger facts only and do not become trusted metric evidence.
- Future schedule cleanup remains non-destructive and does not delete content, publish records, or metric snapshots.
- WeChat Official Account/backend was not restored.
- Bilibili account-level metrics remain preview-only and were not promoted into durable content totals.
- Existing dirty/untracked worktree files outside this task were not modified or staged.

## Known Issues

- None from this worker task.
- The repository still has many unrelated dirty/untracked files from prior bundles; they remain outside this task.

## Next Recommendation

- Orchestrator can review the focused diff and commit as the 060 calendar content-first simplification bundle.

## Orchestrator Decision Required

- No.
