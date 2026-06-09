# MAINLINE-PLATFORM-CAPTURE-ASSISTED-FLOW-117 worker handoff

## Summary
- Goal: improve `/import` assisted platform capture flow so creators can see each platform state, the next action, and safe failure guidance after login or page changes.
- Scope: UI flow/status copy and harness coverage only; no dashboard visual rebuild, no provider persistence changes, no real platform save.
- Reference pass: reviewed mature account-connection patterns from Mixpost docs, Postiz docs, and MediaCrawler source/docs. Borrowed only the flow idea of account status -> refresh/preview -> explicit confirmation -> actionable reconnect/page guidance.
  - https://docs.mixpost.app/
  - https://docs.postiz.com/
  - https://github.com/NanmiCoder/MediaCrawler

## Root Cause / Current Flow Problem
- `/import` first screen had correct platform entry cards, but the cards were mostly static.
- After a user logged in or clicked a platform detail flow, the first screen did not clearly summarize whether the system needed login, needed the right content/data page, had preview rows waiting for confirmation, or was intentionally manual-only.
- Freshness warnings existed in secondary diagnostics, but the first screen did not plainly say which platforms were stale and what should be refreshed.

## Changes
- Added `ImportPlatformFlowState` to `ImportPlatformOverview`.
- Added per-platform first-screen state badges and next-action copy:
  - `可刷新`
  - `需要登录`
  - `需要切到作品/数据页面`
  - `已抓到预览，等待确认保存`
  - `当前平台暂不支持自动抓取`
- Added first-screen freshness guidance with Chinese platform names only: 抖音 / 小红书 / 视频号 / B站.
- Wired `ImportPage` capture state into the overview from existing browser/manual preview state.
- Updated `tests/ui-harness.test.mjs` to guard the assisted flow copy, freshness warning, and no default technical-word pollution.

## Four Platform Final State
- Douyin: browser-assisted login capture remains available. If not logged in, the card asks the user to log into Douyin Creator Center. If logged in but rows are missing, it asks the user to switch to works/data page or a work detail page. Preview still requires user confirmation before save.
- Xiaohongshu: creator backend content-analysis table remains the primary path. If not logged in, the card asks the user to log into Xiaohongshu Creator Service Platform. If on the wrong page or no rows are found, it asks the user to switch to 数据看板 / 内容分析 / 笔记数据表格. Public explore pages remain untrusted.
- Video Account: manual update remains the default. The card states automatic login capture is not currently supported as a daily flow and guides users to paste/upload content-level data.
- Bilibili: content-level import remains available. Account metrics remain preview-only and do not enter trusted durable totals.

## User Assistance Needed
- User only needs to assist when a platform requires login, QR scan, captcha, risk control, or switching to the platform-specific creator data page.
- The app does not auto-open platform windows on page load or focus return.
- Opening platform backend remains tied to explicit user actions in the platform detail flow.

## Preview / Save
- Generated preview: No real platform preview generated in this task.
- Saved data: No.
- Added/deleted business data: No content, schedule, metric, or trusted dashboard data was added or deleted.

## Live 3200 Acceptance
- Entry: `http://localhost:3200/dashboard` -> clicked `导入`.
- `/import` first screen showed 4 platform cards.
- Freshness warning used Chinese platform names.
- First screen had no visible `raw`, `API`, `path`, `run id`, `cookie`, `token`, `header`, or `storageState` pollution.
- Clicking the Xiaohongshu main card opened the Xiaohongshu update detail panel.
- External platform windows opened: 0.
- 3200 strict health: PASS.

## Validation
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 150 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- `NEXT_DIST_DIR=.next-build-117-main npm run build`: PASS. In PowerShell this was run as `$env:NEXT_DIST_DIR='.next-build-117-main'; npm run build`.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: command exit 0 / passed true, status `warn` because real capture freshness is stale (`realCaptureStaleCount=4`, latest real capture age about 125.61 hours). No fake refresh data was created to silence the warning.

## Sensitive Material Boundary
- No password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace saving added.
- No real publish API called.
- No automatic save or automatic `userConfirmedContentMetrics:true` added.
- No external platform window was opened during live acceptance.

## Remaining Risk
- Daily gate still reports freshness warning until a real platform refresh is performed by the user-assisted flow.
- First-screen state depends on current client-side session results; unopened sessions still correctly default to login/manual guidance.
- Platform DOM/page layout changes can still cause no-row states, but those now surface as user-readable next actions instead of opaque failures.

## Git / Push
- Commit: pending at handoff creation.
- Push: pending at handoff creation.

## Remaining Dirty Files To Avoid
- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
- `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`

## Timing
- Started: 2026-06-09 21:20 Asia/Shanghai
- Finished: 2026-06-09 21:38 Asia/Shanghai
- Elapsed: about 18 minutes
- Workload class: M
- Extra-depth pass: performed because this was near the 15-minute line; included Browser live verification, 117 build restart on port 3200, Chinese freshness copy correction, strict health, and daily gate rerun.
- 需主会话判断：否
