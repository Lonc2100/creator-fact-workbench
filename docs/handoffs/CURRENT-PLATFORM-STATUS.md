# Current Platform Status

This is the compact entrypoint for future sessions. Use it before opening dozens of historical handoffs.

## 053 Release / Status Closure Snapshot

Current mainline release baseline as of 2026-06-05:

| Bundle | Commit | Status | Handoff |
| --- | --- | --- | --- |
| Platform core four-platform bundle | `fdedf03 feat(self-media): add four-platform core bundle` | Done | `MAINLINE-PLATFORM-CORE-COMMIT-050-worker-handoff.md` |
| Package/tooling foundation | `bce1848 chore(self-media): add platform tooling foundation` | Done | `MAINLINE-PACKAGE-TOOLING-FOUNDATION-050-worker-handoff.md` |
| Operator UI data-only completion | `29a8734 feat(self-media): complete operator data-only UI` | Done | `MAINLINE-OPERATOR-UI-DATA-ONLY-COMPLETION-051-worker-handoff.md` |
| Daily operations reliability | `a22cbe3 chore(self-media): add daily operations reliability` | Done | `MAINLINE-DAILY-OPS-RELIABILITY-052-worker-handoff.md` |

Current usable mainline:

- Four active content-level platforms are available end to end: Douyin, Xiaohongshu, Video Account, and Bilibili archives/work content metrics.
- Fixed operator inspection target is `http://localhost:3200/dashboard`; use `npm run dev:operator` or `npm run dev` on port 3200.
- Default operator UI is data-only: primary pages show real/trusted operating data, while diagnostics, local paths, report paths, commands, API URLs, run ids, and evidence internals stay hidden or collapsed.
- Daily operator loop is available:
  - `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`
  - optional one-command loop: `npm run ops:daily-self-media -- --preflight-health`
- The latest 052 verification confirmed live 3200 health PASS and daily platform ops gate PASS on `http://127.0.0.1:3200/api/self-media/dashboard`.

Current PRD boundaries:

- Active scope is four-platform trusted real creator-center content-level data.
- WeChat Official Account / WeChat backend remains paused. Do not run or advertise `sync:wechat`, `discover:wechat-backend`, or `src/app/api/self-media/wechat/**` as active release scope.
- Bilibili account-level metrics remain preview-only diagnostics. Do not promote them into durable content totals or durable account snapshot save.
- Safe shareable reporting is the redacted output path; full local weekly reports and `.local/**` evidence remain local-only.
- Remaining forbidden `package.json` working-tree scripts are not release commitments until a separate cleanup/diagnostic bundle accepts them.

Residual worktree risk after 053:

- Historical handoffs/specs remain broadly untracked and need a later archive/index policy bundle.
- Paused WeChat routes/scripts/specs should be grouped as paused/historical, not active.
- Bilibili account diagnostics and browser/UI E2E helpers should be grouped as diagnostic/archive or explicitly promoted by a future task.
- `.local/**`, `.agents/**`, `.codex/**`, and `.trellis/**` remain excluded from this release closure.

## 058 Creator Business Loop Baseline

Current creator operating baseline as of 2026-06-06:

| Bundle | Commit | Status | Handoff |
| --- | --- | --- | --- |
| Creator operating loop v2 | `10d9883 feat(self-media): add creator operating loop` | Done | `MAINLINE-CREATOR-OPERATING-LOOP-V2-055-worker-handoff.md` |
| Creator loop live hardening | `b44038b fix(self-media): harden creator operating loop` | Done | `MAINLINE-CREATOR-LOOP-LIVE-WALKTHROUGH-056-worker-handoff.md` |
| Creator copilot discussion | `affa5b1 feat(self-media): add creator copilot discussion` | Done | `MAINLINE-CREATOR-COPILOT-DISCUSSION-057-worker-handoff.md` |
| Creator business loop acceptance | `pending docs commit` | Done | `MAINLINE-CREATOR-BUSINESS-LOOP-ACCEPTANCE-058-worker-handoff.md` |

Creator business loop is now the accepted mainline path:

- `/content`: rough new-video idea -> creator discussion -> optional adjustment/regeneration -> four platform drafts for Douyin, Xiaohongshu, Video Account, and Bilibili.
- Draft outputs include title, body/copy, tags, cover note, platform advice, and platform incentive/creative-tag suggestions marked as requiring manual confirmation.
- Saving creates one content item plus four platform versions and queue rows; optional future time enters `/calendar`.
- `/calendar`: future schedules are visible, schedule time can be edited manually, and future schedules can be cleared without deleting content, publish records, or metric snapshots.
- `/import`: manual latest-data refresh remains the explicit four-platform capture/sync entry; preview/save are user-triggered and local/manual, not platform callbacks.
- `/import`: scheduled refresh setting is a runbook/status panel only. It does not imply a daemon, silent platform login, or stored cookie/token/header/raw payload.
- Boundaries remain unchanged: WeChat Official Account/backend paused; Bilibili account-level metrics remain preview-only diagnostics and are not durable content totals.

## 086 Authenticated Browser Capture Baseline

Authenticated browser capture is now the active data-import mainline, with a strict current reality:

- `/import` first screen prioritizes login capture status and user next action. Local CSV/XLSX export remains a folded fallback, not the default product path.
- The app uses local, platform-isolated browser profiles under `.local/browser-profiles/<platform>/`. These profiles are ignored by Git and are only for reusing the user's own local login session.
- Douyin and Xiaohongshu have content-level authenticated browser capture MVPs: open the platform backend, user logs in, navigate to visible creator content rows, preview, explicitly confirm, then save trusted content-level metrics.
- Douyin and Xiaohongshu routes use persistent browser contexts. Do not regress them back to temporary `browser.newContext()` sessions; that breaks the user's expected "I logged in, now help me capture" flow.
- No route accepts or writes password, cookie, token, header, storage state, raw request, raw response, screenshot, HAR, or trace material into business data, docs, tests, or Git.
- Video Account is still discovery-only for content-level browser capture. The 086 discovery did not prove a stable works table containing title, publish time, views/play count, likes, comments, and shares together, so do not create a trusted Video Account browser-save path yet.
- Bilibili browser profile status is tracked, but authenticated content-level browser capture is not implemented yet. Existing Bilibili archive/work metrics remain the accepted content-level path; account metrics stay preview-only.
- Current capture is user-triggered. Do not claim silent hourly automatic collection unless a future task adds an approved local scheduler/official API path with startup catch-up and the same sensitive-data boundaries.

## 087 Login Capture Refresh Baseline

The import/data refresh mainline has moved from "find a panel and manually read one platform" to a user-triggered login-capture refresh loop:

- `/import` first screen exposes `检查登录抓取状态` and the primary `一键刷新登录抓取` action without requiring scroll.
- `POST /api/self-media/browser-capture/auto-refresh` is local-only and preview-only. It checks local browser profile state, attempts `capture_preview` for eligible platforms, and never calls `save`.
- Auto-refresh currently attempts Douyin and Xiaohongshu only. If a browser window is not open but the profile is reusable, the route may open the platform backend once and retry preview.
- Save remains a separate user confirmation in the existing platform preview panels. The app must not save rows silently after auto-refresh.
- Video Account remains discovery-only for authenticated browser capture. 087 tightened the Video Account personal provider so durable rows require explicit title, publish time, views/play count, likes, comments, and shares together; incomplete rows and interaction-only rows are skipped.
- Bilibili browser capture remains unsupported; Bilibili archive/work content metrics remain usable and Bilibili account metrics remain preview-only.
- A live mouse walkthrough fixed immediate usability friction: import first-screen action visibility, content save selecting the newly persisted content/version, and stable `calendar-card` / `calendar-empty-slot` selectors.
- 088 should continue from the live walkthrough friction list: scheduled-time validation before save, in-place calendar empty-slot creation, clearer publish handoff empty state, and auto-highlight/scroll to the first actionable import panel after login check.

## 088 Login Capture Auto-Open Baseline

The data-import mainline now prioritizes login-assisted automatic preview over local export fallback:

- `/import` performs a startup check on page load and displays the current auto-refresh result without requiring the user to scroll into diagnostics.
- Douyin and Xiaohongshu are the only platforms allowed to auto-open local backend windows. When a reusable profile or retryable last state exists, the route can open the platform window once and retry `capture_preview`.
- Auto-open remains preview-only. The route never calls `save`, never marks `userConfirmedContentMetrics: true`, and never stores password, cookie, token, header, storage state, raw request, raw response, screenshot, HAR, or trace material.
- Result states are business-facing: preview ready, needs login, needs content page, failed, or unsupported. Local paths, run ids, raw capture details, and implementation logs stay out of the default `/import` first screen.
- Video Account remains discovery-only for authenticated browser capture. Bilibili browser capture remains unsupported; Bilibili account metrics remain preview-only.
- Obsidian PRD-drift prevention note was written to `D:\codex work\codex-session-vault\20_Decisions\2026-06-07 PRD偏离复盘与防偏清单.md`. Future sessions should use it to keep PRD > CURRENT > main closure > worker handoff.

## 089 Login Capture Return-to-Preview Baseline

The `/import` login-capture flow now handles the realistic "I logged in or switched pages in the platform window" step:

- If startup/manual auto-refresh opens or attempts Douyin/Xiaohongshu and the result still needs login, needs a content page, or failed, `/import` listens for the user returning to the app window and automatically retries `capture_preview`.
- This return retry is throttled and labeled as `focus_return`, so it is visible as "登录返回复查" instead of being hidden as background work.
- The auto-refresh panel now puts a business-facing "下一步" card before detailed platform cards: go confirm preview, log in, switch to works page, or accept unsupported/discovery boundaries.
- The Douyin preview anchor now points to the actual Douyin capture panel, so "查看预览并确认保存" does not send the user to a missing section.
- Default dashboard snapshot now filters calendar items, publish queue rows, platform versions, and publish records to `dataDomain=user_work` content. System-log/action-generated drafts remain available in the content workbench but do not pollute the default calendar or dashboard.
- Acceptance/test text detection no longer treats bare `050`-`072` digit fragments inside generated IDs or timestamps as acceptance markers; those numbers must be delimited. This prevents real user ideas from being misclassified as `acceptance_run`.
- Safety boundary is unchanged: return retry is still preview-only, no silent save, no automatic content-metric confirmation, no sensitive login material, no WeChat, Video Account discovery-only, Bilibili browser capture unsupported.

## 090 Usable Creator Mainline Closure

The current mainline is closed as a usable creator workflow on fixed `http://localhost:3200/dashboard`:

- `/dashboard`, `/calendar`, and `/import` default page text is clean of backend logs, local paths, API URLs, run ids, raw/evidence labels, and acceptance/test wording.
- `/calendar` default scope continues to show only `dataDomain=user_work` operating schedules. Seed/demo/acceptance/system-log rows stay in collapsed isolation areas and do not occupy the default schedule grid.
- `/content` and `/calendar` isolation folds are now business-facing as "隔离数据" instead of exposing acceptance/test labels in default summaries.
- `/import` first screen shows only four-platform login capture status and next actions. Local export, diagnostics, and technical profile paths remain outside the default first-screen path.
- Douyin and Xiaohongshu authenticated browser capture remain persistent-profile, user-triggered, preview-before-save flows. Auto-open/return retry remains preview-only and must not silently save.
- Video Account authenticated browser capture remains discovery-only until a stable content table with title, publish time, views/play count, likes, comments, and shares is proven. Bilibili browser capture remains unsupported; Bilibili archive/work content metrics remain the accepted content-level path.
- Evidence screenshots for the 090 closure were written locally under `.local/mainline-usable-closure-090/` and are not committed.

## 091 Real Login Capture Acceptance Attempt

The real assisted login-capture path was attempted with persistent local Douyin and Xiaohongshu browser sessions:

- Both platform windows opened through `/import` using the existing persistent-profile browser capture routes.
- `focus_return` / preview-only checks ran without saving.
- Douyin reached an accessible creator data-center page, but the page was an operation overview, not a visible works table. Preview failed with zero content rows and warning `no_visible_content_rows`.
- Xiaohongshu reached an accessible creator account-statistics page, but the page was an account overview, not a visible note/work table. Preview failed with zero content rows and warning `no_visible_creator_note_rows`.
- No save was performed, because neither platform exposed title plus per-work/per-note metrics in visible content rows.
- Dashboard trusted counts remained unchanged at 12 trusted contents and 12 trusted metric snapshots after preview-only checks, proving account overview/empty rows were not written.
- Next real acceptance attempt must start from the opened platform windows and manually switch to a works/note management table that visibly contains title plus views/play, likes, comments, saves/shares or equivalent metrics.

## 092 Publish Calendar Data Hygiene

The default publish calendar is now a strict planning surface, not a historical content archive:

- Default dashboard `calendarItems` use service-layer publish-calendar eligibility, not only `dataDomain=user_work`.
- Default calendar items require `user_work`, `user_owned_work`, an explicit `scheduledAt`, and an unpublished platform-version status of `draft`, `needs_review`, or `scheduled`.
- Published content, `publishedAt` rows, historical archive/creator-center imports, and acceptance/demo/fixture traces are excluded from the default calendar even if an older record was mistakenly marked as `user_work`.
- `service.calendar()` no longer turns missing `scheduledAt` values into today's date, so unscheduled historical versions cannot occupy a current calendar slot through fallback time.
- `/calendar` keeps historical publish records and local/diagnostic data outside the default main grid. Those records belong in content history, data analysis, publish ledger, or explicit diagnostic views.
- Live 3200 calendar check confirmed the default calendar text did not contain `用户作品：六月内容计划`, `孤雏，随便唱唱`, `bilibili-BV1u34y1y7hQ`, or `2022` historical card evidence.

## 093 Works Page Navigation For Login Capture

Douyin and Xiaohongshu login capture now starts from content-level management surfaces instead of account overview by default:

- Douyin `open` targets `https://creator.douyin.com/creator-micro/content/manage`; live preview reached `https://creator.douyin.com/creator-micro/data-center/content`.
- Xiaohongshu `open` targets `https://creator.xiaohongshu.com/new/note-manager`; live preview stayed on the note manager page.
- `/import` buttons now say `打开抖音作品管理页` and `打开小红书笔记管理页`.
- Auto-refresh uses `target: "works_page"` for Douyin/Xiaohongshu and can retry preview from waiting-login local profile state.
- If a capture route infers `logged_in_or_accessible`, it marks the local profile usable so returning to `/import` can show preview without a separate manual login-confirm click.
- `needs_content_page` guidance is platform-specific: Douyin asks for `作品管理` with title plus play/like/comment metrics; Xiaohongshu asks for `笔记管理` with title plus browse/like/comment/save metrics.
- Live 3200 acceptance got preview-only content-level rows from both platforms: Douyin `1` content/metric row and Xiaohongshu `1` content/metric row. No save occurred; trusted contents, metric snapshots, and import run counts remained unchanged.
- Fallback visible-text ids are still present in the live previews, so saving remains explicitly user-gated and should be hardened before routine trusted saves.

## 104 Real Creator-Center Capture Status

Current real saved creator-center baseline as of 2026-06-08:

| Platform | Current real path | Save status | Dashboard impact | Calendar impact |
| --- | --- | --- | --- | --- |
| Douyin | AI-assisted mouse click into a creator-center work detail/data page | Saved 1 real work after explicit user confirmation | Trusted dashboard increased in the 100 acceptance path | No new historical/import card pollution |
| Xiaohongshu | `creator.xiaohongshu.com/statistics/data-analysis` content-analysis `笔记数据` table | Saved 7 real notes after explicit user confirmation | Trusted contents `13 -> 20`; metric snapshots/metrics `13 -> 21` | No new historical/import card pollution; calendar stayed `195` |

Current import reality:

- Xiaohongshu no longer needs to force a single-note detail page as the main path. The primary path is the creator-service content-analysis table at `https://creator.xiaohongshu.com/statistics/data-analysis`, with one visible table row per note.
- Xiaohongshu detail-page capture remains a fallback preview path only.
- Douyin's proven real path is assisted browser mouse clickthrough into a specific work detail/data page, then preview and explicit save.
- All creator-center saves still require explicit user confirmation. Do not silently save, do not auto-set `userConfirmedContentMetrics: true`, and do not save password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or real platform DOM.
- Video Account remains discovery-only for authenticated browser capture.
- Bilibili account metrics remain preview-only; Bilibili archive/work content metrics remain the accepted content-level path.
- WeChat Official Account / WeChat backend remains paused.

## 107 Recency Dashboard And Video Account Reality

Current operator-data baseline as of 2026-06-09:

- `/dashboard` defaults to recent works first and uses a published-work time-window scope. The visible switch supports `近 7 天` and `近 30 天`; both windows count works published in that window and show the latest metric snapshot per work.
- Dashboard charts/list/ranking sort by real time order: trend buckets are ordered by date, content ranking and native metric preview put recently published works first, and duplicate old snapshots of the same work are collapsed to the latest snapshot by default.
- Dashboard rows keep the operator-critical fields visible: publish time, latest capture/save time, platform, exposure/views, and engagement.
- Video Account is no longer framed as a default automatic login-capture target. The current main path is manual update: paste or upload a content-level Video Account table, preview rows, explicitly confirm, and save into trusted `video_account_creator_center` content metrics.
- Video Account login capture requires QR/scanning and remains a later exploration path. API capability is not assumed for individual creators.
- `/import` startup/focus/auto-refresh must not open Video Account windows. Douyin and Xiaohongshu still use user-triggered login capture; Video Account uses the manual update panel unless a future task explicitly approves a login/API path.
- Existing platform realities remain: Douyin detail/data-page capture has saved 1 real work; Xiaohongshu content-analysis table capture has saved 7 real notes; Bilibili content-level archive/import is usable while Bilibili account metrics remain preview-only; WeChat/Official Account remains paused.

## 115 Usable Creator Release Closure

Current usable creator release baseline as of 2026-06-09:

| Bundle | Commit | Status | Handoff |
| --- | --- | --- | --- |
| Import first-screen consolidation | `439dc33 refactor(self-media): simplify import first screen` | Done | `MAINLINE-IMPORT-FIRST-SCREEN-CONSOLIDATION-109-worker-handoff.md` |
| Content composer/library split | `47ef5f4 refactor(self-media): split content composer and library` | Done | `MAINLINE-CONTENT-COMPOSER-LIBRARY-SPLIT-110-worker-handoff.md` |
| Calendar scheduling/history split | `7bace1c refactor(self-media): separate calendar scheduling from history` | Done | `MAINLINE-CALENDAR-SCHEDULING-HISTORY-SPLIT-111-worker-handoff.md` |
| Navigation and reviews cleanup | `cb03138 refactor(self-media): simplify navigation and review surfaces` | Done | `MAINLINE-NAVIGATION-REVIEWS-SURFACE-CLEANUP-112-worker-handoff.md` |
| Human creator workflow walkthrough | `aa95330 fix(self-media): smooth creator workflow walkthrough` | Done | `MAINLINE-HUMAN-CREATOR-WORKFLOW-WALKTHROUGH-113-worker-handoff.md` |
| Content composer schedule persistence | `d5bdcdd fix(self-media): persist content composer schedules` | Done | `MAINLINE-CONTENT-SCHEDULE-PERSISTENCE-FIX-114-worker-handoff.md` |

Current daily creator path:

- `/dashboard`: data-first operator view with recent-first `近 7 天` / `近 30 天` published-work windows, latest snapshot per work, and trusted content-level totals.
- `/import`: creator-facing data update page. Douyin and Xiaohongshu are explicit manual login-capture/open-backend flows; Xiaohongshu main path is the creator `statistics/data-analysis` table; Video Account is manual paste/upload update; Bilibili content-level import remains available while account metrics are preview-only.
- `/content`: default `创作` mode for rough idea -> local discussion -> four-platform drafts -> save. `内容库` is the explicit secondary mode for saved content, platform versions, trusted-scope curation, and manual publish assistant.
- `/content`: direct future-time entry is now durable. If a future time is entered before saving four-platform drafts, the page verifies content, platform versions, queue rows, and calendar schedule; otherwise it fails closed with a creator-facing message.
- `/calendar`: default main grid is future real publishing schedules only, grouped by content/time so multi-platform schedules appear as one card with platform badges. History, publish ledger, isolated data, and unscheduled drafts are secondary collapsed sections.
- `/reviews`: default first screen is recent 7/30-day performance, Top content, and a small action list. Full detail remains collapsed.

Validated live 3200 snapshot:

- Fixed entry: `http://localhost:3200/dashboard`.
- Dashboard showed `21` trusted contents and `22` trusted metric snapshots before/after the 114 schedule proof content.
- 114 retained local proof content `content-creator-ef2633cdc996` titled `AI短片脚本：让普通场景出现反转`, scheduled for `2026-06-13 10:00 +08:00`, with one merged 4-platform calendar card and zero metric snapshots.
- Read-only 115 walkthrough found no default visible `run id`, `raw`, `evidence`, `API`, `path`, `storageState`, `cookie`, `token`, `header`, `测试`, `验收`, or `诊断` text across `/dashboard`, `/import`, `/content`, `/calendar`, and `/reviews`.
- No external platform window was opened during the 115 read-only walkthrough.

Release boundaries:

- The workbench does not call real platform publish APIs; publishing remains manual confirmation only.
- All creator-center metric saves still require preview and explicit user confirmation; no silent save and no automatic `userConfirmedContentMetrics:true`.
- Browser/login capture may require user login, QR scan, verification, or page switching. Do not store password, cookie, token, header, storageState, raw request/response, screenshot, HAR, trace, or real platform DOM.
- Video Account defaults to manual update; login/API capture remains future exploration, not daily automatic flow.
- Bilibili account metrics remain preview-only and must not enter durable content totals.
- WeChat Official Account / WeChat backend remains paused.

## 120 Capture Freshness Model Alignment

Current freshness model as of 2026-06-09:

- Freshness still uses the 118 window: within 24 hours is fresh, 24-72 hours suggests refresh, and more than 72 hours needs refresh.
- Real freshness evidence now accepts two safe evidence classes:
  - raw real-capture evidence from the existing local raw capture directories;
  - user-confirmed trusted content-level metric saves from the operating sqlite DB.
- Confirmed trusted saves record only safe summaries for freshness: platform/source, saved/captured timestamp, safe source type, row count, and existing local import run id where available. They do not store password, cookie, token, header, storageState, raw request/response, screenshot, HAR, trace, or real platform DOM.
- The 119 assisted real capture is now recognized by freshness:
  - Douyin: latest evidence comes from trusted browser capture, not the old raw timestamp.
  - Xiaohongshu: latest evidence comes from trusted browser capture, not the old raw timestamp.
  - Video Account: freshness can come from the manual-update trusted content metric path; it remains manual-update-first, not automatic login capture.
  - Bilibili: freshness can come from trusted content-level imports; account metrics remain preview-only and do not enter durable totals.
- `npm run check:real-capture-freshness` is still read-only. It does not open a browser, collect new data, or write the operating DB.
- `npm run health:platform-data` may still warn for old smoke/mapping/raw diagnostic files. That warning is separate from trusted real freshness and must not be hidden by fake capture data.

## Current Facts

- Four content-level platform loops are closed: Douyin, Xiaohongshu, Video Account, and Bilibili.
- Data recovery mainline is platform-specific: Douyin uses assisted authenticated browser detail/data-page capture, Xiaohongshu uses creator-service content-analysis table capture, Video Account uses manual update by paste/upload, and Bilibili uses content-level archive/import. Preview comes before save and saved rows enter trusted content metrics only after explicit confirmation.
- Local CSV/XLSX export remains available for platform risk blocks, unstable browser capture, user preference, and the current Video Account manual-update path.
- Douyin has a proven real authenticated browser capture path on `/import`: open controlled browser, AI mouse-clicks a visible creator-center work into a detail/data page, preview, explicit user confirm save, and write `douyin_creator_center` trusted content-level metrics without saving password, cookie, token, header, storage state, raw request, or raw response records.
- Xiaohongshu has a proven real authenticated browser capture path on `/import`: open the creator service platform with the local profile, read the `statistics/data-analysis` content-analysis `笔记数据` table, capture one row per note, preview, explicit user confirm save, and write `xiaohongshu_creator_center` trusted content-level metrics.
- 091 real assisted login acceptance did not save data: Douyin and Xiaohongshu opened and were accessible, but both were on account/operation overview pages rather than visible content-level metric tables.
- 093 fixed the Douyin/Xiaohongshu navigation gap: platform windows now open or return to works/note management targets and live preview-only checks reached content-level rows on both platforms.
- `/import` also has user-triggered auto-refresh preview for Douyin and Xiaohongshu via the login-capture refresh route; this is not silent background collection and not an automatic save.
- `/import` page-load and focus-return checks refresh local profile status only; they must not automatically open platform windows. Manual buttons can still open Douyin/Xiaohongshu backend windows for preview. Save still requires explicit user confirmation in the platform preview panel.
- `/import` now prompts the operator to manually refresh when returning from a platform login/content page window, and the first auto-refresh result card explains the next business action.
- `/import` has a Video Account manual-update panel for paste/upload -> preview -> explicit confirmation -> trusted content-level save. It is not a default automatic login-capture path.
- `/import` first screen is now status-and-next-action only: four platform login state, check action, and next-step links. Local export and diagnostics remain below/folded.
- Default dashboard/calendar/publish ledger data is now service-filtered to user-owned work instead of relying only on page-level filtering.
- Default publish calendar main-grid items are stricter than content-library visibility: they require user-owned `user_work`, explicit `scheduledAt`, unpublished status, and no acceptance/demo/archive/published traces.
- Default `/dashboard`, `/calendar`, and `/import` should not visibly expose backend logs, local paths, API route strings, raw/evidence labels, or acceptance/test wording.
- Creator business loop is closed for daily use: idea -> discussion -> four-platform drafts -> save -> future schedule -> edit schedule -> clear future schedule -> manual data refresh.
- Closed loop means: logged-in/local capture evidence -> mapping preview -> explicit save -> content/platform version/metric snapshot -> dashboard/review visibility -> import operations smoke.
- WeChat Official Account / backend is paused. Do not resume WeChat backend discovery, mapping, sync, or public-account backend work unless the user explicitly reopens that scope.
- Bilibili content save is approved for archives/work metrics only.
- Bilibili account-level metrics remain preview-only. `accountMetrics` and `dateKeyRows` are diagnostics and must not be saved into durable content metrics or durable account snapshots yet.
- `AccountMetricSnapshot` exists as the account/platform/date-level model, but Bilibili account snapshot save is not approved.
- `/import` is the operator surface for four-platform preview/save/save-smoke, operation history, and read-only platform data health.
- `/dashboard` currently shows four content platforms, platform/source participation, readiness, and a separate account trend area that must not mix into content totals. The default metric view is recent-first, supports near-7-day and near-30-day published-work windows, and collapses repeated snapshots to the latest snapshot per work.
- `/reviews` currently explains four-platform content contribution and keeps account-level metrics outside total views, total engagement, best platform, and saved review content snapshot ids.
- Default dashboard/review/action-suggestion scope is now trusted real creator-center content-level data only. Demo, smoke, manual, csv, mediacrawler, n8n, paused WeChat, and unknown local rows remain stored but are excluded from the default operating view.
- Bilibili future durable content imports are public-only. Private, hidden, down, rejected, review, offline, and unknown-public-state archives must be skipped from durable content metrics.
- Structured provenance metadata is now the preferred trusted-scope mechanism. Legacy smoke/demo/test text matching remains only as fallback for old polluted rows.
- Clean local profile is available as an opt-in seed-free review environment; dirty/history profile remains the default.
- User trusted-scope curation is available for public creator-center content that should be hidden from operating dashboard/reviews without deleting DB rows.
- Platform save smoke and platform operations E2E smoke must run on isolated smoke databases by default, not the real dirty/history operating database.
- Content curation has an isolated Playwright E2E proof via `npm run e2e:content-curation`.
- Daily gate status is visible in the UI as a read-only summarized report.
- Real capture freshness can be checked after manual platform collection with `npm run check:real-capture-freshness`; it is read-only and separates real capture time from smoke time.
- Trusted weekly reports can be generated locally with `npm run report:trusted-weekly`; keep generated `.local/trusted-weekly-report/*` local by default because it can include real content titles.
- Dashboard post-import suggestions can be manually converted into internal action items; conversion is user-triggered and recomputes trusted evidence server-side.
- Dashboard now has an internal action-item operating panel with status/source filters and user-triggered status updates.
- `/import` now shows read-only real-capture assisted refresh command cards for the four active content platforms.
- Safe weekly export is available through `npm run report:trusted-weekly:safe`; this redacted summary is the default shareable artifact.
- Daily operations can now be run with one serial command: `npm run ops:daily-self-media`; strict local health preflight is available only when explicitly requested with `-- --preflight-health`.
- A browser-level operating smoke is available with `npm run smoke:operating-dashboard-import`; it uses an isolated sqlite DB.
- Safe weekly report API is available at `/api/self-media/reports/trusted-weekly-safe` and returns only the redacted summary.
- Local server health can be checked with `npm run check:local-server-health`; strict operating preflight is `npm run check:local-server-health -- --strict --require-trusted-data --check-page`. Daily ops preflight also requires trusted operating data and dashboard page readiness, so API-only empty/isolated DB ports or page-unavailable ports are not adopted.
- `/import` now shows the latest daily self-media ops report as a read-only operator panel, including strict preflight status when `--preflight-health` was used.
- Dashboard action items can be manually converted into content/platform-version/queue drafts after server-side trusted evidence validation.
- Action-generated content drafts can now be manually reviewed in the Content workflow: edit title/body/topic/scheduledAt/status/nextAction, keep platform version and queue synchronized, and record publish results only through manual confirmation.
- Main-session 039 update: strict local server health remains off by default, but `npm run ops:daily-self-media -- --preflight-health` runs strict health first, requires nonzero trusted content/snapshot data, and automatically adopts the healthy `preferredDashboardUrl`.
- OPS-RELIABILITY-PORTS-040 update: local server health can optionally probe `/dashboard` page readiness with `--check-page`; explicit daily ops preflight now uses this page gate and still remains read-only.
- Main operator inspection is fixed to port 3200. Use `npm run dev:operator` and open `http://localhost:3200/dashboard`.
- `/content` now uses a dedicated content workbench API and shows all local drafts/content rows with search, filters, sorting, pagination, density controls, and trusted-scope labels without changing dashboard/review totals.
- `/calendar` now includes a publish ledger for local manual publish confirmations with platform/status/date filters; these records are not real platform publish API calls and are not trusted metric evidence.
- A browser E2E for draft review is available with `npm run smoke:draft-review-ui-e2e`; it uses isolated sqlite and isolated `NEXT_DIST_DIR`.
- Main-session 041 UI decision: default user-facing pages are not fully cleaned yet. The data trust boundary is mostly established, but `/dashboard`, `/calendar`, `/import`, `/content`, and `/reviews` must now follow Operator View Data Only: show real operating metrics/charts/tables by default, and move paths, commands, audit/preflight internals, smoke/demo/debug rows, and developer diagnostics out of the primary view.
- CONTENT-PUBLISH-HISTORY-041 is accepted as read-only `/content` capability, but its default UI still needs user-facing copy/id cleanup under Operator View Data Only.
- DAILY-OPS-REPORT-CONSOLIDATION-041 is accepted as an internal safe-report consolidation command. Its local paths/URLs/port readiness are acceptable in internal reports only, not in default dashboard UI.
- OPERATOR-HOME-041 is not accepted as the final default `/dashboard` user view. It is only an intermediate diagnostic prototype until command buttons, local URLs, report paths, and preflight/audit internals are removed or moved behind advanced diagnostics.
- Latest daily ops finding from 041: 3200 health, platform health, freshness, weekly safe report, and trusted audit passed, but `daily_platform_ops_gate` failed because `smoke:platform-operations-e2e` got HTTP 500 on isolated `/import`.
- DASHBOARD-DATA-ONLY-042 is accepted. Default `/dashboard` is now the accepted data-first operator pattern; internal diagnostics stay collapsed.
- CONTENT-CALENDAR-DATA-ONLY-042 is accepted. Default `/content` and `/calendar` now prioritize real operating rows; all-local/diagnostic records require explicit scope.
- IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042 fixed the isolated `/import` 500 blocker and restored `smoke:platform-operations-e2e` plus `gate:daily-platform-ops` to PASS. `/import` still needs a warning-copy cleanup because default operation result cards expose provider ids and diagnostic phrases.
- IMPORT-WARNING-COPY-DATA-ONLY-043 is accepted. Default `/import` warning copy is now business-facing; provider/source/run/raw diagnostics stay in collapsed advanced diagnostics.
- DAILY-OPERATING-CLOSURE-043 is accepted. Current fixed 3200 operator loop is green: health/page/API/trusted-data ready, daily ops PASS, daily platform gate PASS, trusted audit PASS.
- Main-session live API check on June 5, 2026 found current 3200 trusted totals: 18 trusted contents, 18 trusted metric snapshots, 344377 views, 4258 engagement.
- DASHBOARD-NUMBER-TRUST-AUDIT-043 is accepted as an isolated dashboard number-presentation regression gate. It proves UI number surfaces against trusted audit totals on a fixture DB; a future live mode should compare current 3200 UI text against current 3200 trusted audit totals.
- DASHBOARD-LIVE-NUMBER-AUDIT-044 is accepted. Live read-only dashboard-number audit on 3200 passes and confirms current trusted totals: 18 trusted contents, 18 trusted metric snapshots, 344377 views, 4258 engagement.
- CALENDAR-REAL-SCHEDULING-WORKFLOW-044 is accepted. Default `/calendar` now shows real scheduling work: empty days remain empty, pending real drafts appear in a compact queue, and drag scheduling updates content/platform-version/queue state without creating publish ledger rows or changing trusted metric totals.
- OPERATOR-UX-FINAL-POLISH-044 is accepted. Main operator pages use more Chinese business-facing copy and keep the Operator View Data Only direction; `/ui-lab` remains an internal component-lab surface.
- MAINLINE-PRD-RECONCILIATION-045 is accepted. Current PRD gap matrix now separates: already usable, usable but needs product polish, internal-only/hidden, not implemented, and explicitly paused.
- LIVE-OPERATOR-WALKTHROUGH-045 is accepted as a read-only walkthrough. It confirmed the live 3200 trusted totals and found four remaining default UI data-only issues without mutating data.
- REMAINING-SURFACE-POLISH-045 is accepted. The 045 default UI data-only gaps are fixed: `/content` hides raw/source/provenance details behind business-readable labels, `/reviews` filters paused WeChat/公众号 actions from default action items, `/ui-lab` is hidden from operator navigation while direct access remains, and `/` now uses business-facing copy instead of implementation wording.
- PAUSED-PLATFORM-EVIDENCE-CLEANUP-047 is accepted. Default `/reviews` evidence rows now filter paused WeChat/公众号/微信后台 blocking evidence out of the visible operator evidence table without deleting or mutating stored data.
- PAUSED-PLATFORM-EVIDENCE-AUDIT-047 is accepted. The read-only audit confirmed the 047 cleanup was UI/test/handoff scope, left WeChat paused, and did not promote Bilibili account metrics beyond preview-only.
- REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047 is accepted. Screenshot regression confirmed the default `/reviews` evidence table no longer shows paused WeChat/公众号/微信后台 blocking evidence.
- Default `/reviews` evidence tables should not show paused WeChat/公众号/微信后台 blocking evidence. Advanced collapsed diagnostics or serialized page data may still contain historical WeChat strings; those are not default visible UI and require a separate diagnostics-redaction task if future cleanup is needed.
- MAIN-SESSION-STATUS-CLOSURE-048 is accepted as the dirty-worktree policy baseline. New feature work is paused until the current dirty worktree is split into reviewable acceptance bundles.
- 048 dirty-worktree cleanup rule: do not delete, roll back, format, bulk-ignore, stage, or commit broad dirty buckets until each bundle is attributed and verified by the main session.
- The four untracked personal provider files are platform-core critical assets: `douyin-personal-provider.ts`, `xiaohongshu-personal-provider.ts`, `video-account-personal-provider.ts`, and `bilibili-personal-provider.ts`. They should be handled in the platform-core acceptance bundle with Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI ordering.
- `.agents/` and `.codex/` default to local-only unless a separate security/workflow review approves a curated tracked subset. `.trellis/` requires split policy: specs/workflow/task definitions may be shareable, while workspace journals, execution logs, runtime state, and hook-like behavior stay local unless explicitly approved.
- WeChat files, scripts, routes, specs, and handoffs are paused/historical only. They must not be bundled into active four-platform work or treated as reopened WeChat backend scope without explicit user approval.
- DOCS-STATUS-BUNDLE-PREP-048 prepared the minimal docs/status bundle list: current status, 045/047/048 closure files, dirty-worktree audit/matrix/policy handoffs, platform-core plan/audit/verify/manifest handoffs, and active product-spec index coverage for `douyin-personal-v0.md`.
- Historical UI handoffs should not be bulk-indexed into the current status path. Track them only under a future archive/historical index with explicit labels such as `historical` or `superseded`.
- Main-session context handoff is available at `MAIN-SESSION-HANDOFF-044-next-main-chat.md`. A new main Orchestrator chat is recommended after 044 to reduce coordination risk while preserving PRD/state through durable docs.

## Daily Operator Runbook

Use `docs/runbooks/self-media-daily-ops.md` as the daily operating checklist.

The default daily command is:

```bash
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

Before daily gate or audit, run:

```bash
npm run check:local-server-health -- --strict --require-trusted-data --check-page
```

If strict health passes, use the report's healthy `preferredDashboardUrl` for `--dashboard-url` before `audit:trusted-dashboard`, `gate:daily-platform-ops`, or `ops:daily-self-media`. For one-command daily ops, an explicit `-- --preflight-health` can do that selection automatically. If 3200 is listening but dashboard API times out or returns an old route, follow the runbook's manual confirmation steps; do not auto-kill processes.

## Standing Commands

| Purpose | Command | Current Use |
| --- | --- | --- |
| Four-platform import operations E2E smoke | `npm run smoke:platform-operations-e2e` | Permanent regression gate for `/import` four-platform operations. |
| Four-platform content save smoke | `npm run smoke:platforms-save` | Content-level smoke for Douyin, Xiaohongshu, Video Account, and Bilibili archives. |
| Platform data health | `npm run health:platform-data` | Generates `.local/platform-data-health/report.json` for the `/import` read-only health panel. |
| Platform ops with health gate | `npm run smoke:platform-ops-with-health` | Default combined gate around local platform import work; checks health before and after save/UI operation smoke. |
| Local data quarantine check | `npm run check:local-data-quarantine` | Read-only local data classification report for trusted creator-center, demo/smoke, historical imports, paused WeChat, and unknown rows. |
| Trusted dashboard audit | `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` | Read-only comparison between trusted DB scope and dashboard/API totals. |
| Clean profile check | `npm run check:clean-profile` | Confirms the opt-in clean profile is seed-free and non-destructive. |
| Daily platform ops gate | `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` | Health gate plus trusted dashboard audit. Requires dashboard URL or JSON. |
| Real capture freshness check | `npm run check:real-capture-freshness` | Read-only check for stale/missing four-platform manual real captures. Does not collect, open browser, or write DB. |
| Local server health check | `npm run check:local-server-health` / `--strict --require-trusted-data --check-page` | Read-only check for TCP listening, dashboard API readiness, safe weekly API readiness, trusted-data readiness, optional dashboard page readiness, stale/old-route/timeout states, trusted totals summaries, and next dashboard URL action. Strict mode exits nonzero when no healthy port exists. |
| Operator dev server | `npm run dev:operator` | Fixed local operator service on 3200 using `.local/self-media.sqlite`, seed mode off, and isolated `.next-operator`. |
| Trusted weekly report | `npm run report:trusted-weekly` | Local trusted-scope weekly report. Keep `.local/trusted-weekly-report/*` local unless separately redacted. |
| Trusted weekly safe report | `npm run report:trusted-weekly:safe` | Redacted trusted weekly summary for external sharing. Run sequentially, not in parallel with the full weekly report command. |
| Daily self-media ops | `npm run ops:daily-self-media` / `npm run ops:daily-self-media -- --preflight-health` | Serial one-command daily loop. Default behavior is unchanged; explicit preflight runs strict local health with trusted-data and page readiness, adopts `preferredDashboardUrl`, and writes a blocking parent report if no healthy port exists. |
| Dashboard/import operating smoke | `npm run smoke:operating-dashboard-import` | Isolated browser smoke for suggestion-to-task, task status update, and read-only import assisted cards. |
| Action-to-content operating smoke | `npm run smoke:operating-action-to-content` | Isolated browser smoke for suggestion-to-action-to-content/calendar, idempotency, blocked evidence, and trusted totals unchanged. |
| Draft review UI E2E | `npm run smoke:draft-review-ui-e2e` | Isolated browser E2E for action-generated draft review, scheduling, calendar manual publish confirmation, idempotent publish record, and trusted totals unchanged. |
| Content curation E2E | `npm run e2e:content-curation` | Isolated Playwright proof for exclude/restore trusted-scope curation. |
| Bilibili account metrics preview | `npm run preview:bilibili-account-metrics` | Diagnostics only before any durable account snapshot save. |
| Bilibili account multi-day operating loop | See `BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-orchestrator-review.md` | Run for 2-3 actual days before considering account snapshot save. |

## Page Status

### `/import`

- Supports four-platform preview/save/save-smoke operations.
- Default `/import` should focus on platform import actions, latest real import summary, freshness, and preview/save results. Health scripts, report paths, run ids, preflight internals, raw directories, and audit details belong in collapsed advanced diagnostics.
- Shows local operation history for `preview`, `save`, and `save_smoke` actions.
- Shows daily self-media ops strict preflight status in the read-only operator panel when a preflight report exists.
- Operation history stores summary/audit fields only: created time, actor, platform, action, source, status, content count, metric count, warning count/summary, and run id.
- Operation history does not store raw payloads, cookies, tokens, request headers, raw captures, or platform response bodies.
- Shows the latest platform data health report as read-only UI.
- Shows read-only assisted refresh command cards for real capture freshness; cards are operator guidance only and do not run platform collection.
- Does not run health scripts, collect platform data, or save imports from the health panel.

### `/dashboard`

- Shows four content platforms, including Bilibili as content-level dashboard/review participant.
- Default `/dashboard` should be data-only for the operator: KPI cards, charts, content/platform performance tables, and actionable tasks. Local paths, report paths, commands, API URLs, audit command blocks, preflight/pageReady/apiReady internals, and repeated implementation disclaimers should not be visible in the primary view.
- Keeps account trend independent from content-level metric totals.
- Shows platform exposure share, source participation, account trend, and readiness in compact sections.
- Shows read-only post-import action suggestions.
- Supports user-triggered conversion of post-import suggestions into internal action items through safe server-side recomputation.
- Shows an internal action-item operating panel with source/status filters and status progression controls.
- Supports user-triggered action-item conversion into content and schedule drafts; conversion is idempotent and must pass trusted evidence validation.
- Linked action items now show direct content draft/calendar references after conversion.
- Shows a safe weekly summary that points operators to the redacted export artifact.
- Can fetch and copy the safe weekly API summary without reading the full local report.
- Current account trend can be empty; that is expected while Bilibili account snapshot save is not approved.
- Current dashboard and post-import suggestions use trusted real creator-center content-level snapshots as the default operating scope.

### `/reviews`

- Weekly/monthly reviews include four-platform content-level contribution.
- Default `/reviews` should show conclusion, metric tables, evidence summaries, and action items. Local report paths, audit internals, raw evidence ids, and debug fields should not appear in the main reading flow.
- Bilibili is labeled as archives content-level metrics.
- Account-level metrics are explained as separate from content totals.
- Account-level metrics do not affect total views, total engagement, best platform, or saved review content snapshot ids.

### `/content` and `/calendar`

- `/content/` is the manual draft review surface for action-generated content and existing platform versions.
- Default `/content/` should prioritize trusted creator-center content, user-created action workflow drafts, scheduled items, and review-needed items. All-local archive/debug rows may remain behind filters but should not be the first visual impression.
- `/content/` now reads `/api/self-media/content-workbench`, so it can show all local content/draft/manual/external rows while still labeling whether each row enters the trusted operating dashboard.
- `/content/` workbench filters/search/sorting/pagination are operator ergonomics only; they do not alter trusted dashboard/review scope.
- Draft review can update content title/topic, platform body, scheduled time, status, next action, checklist, platform version, and queue in one service-owned operation.
- `/calendar` schedule/reschedule still updates platform versions and queue state only; it must not create publish records.
- Default `/calendar` should show real actionable scheduling rows only: trusted creator-center content or explicitly user-created drafts with scheduled/publish-confirmation state. Fake-looking test/demo/smoke/local-debug rows must be excluded unless an all-local/debug filter is explicitly selected.
- `/calendar` publish ledger shows local manual publish confirmation records with platform/status/date filtering.
- Published/failed outcomes are distinct from draft/scheduled state and must be recorded through manual publish confirmation, not by pretending a platform API was called.
- Action-generated drafts remain visible in content/calendar workflow views but do not enter trusted dashboard/review metric totals unless trusted creator-center metric snapshots exist.

## Important Orchestrator Reviews

Read these first. Do not open every historical handoff unless the task needs it.

| File | Why It Matters |
| --- | --- |
| `PLATFORM-RUNBOOK-STATUS-024-orchestrator-review.md` | Current runbook baseline: four closed-loop content platforms, Bilibili account boundary, operation history, WeChat pause. |
| `PLATFORM-OPERATIONS-E2E-SMOKE-027-orchestrator-review.md` | Accepted permanent `/import` four-platform E2E smoke gate. |
| `PLATFORM-DATA-HEALTH-UI-027-orchestrator-review.md` | Accepted read-only data health panel on `/import`; includes Bilibili preview-only account status. |
| `PLATFORM-OPS-FOUR-024-orchestrator-review.md` | Unified content save smoke covers all four platforms; Bilibili archives content-level only. |
| `PLATFORM-OPERATION-HISTORY-023-orchestrator-review.md` | `/import` operation history boundary and safe summary/audit fields. |
| `DASHBOARD-FOUR-PLATFORM-POLISH-025-orchestrator-review.md` | Current dashboard layout and content/account metric separation. |
| `REVIEWS-FOUR-PLATFORM-EXPLAIN-026-orchestrator-review.md` | Current reviews behavior and account-metric exclusion from content totals. |
| `BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-orchestrator-review.md` | Accepted plan before any Bilibili durable account snapshot save. |
| `PLATFORM-HEALTH-GATE-028-orchestrator-review.md` | Accepted combined operations gate with health before/after local platform operation smoke. |
| `POST-IMPORT-ACTION-SUGGESTIONS-028-orchestrator-review.md` | Accepted read-only suggestion panel, with trusted real-data caveat. |
| `REAL-DATA-SCOPE-029-orchestrator-review.md` | Accepted trusted real creator-center default scope for dashboard, reviews, insights, and suggestions. |
| `BILIBILI-PUBLIC-ONLY-029-orchestrator-review.md` | Accepted Bilibili public-only durable content import boundary. |
| `LOCAL-DATA-QUARANTINE-PLAN-029-orchestrator-review.md` | Accepted read-only local data classification and trusted-scope-first cleanup path. |
| `TRUSTED-DASHBOARD-AUDIT-030-orchestrator-review.md` | Accepted audit proving dashboard/API totals match trusted DB scope. |
| `CLEAN-PROFILE-SEED-FREE-030-orchestrator-review.md` | Accepted opt-in clean seed-free local profile. |
| `IMPORT-PROVENANCE-METADATA-030-orchestrator-review.md` | Accepted provenance metadata as the primary trusted-scope eligibility mechanism. |
| `CONTENT-TRUST-CURATION-031-orchestrator-review.md` | Accepted non-destructive content exclusion/restoration from trusted operating scope. |
| `TRUSTED-OPERATING-REVIEW-UI-031-orchestrator-review.md` | Accepted visible trusted scope/profile/audit status UI. |
| `DAILY-IMPORT-OPERATING-GATE-031-orchestrator-review.md` | Accepted daily gate after main-session smoke isolation fix. |
| `CONTENT-CURATION-E2E-032-orchestrator-review.md` | Accepted isolated E2E proof for trusted content exclude/restore. |
| `DAILY-GATE-STATUS-UI-032-orchestrator-review.md` | Accepted read-only daily gate status UI. |
| `SMOKE-ISOLATION-REGRESSION-032-orchestrator-review.md` | Accepted hard regression contract for isolated smoke databases. |
| `DATA-FRESHNESS-NEXT-033-orchestrator-review.md` | Accepted separate real capture, smoke, and audit freshness signals. |
| `DASHBOARD-REALITY-COPY-033-orchestrator-review.md` | Accepted dashboard copy that makes trusted/real scope explicit. |
| `OPERATOR-RUNBOOK-033-orchestrator-review.md` | Accepted daily operator runbook as the main operations checklist. |
| `REAL-CAPTURE-REFRESH-034-orchestrator-review.md` | Accepted read-only real capture freshness check after manual collection. |
| `TRUSTED-WEEKLY-REPORT-034-orchestrator-review.md` | Accepted local trusted weekly report and local-only evidence boundary. |
| `ACTION-SUGGESTION-TO-TASKS-034-orchestrator-review.md` | Accepted user-triggered suggestion-to-action-item conversion. |
| `ACTION-TASKS-OPERATING-035-orchestrator-review.md` | Accepted dashboard internal action-item operating panel. |
| `REAL-CAPTURE-ASSISTED-REFRESH-035-orchestrator-review.md` | Accepted read-only assisted refresh command cards on `/import`. |
| `TRUSTED-WEEKLY-REPORT-EXPORT-035-orchestrator-review.md` | Accepted redacted weekly summary as the default shareable report artifact. |
| `OPERATING-E2E-DASHBOARD-IMPORT-036-orchestrator-review.md` | Accepted browser-level operating smoke after main-session assertion hardening. |
| `DAILY-OPS-ONE-COMMAND-036-orchestrator-review.md` | Accepted serial daily operator command after stale-report hardening. |
| `SAFE-WEEKLY-REPORT-UI-EXPORT-036-orchestrator-review.md` | Accepted safe weekly report API/UI export path. |
| `DAILY-OPS-UI-RUNNER-037-orchestrator-review.md` | Accepted read-only daily ops report panel on `/import`. |
| `LOCAL-SERVER-HEALTH-037-orchestrator-review.md` | Accepted read-only local server health diagnostic and current 3200 timeout caveat. |
| `ACTION-TO-CONTENT-WORKFLOW-037-orchestrator-review.md` | Accepted action-item to content/schedule draft workflow with trusted evidence validation. |
| `OPERATING-E2E-ACTION-TO-CONTENT-038-orchestrator-review.md` | Accepted isolated browser E2E for action-to-content workflow. |
| `LOCAL-SERVER-OPERATING-MODE-038-orchestrator-review.md` | Accepted strict local-server health mode and the default-off policy for automatic daily ops use. |
| `CONTENT-DRAFT-REVIEW-038-orchestrator-review.md` | Accepted manual draft review after main-session publish-confirmation hardening. |
| `DAILY-OPS-PREFLIGHT-039-orchestrator-review.md` | Accepted optional strict health preflight after main-session trusted-data and port-range hardening. |
| `DRAFT-REVIEW-UI-E2E-039-orchestrator-review.md` | Accepted browser E2E for content draft review to calendar manual publish confirmation. |
| `CONTENT-LIBRARY-ALL-DRAFTS-039-orchestrator-review.md` | Accepted dedicated all-local-content workbench boundary. |
| `PUBLISH-LEDGER-OPERATIONS-040-orchestrator-review.md` | Accepted `/calendar` publish ledger for local manual confirmation records. |
| `OPS-RELIABILITY-PORTS-040-orchestrator-review.md` | Accepted page-ready local server health and fixed 3200 operator service. |
| `CONTENT-WORKBENCH-FILTERS-040-orchestrator-review.md` | Accepted `/content` workbench filters, sorting, pagination, and density controls. |
| `OPERATOR-VIEW-DATA-ONLY-041-orchestrator-decision.md` | Current UI rule from user feedback: default pages must show filtered real operating data, charts, and tables only; internal diagnostics move out of the primary view. |
| `CONTENT-PUBLISH-HISTORY-041-orchestrator-review.md` | Accepted read-only per-content publish history, with follow-up UI copy/id cleanup required. |
| `DAILY-OPS-REPORT-CONSOLIDATION-041-orchestrator-review.md` | Accepted internal redacted daily ops summary command; not default dashboard UI. |
| `OPERATOR-HOME-041-orchestrator-review.md` | Not accepted as final default dashboard; requires data-only cleanup and diagnostics relocation. |
| `DASHBOARD-DATA-ONLY-042-orchestrator-review.md` | Accepted data-first default `/dashboard` and collapsed diagnostics pattern. |
| `CONTENT-CALENDAR-DATA-ONLY-042-orchestrator-review.md` | Accepted data-only default `/content` and `/calendar` filtering. |
| `IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042-orchestrator-review.md` | Accepted `/import` gate repair and `/reviews` cleanup, with `/import` warning-copy follow-up required. |
| `IMPORT-WARNING-COPY-DATA-ONLY-043-orchestrator-review.md` | Accepted business-facing default `/import` warning copy. |
| `DAILY-OPERATING-CLOSURE-043-orchestrator-review.md` | Accepted current green daily operating loop on fixed 3200. |
| `DASHBOARD-NUMBER-TRUST-AUDIT-043-orchestrator-review.md` | Accepted isolated dashboard number-presentation regression gate; recommends future live mode. |
| `DASHBOARD-LIVE-NUMBER-AUDIT-044-orchestrator-review.md` | Accepted live read-only dashboard number audit on fixed 3200. |
| `CALENDAR-REAL-SCHEDULING-WORKFLOW-044-orchestrator-review.md` | Accepted real scheduling workflow for default `/calendar`; no fake slots and no publish-ledger side effects. |
| `OPERATOR-UX-FINAL-POLISH-044-orchestrator-review.md` | Accepted business-facing Chinese polish across main operator pages. |
| `MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md` | Accepted PRD gap matrix for usable/product-polish/internal/not-implemented/paused buckets. |
| `LIVE-OPERATOR-WALKTHROUGH-045-worker-handoff.md` | Accepted read-only live 3200 walkthrough that identified remaining surface polish gaps. |
| `REMAINING-SURFACE-POLISH-045-worker-handoff.md` | Accepted UI-only fix for remaining default data-only gaps on `/content`, `/reviews`, `/ui-lab` navigation, and `/`. |
| `MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md` | Current 045 status closure and accepted-state summary. |
| `PAUSED-PLATFORM-EVIDENCE-CLEANUP-047-worker-handoff.md` | Accepted default `/reviews` paused WeChat evidence cleanup. |
| `PAUSED-PLATFORM-EVIDENCE-AUDIT-047-auditor-handoff.md` | Accepted read-only audit for the 047 paused evidence cleanup. |
| `REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047-worker-handoff.md` | Accepted screenshot regression proof for default `/reviews` paused evidence cleanup. |
| `MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` | Current 047 status closure and accepted-state summary. |
| `DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md` | Dirty worktree inventory and risk list; confirms broad modified/untracked buckets and no-delete/no-rollback posture. |
| `WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md` | Acceptance matrix mapping dirty files to accepted handoff lineage and recommended verification bundles. |
| `CORE-LAYER-DIFF-ATTRIBUTION-048-auditor-handoff.md` | Core-layer attribution for Types, Config, Repo, Providers, Service, and Runtime; flags personal providers as platform-core critical. |
| `LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md` | Local workflow asset policy for `.agents/`, `.codex/`, `.trellis/`, handoffs, specs, and scripts. |
| `HANDOFF-SPEC-RETENTION-POLICY-048-auditor-handoff.md` | Retention policy for untracked handoffs/specs; identifies current files to track, paused WeChat labeling, and archive/index handling for historical UI notes. |
| `MAIN-SESSION-STATUS-CLOSURE-048-orchestrator-review.md` | Current 048 dirty-worktree policy closure and next acceptance-bundle order. |
| `PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md` | Read-only platform-core-four bundle plan in Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI order. |
| `PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md` | Audit of the platform-core bundle plan; confirms four personal providers, WeChat pause, and Bilibili account preview-only guardrails. |
| `PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md` | Verification-only handoff for platform-core-four; required core sequence passed, conditional live daily gate remained a separate timeout follow-up. |
| `PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md` | Active manifest for platform-core-four; lists must-include files, exclusions, paused WeChat, diagnostics-only Bilibili account preview, and later bundles. |
| `DOCS-STATUS-BUNDLE-PREP-048-worker-handoff.md` | Minimal docs/status bundle prep; adds active Douyin spec index entry and recommends archive/index handling for historical UI handoffs. |
| `MAIN-SESSION-HANDOFF-044-next-main-chat.md` | Recommended entrypoint for starting a fresh main Orchestrator chat without losing PRD/state. |

## Reading Order For Future Workers

1. Read `AGENTS.md`.
2. Read `docs/handoffs/README.md`.
3. Read this file.
4. If doing platform operations, read `PLATFORM-RUNBOOK-STATUS-024-orchestrator-review.md`, then `docs/handoffs/PLATFORM-RUNBOOK-019.md`.
5. If touching `/import`, read `PLATFORM-OPERATIONS-E2E-SMOKE-027-orchestrator-review.md`, `PLATFORM-DATA-HEALTH-UI-027-orchestrator-review.md`, and `PLATFORM-OPERATION-HISTORY-023-orchestrator-review.md`.
6. If touching `/dashboard`, read `DASHBOARD-FOUR-PLATFORM-POLISH-025-orchestrator-review.md`.
7. If touching `/reviews`, read `REVIEWS-FOUR-PLATFORM-EXPLAIN-026-orchestrator-review.md`.
8. If touching Bilibili account-level metrics, read `BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-orchestrator-review.md` and keep the work preview-only unless the Orchestrator explicitly approves durable save.
9. If touching reports, freshness, or suggestion-to-task conversion, read the 034 orchestrator reviews before coding.
10. If touching action tasks, assisted refresh, or weekly exports, read the 035 orchestrator reviews before coding.
11. If touching daily ops, browser operating smoke, or safe weekly API/UI, read the 036 orchestrator reviews before coding.
12. If touching local server diagnostics, daily ops UI, or action-to-content conversion, read the 037 orchestrator reviews before coding.
13. If touching action-to-content E2E, strict local-server health, or content draft review, read the 038 orchestrator reviews before coding.
14. If touching daily ops preflight, draft review E2E, or the all-content workbench, read the 039 orchestrator reviews before coding.
15. If touching publish ledger, local server port reliability, or content workbench filters, read the 040 orchestrator reviews before coding.
16. If touching any user-facing page, read `OPERATOR-VIEW-DATA-ONLY-041-orchestrator-decision.md` and keep the default UI data-only.
17. If touching dashboard home, daily ops reports, content publish history, or platform ops E2E, read the 041 orchestrator reviews first.
18. If touching dashboard/content/calendar/import/reviews data-only defaults or platform ops gate, read the 042 orchestrator reviews first.
19. If touching import warning copy, daily ops closure, or dashboard number audits, read the 043 orchestrator reviews first.
20. If starting a new main Orchestrator chat, read `MAIN-SESSION-HANDOFF-044-next-main-chat.md` after this file.
21. If touching live dashboard number audits, calendar scheduling workflow, or final operator page polish, read the 044 orchestrator reviews first.
22. If continuing after 045 closure, read `MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md` and keep the accepted data-only UI fixes as the current baseline.
23. If continuing after 047 closure, read `MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` and keep paused WeChat evidence out of default visible `/reviews` evidence tables.
24. If continuing after 048 closure, read `MAIN-SESSION-STATUS-CLOSURE-048-orchestrator-review.md` before new feature work and package dirty changes by acceptance bundle first.
25. If preparing a docs/status bundle, read `HANDOFF-SPEC-RETENTION-POLICY-048-auditor-handoff.md` and `DOCS-STATUS-BUNDLE-PREP-048-worker-handoff.md`; do not bulk-index historical UI handoffs into the current status path.

## Guardrails

- Do not change business code from this status-index task.
- Do not resume WeChat Official Account / backend work.
- Do not promote Bilibili account diagnostics into content metrics.
- Do not treat operation history as raw evidence storage.
- Do not show internal diagnostics in default user-facing dashboards: local file paths, handoff/report paths, run ids, API URLs, npm commands, raw directories, evidence files, health probe internals, audit command blocks, smoke/demo/fixture rows, and implementation-debug wording must be hidden behind advanced diagnostics or explicit all-local/debug filters.
- Do not paste raw platform payloads, cookies, tokens, headers, credentials, comment bodies, or danmu text into docs, tests, issues, or chat.
- Do not use all-data/local-debug rows for default dashboard, review, insight, or post-import action totals.
- Do not delete, clear, or migrate local database rows without a separate main-session approval and a non-destructive backup plan.
- Do not run the trusted dashboard audit without a dashboard URL or dashboard JSON when you need a pass/fail comparison against the UI/API.
- Do not let smoke commands overwrite real creator-center provenance in `.local/self-media.sqlite`.
- Do not run content curation E2E and platform operations E2E in parallel; both launch temporary Next dev servers and browser sessions.
- Do not paste generated trusted weekly reports wholesale into chat/docs/issues unless a separate redaction/export task has removed real local content titles and private operating details.
- Do not run `npm run report:trusted-weekly` and `npm run report:trusted-weekly:safe` in parallel against the same local sqlite DB; run them sequentially.
- Do not turn `/import` assisted refresh command cards into one-click real-platform collection without separate main-session approval.
- Do not run `npm run ops:daily-self-media` in parallel with browser/E2E gates; it is serial internally but still uses local sqlite, ports, and temporary browser sessions through child commands.
- If the default 3200 dev server is listening but API calls time out, return old-route/404, use empty/isolated DB data, or cannot open `/dashboard`, run `npm run check:local-server-health -- --ports=3200,3201 --strict --require-trusted-data --check-page`, then use `-- --dashboard-url=http://127.0.0.1:<healthy-port>/api/self-media/dashboard` for daily/audit/ops commands, or run `npm run ops:daily-self-media -- --preflight-health` for explicit automatic URL selection. Only stop/restart a stale dev server after manual confirmation; do not auto-kill processes.
- Do not expose or download the full local weekly report through the safe weekly API; the safe API returns redacted summary only.
- Do not auto-convert action items into content drafts; action-to-content is a user-triggered workflow and must recompute trusted evidence server-side.
- Do not treat action-generated drafts, schedules, or local publish confirmations as trusted metric evidence. Trusted totals still require real creator-center content-level metric snapshots.
- Do not call real platform publish APIs from draft review or calendar workflows; publish results are manual records only.
- Do not write `published`, `failed`, or `publishedAt` through generic platform-version patch; publish success/failure must use explicit publish confirmation.
- Do not treat publish ledger rows as trusted metric evidence.
- Do not trust a dev server merely because APIs return 200; daily preflight should require trusted operating data before adopting `preferredDashboardUrl`.
- When running multiple Next dev servers in parallel, use an isolated `NEXT_DIST_DIR` to avoid shared `.next` cache collisions.
- Keep the persistent operator inspection service on port 3200; temporary E2E/dev ports must clean up after themselves.
- During the 048 dirty-worktree closure, do not start new feature work until dirty buckets are reviewed in small acceptance bundles. Do not delete, roll back, format, bulk-ignore, stage, or commit broad dirty buckets without an explicit main-session bundle decision.
- Treat the four personal provider files as platform-core critical until proven otherwise in the platform-core bundle.
- Keep `.agents/` and `.codex/` local by default; split `.trellis/` into shareable specs/workflow/task definitions versus local journals/logs/runtime state by a separate policy decision.
- Treat WeChat scripts/routes/specs as paused/historical only unless the user explicitly reopens WeChat Official Account / backend scope.
- Do not bulk-index historical UI handoffs into current status. Use a future archive/historical index with explicit labels before tracking them broadly.
