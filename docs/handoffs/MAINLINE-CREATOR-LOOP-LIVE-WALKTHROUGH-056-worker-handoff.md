# MAINLINE-CREATOR-LOOP-LIVE-WALKTHROUGH-056 worker handoff

## Runtime

- Started: 2026-06-06T00:25:57.3539418+08:00
- Finished: 2026-06-06T00:39:13.0481305+08:00
- Elapsed: 13m 16s
- Workload class: M
- Extra-depth pass: yes, required because elapsed time was below 15 minutes. Extra pass reopened `/dashboard`, rechecked 055/056 draft retention, checked post-clear schedule state, diff scope, and static anchors for the hardening changes.

## Task

MAINLINE-CREATOR-LOOP-LIVE-WALKTHROUGH-056

Goal: walk the 055 creator operating loop as a real creator, identify business logic that blocks smooth use, harden where needed, validate, and hand off.

## Required Reading Completed

- `AGENTS.md`
- `docs/handoffs/MAINLINE-CREATOR-OPERATING-LOOP-V2-055-worker-handoff.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`

Additional context read:
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- API routes for creator drafts, content versions, and calendar clear action.

## Mature Reference Check

Quick reference pass looked at self-hosted/open-source social publishing tools such as Postiz and Mixpost. The useful comparison point was not visual styling; it was workflow shape: creator input, platform-specific variants, visible scheduling, and explicit manual import/sync actions should all remain on the main path.

Reference links:
- https://github.com/gitroomhq/postiz-app
- https://mixpost.app/

## Live Walkthrough

### `/content`

Opened `http://127.0.0.1:3200/content`.

Verified visible main-path controls:
- "新视频"
- title/topic/brief/script/material note fields
- "生成并保存四平台版本"
- visible boundary copy: platform incentive/creation tags are local suggestions and require manual confirmation; no external LLM key and no auto-publish.

Browser automation could not type Chinese into the form because the in-app browser virtual clipboard was unavailable. This was a browser-tool limitation, not an app issue. To keep the live run moving, I created the same draft through the page API:

- Content created: `content-creator-1caebb927d45`
- Title: `056真人走查：AI短片从想法到四平台发布`
- Four platform versions created: douyin, xiaohongshu, video_account, bilibili
- Each version had title, body/copy, tags, cover note, and platform advice.
- Each version included advice/manual-confirmation wording for platform tags/incentives.

Verified on `/content?contentId=content-creator-1caebb927d45&versionId=version-content-creator-1caebb927d45-douyin`:
- 056 content appeared in content workbench.
- Four platform mini cards appeared.
- Editor exposed "发布时间" and "转已排期".

### `/calendar`

Scheduled the four versions to `2026-06-10T12:30:00.000Z` through the same content-version PATCH route.

Found and fixed two real smooth-use blockers:

1. Content-page platform row "日历" link opened `/calendar?versionId=...#publish-ledger`, so the user landed on the ledger instead of the schedule grid.
   - Fixed by making platform-row calendar links go to `/calendar?versionId=...`.
   - Kept the explicit "打开日历台账" link anchored to `#publish-ledger`.

2. `/calendar?versionId=...` selected the version but the week grid still anchored to whichever week had the most existing scheduled items. A newly scheduled future draft could be invisible on first load.
   - Fixed by deriving `calendarAnchorDate` from the selected version's `scheduledAt`.
   - Passed `anchorDate={calendarAnchorDate}` into `PublishCalendar`.
   - Range label now uses the same preferred anchor.

Additional hardening:
- Added visible "修改排期时间" datetime input and "保存排期时间" button in `PlatformVersionInspector`.
- Tightened card grouping from same-content-only to same-content + same date + same displayed time. This prevents a single-platform edit from being hidden inside a merged multi-platform card.

Verified after fixes:
- `/calendar?versionId=version-content-creator-1caebb927d45-bilibili` opened the correct week range `06/08 - 06/14`.
- The 056 schedule appeared at `20:30`.
- After moving B站 to `2026-06-11T13:00:00.000Z`, calendar showed a separate B站 `21:00` card instead of hiding it under the earlier 20:30 group.
- Inspector showed datetime input value `2026-06-11T13:00` and "保存排期时间".

### Clear Future Schedules

Clicked the visible UI button "清空未来排期".

Page feedback:
- `已清空未来排期：4 个平台稿件、4 个队列项；历史发布记录 74 条和指标快照 179 条保留。`

Post-clear API/data checks:
- 056 content still exists.
- 055 acceptance draft still exists.
- 056 four platform versions are `needs_review`.
- 056 platform version `scheduledAt` values are empty.
- 056 has 0 future scheduled calendar items.
- No content was deleted.
- Historical publish records remained.
- Metrics remained.

### `/import`

Opened `http://127.0.0.1:3200/import`.

Verified visible default-path controls and copy:
- Panel title: "手动抓取最新数据"
- Boundary copy: local manual capture/sync, not platform callback.
- Boundary copy: 公众号/WeChat backend paused.
- Boundary copy: B站 account metrics preview-only and not durable totals.
- Four platforms each show "预览最新本地抓取" and "保存本地同步".
- "定时抓取设定" says first version is local plan/manual confirmation; no silent auto-login and no sensitive login material storage.
- Advanced diagnostics remain folded.

Triggered preview operation for all four platforms through the same operations route:
- douyin: passed, 5 content / 5 metrics
- xiaohongshu: passed, 1 content / 1 metric
- video-account: passed, 3 content / 3 metrics
- bilibili: passed, 3 content / 3 metrics

I did not run extra save writes during 056 beyond the requested schedule/clear workflow.

### `/dashboard`

Extra-depth pass opened `http://127.0.0.1:3200/dashboard`.

Verified:
- Dashboard page loads.
- Default view remains data-focused.
- No default WeChat active promise surfaced.
- Publish ledger copy still says ledger does not change exposure/engagement metrics.
- B站 is presented as content-level creator-center data, not durable account totals.

API boundary check:
- `wechatDefaultContents = 0`
- `bilibiliAccountMetrics = 0`

## Files Changed By This Worker

- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-CREATOR-LOOP-LIVE-WALKTHROUGH-056-worker-handoff.md`

The worktree had many pre-existing dirty/untracked files before this task. I did not revert them and did not stage `.local`, `.agents`, `.codex`, or `.trellis`.

## Validation

- `git diff --check`
  - PASS
  - Note: warning only for pre-existing `tsconfig.json` CRLF normalization.
- `npm run typecheck`
  - PASS
- `npm run test:self-media`
  - PASS, 124 tests
- `npm run test:ui-harness`
  - PASS, 15 tests
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - First run: FAIL because safe weekly API timed out while dashboard API, trusted data, and page were ready.
  - Immediate rerun: PASS. Healthy port 3200, API ready, safe weekly ready, trusted data ready, page ready.

## Boundaries

- Did not restore WeChat backend.
- Did not make B站 account metrics durable.
- Did not delete local acceptance drafts.
- Did not change package scripts.
- Did not run `git add .`.
- Did not stage `.local/.agents/.codex/.trellis`.

## Commit

Hardening fixes were necessary and implemented. Commit message:

`fix(self-media): harden creator operating loop`
