# MAINLINE-AUTO-OPEN-THROTTLE-105 Worker Handoff

## Summary

- Fixed `/import` login-capture auto-open behavior.
- Startup now refreshes only local browser profile status and does not call the auto-refresh capture endpoint.
- Focus/visibility return now shows a refresh prompt and refreshes local profile status only; it no longer runs platform preview or opens platform windows.
- The explicit button is now labeled `手动打开后台并刷新`; only that manual click passes `autoOpen: true`.
- The server route is fail-closed too: `autoOpen` is enabled only when `trigger === "manual" && body.autoOpen === true`.

## Files Changed

- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/api/self-media/browser-capture/auto-refresh/route.ts`
- `tests/ui-harness.test.mjs`

## Behavior

- Page load:
  - Refreshes local login profile state.
  - Does not open Douyin or Xiaohongshu windows.
  - Does not call `runLoginCaptureAutoRefresh("startup")`.

- Focus return / visibilitychange:
  - Shows: `检测到你回到本页，可点击“手动打开后台并刷新”重新读取数据；系统不会自动打开平台窗口。`
  - Refreshes local profile status only.
  - Does not call `runLoginCaptureAutoRefresh("focus_return")`.

- Manual button:
  - Label: `手动打开后台并刷新`.
  - Calls `runLoginCaptureAutoRefresh("manual", true)`.
  - Server accepts window opening only for manual trigger.

- Close flow:
  - Existing Douyin/Xiaohongshu close browser window buttons remain unchanged.
  - Reloading `/import` after the manual test did not auto-open platform windows again.

## Validation

- `git diff --check`: pass. Git still reports the existing CRLF advisory for `tsconfig.json`; no whitespace error.
- `npm run typecheck`: pass.
- `npm run test:self-media`: pass, 149 tests.
- `npm run test:ui-harness`: pass, 19 tests.
- `NEXT_DIST_DIR=.next-build-105-main npm run build`: pass.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: pass on port 3200.

## Live Acceptance

- Opened fixed entry `http://localhost:3200/dashboard`, then entered `http://localhost:3200/import`.
- On first `/import` load:
  - No Douyin/Xiaohongshu platform tabs were added in the observed browser tab list.
  - Visible copy included `不会自动打开抖音/小红书窗口`.
  - Button was `手动打开后台并刷新`.
  - Old `自动开窗刷新` copy was absent.
- Clicked the manual button once:
  - UI entered manual refresh state.
  - No startup/focus auto-open path was invoked.
  - The local persistent-browser open flow did not return within the observation window; this looks separate from the auto-open regression and should be handled as a manual-open timeout/feedback improvement if it recurs.
- Reloaded `/import` after the manual test:
  - Button returned to `手动打开后台并刷新`.
  - No Douyin/Xiaohongshu platform tabs were added.
  - Startup/focus did not auto-reopen platform windows.

## Safety

- No WeChat/Official Account restoration.
- Video Account remains discovery-only.
- Bilibili account metrics remain preview-only.
- No automatic save.
- No automatic `userConfirmedContentMetrics: true`.
- No password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace persistence added.

## Remaining Dirty Files

Unrelated existing dirty/untracked files left untouched:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

105 changed but not committed:

- `src/app/api/self-media/browser-capture/auto-refresh/route.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-105-worker-handoff.md`

## Timing

- Started: 2026-06-08 21:26:20 +08:00
- Finished: 2026-06-08 21:35:29 +08:00
- Elapsed: 9m09s
- Workload class: small

## Main Session Decision

- 需主会话判断：否
