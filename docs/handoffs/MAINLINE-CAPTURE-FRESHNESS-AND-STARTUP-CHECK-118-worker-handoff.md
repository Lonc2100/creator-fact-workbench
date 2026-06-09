# MAINLINE-CAPTURE-FRESHNESS-AND-STARTUP-CHECK-118 Worker Handoff

## Scope
- Goal: make `/import` and the dashboard explain platform data freshness clearly without opening platform windows, saving previews, or manufacturing fake data.
- Commit status: yes, this handoff is intended to be included with `feat(self-media): clarify capture freshness checks`; final commit hash is recorded by the main session after commit.
- Push status: pending at handoff authoring time; push result is recorded by the main session after validation and commit.

## Freshness Strategy
- Fresh: a platform has a trusted real capture in the last 24 hours.
- Suggested refresh: trusted real capture is older than 24 hours and up to 72 hours.
- Needs refresh: trusted real capture is older than 72 hours, or no reliable recent real capture exists.
- This is a status prompt only. The implementation does not create fake captures, fake metrics, or fake freshness to remove warnings.

## Startup / Import Check Behavior
- `/import` now shows freshness directly in the four platform update cards on first load.
- The page still does not auto-open Douyin, Xiaohongshu, Video Account, or Bilibili windows on load or focus return.
- The first-screen `重新检查状态` button calls the existing login-capture refresh path with `autoOpen=false`, so it can re-check the persistent profile and current browser state without popping external platform windows.
- Re-checking can produce a preview if the user already opened/logged into the correct platform page, but saving remains manual and user-confirmed.

## Platform States And Next Steps
- Douyin: login capture is available. If stale or missing, the card asks the user to open Douyin creator center, log in, and return to re-check; if the page is wrong, the assisted flow tells the user to switch to works/detail data pages.
- Xiaohongshu: content-analysis table capture is the main path. If stale or missing, the card asks the user to open Xiaohongshu creator service, log in, and return to re-check; public explore pages remain untrusted.
- Video Account: default remains manual update. The card states that login capture requires QR scanning and is not the daily automatic path.
- Bilibili: content-level import remains available; account metrics stay preview-only and do not become durable trusted totals.

## Preview / Save Result
- No real platform preview was generated in this task.
- No platform data was saved in this task.
- No local content, schedule, or metric rows were added or deleted.

## Dashboard Result
- Dashboard remains data-first.
- A small freshness notice was added near the top: it shows the 24/72-hour state, latest real capture time, stale platform count, and a link to `/import`.
- It does not expand into operation logs or task history.

## Live 3200 Acceptance
- Entry: `http://localhost:3200/dashboard`.
- Dashboard freshness notice visible: `真实抓取超过 72 小时，需要刷新。最近更新：06/04 15:58；需要刷新平台 4 个。`
- `/import` shows four platform cards with freshness states and next actions.
- `/import` visible text includes the 24-hour / 72-hour freshness policy and says the page will not automatically open platform windows.
- Clicking `重新检查状态` did not open additional external platform tabs/windows in the Browser session.
- Default visible UI had no `run id`, `raw`, `evidence`, `API path`, `storageState`, `cookie`, `token`, or `header` pollution.

## Validation
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 150 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- `NEXT_DIST_DIR=.next-build-118-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS on port 3200.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: exit 0, `passed:true`, status `warn`.

## Daily Gate Warning
- Warning is expected and non-blocking:
  - `realCaptureAgeHours`: 126.04.
  - `realCaptureStaleCount`: 4.
  - `staleAfterHours`: 72.
- This task intentionally keeps stale real data as a warning instead of faking a fresh capture.

## Sensitive Boundary Check
- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, or trace was saved.
- No real publish API was called.
- No WeChat/Official Account capability was restored.
- Video Account remains manual-update-first.
- Bilibili account metrics remain preview-only.

## Remaining Risks
- Real platform freshness remains stale until the user performs new confirmed captures or manual imports.
- Browser persistent profiles can still require user login, QR scan, or platform risk verification.
- Dashboard freshness summary is intentionally small; deeper history stays in `/import` secondary areas.
- Daily gate can continue returning `warn` while real captures are older than 72 hours, but it should not fail on freshness alone.

## Timing
- Started: 2026-06-09 21:26 +08:00.
- Finished: 2026-06-09 22:03 +08:00.
- Elapsed: about 37 minutes.
- Workload class: M.
- Need main-session judgment: No.
