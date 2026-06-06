# MAINLINE-REAL-WORK-DOMAIN-AND-CAPTURE-REALITY-070 worker handoff

## Run metadata

- Started: 2026-06-06 23:06:00 +08:00
- Finished: 2026-06-06 23:28:25 +08:00
- Elapsed: 22m
- Workload class: L
- Extra-depth pass: not required; elapsed was above 15 minutes.

## Scope

Fixed the product boundary between real operator work and local acceptance/test records:

- Calendar default now only shows real work schedules.
- Acceptance/test schedules are isolated into a closed developer-only section.
- Manual publish UI is now framed as a selected-work helper, not an old-package ledger.
- Import first screen explains the real capture modes and why website login plus app refresh does not fetch data.

No database rows or data files were deleted.

## Official / authoritative reference check

Checked official platform entry points before changing the capture copy:

- Douyin Open Platform OAuth/user info: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/oauth2-user-info
- Douyin Open Platform video data: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-data/
- Douyin Open Platform video create/upload: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-create/
- Bilibili Open Platform docs entry: https://openhome.bilibili.com/doc
- Xiaohongshu official open platform entry: https://open.xiaohongshu.com/
- Xiaohongshu official Ark/business open platform entry: https://ark.xiaohongshu.com/
- WeChat Developers documentation entry: https://developers.weixin.qq.com/doc/

Conclusion used in UI copy:

- Douyin has official OAuth and video/data capability docs, but current product has no connected OAuth/token flow.
- Bilibili has an official open platform entry; Bilibili account metrics remain preview-only and are not durable totals.
- Video Account and Xiaohongshu did not have a confirmed public stable creator-data API path in the checked official entry points for this product's current scope.
- Therefore the product must not imply that logging into a platform webpage and refreshing this app can auto-capture data.

## Changes made

### Calendar real-work default

Files:

- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/app/globals.css`
- `tests/ui-harness.test.mjs`

Implemented:

- Added `isAcceptanceOrTestCalendarText` and `isAcceptanceOrTestCalendarItem`.
- Default calendar now hides obvious local acceptance/test schedules, including `050-069`, `MAINLINE`, `HUMAN-MOUSE`, `验收`, `回归`, `走查`, `真实鼠标`, `creator day workflow`, smoke/demo/fixture/debug.
- `我的真实作品...` is explicitly allowed so the 070 acceptance-created real work is not hidden.
- Added closed `本地验收数据 / 测试内容` section for isolated local test schedules.
- Default calendar still renders clickable empty time cells when no real schedule exists.
- Historical publish ledger and draft pool remain closed by default.

### Manual publish helper

Files:

- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `tests/ui-harness.test.mjs`

Implemented:

- Renamed user-facing publish package language to `手动发布助手` / `手动发布动作`.
- Content page helper now shows only the selected content's platform actions, capped to the four platform versions.
- If no content is selected, it shows guidance instead of old packages.
- If a version is not scheduled, `记录已发布` is not shown as the main action.
- Calendar inspector helper says clearly that it is not automatic publishing: copy text/tags, open official backend, then manually confirm status.
- Fixed content-page selection stability after creating new work: selected content is not forcibly switched away while it still exists in the workbench.

### Import capture reality

Files:

- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/ui-harness.test.mjs`

Implemented first-screen copy for three modes:

- A. 手动导入: upload/paste exported CSV/XLSX/JSON and save after preview.
- B. 浏览器辅助: user logs into platform backend; local browser assistant reads current page; no password or sensitive request details saved.
- C. 官方 API 授权: requires open platform capability, app review, OAuth/token/scope.

Also added:

- Explanation that logging into Douyin/Video Account pages and refreshing this app will not auto-update data.
- `立即检查登录/授权状态` button.
- Honest status message: official API not connected or not authorized; browser-assisted session not connected.
- Copy that automatic capture requires authorized API or browser-assisted session; without credentials the UI will not claim hourly auto-capture.

## Real browser evidence

Screenshots saved locally and intentionally not committed:

- `.local/real-work-domain-070/01-dashboard-first-viewport.png`
- `.local/real-work-domain-070/02-calendar-default-filtered.png`
- `.local/real-work-domain-070/03-calendar-empty-slot-panel.png`
- `.local/real-work-domain-070/04-content-create-prefilled.png`
- `.local/real-work-domain-070/05-content-saved-publish-helper.png`
- `.local/real-work-domain-070/06-content-publish-helper-070-only.png`
- `.local/real-work-domain-070/07-calendar-070-visible.png`
- `.local/real-work-domain-070/08-import-first-viewport.png`
- `.local/real-work-domain-070/09-import-auth-check-result.png`

Browser findings from `http://localhost:3200/dashboard`:

- Dashboard first viewport: no `068/069/MAINLINE/验收/creator day workflow` or backend task noise; data/stat wording visible.
- Calendar default after mouse navigation:
  - visible cards had no `050-069`, `MAINLINE`, `验收`, `回归`, `走查`, `真实鼠标`, or `creator day workflow` text.
  - `本地验收数据 / 测试内容` was closed and reported 203 isolated records.
  - empty slot count was 26/25 across checks.
  - history ledger was closed.
- Calendar blank slot:
  - clicked `2026-06-01` hour `9`.
  - create panel prefilled `2026-06-01T09:00`.
  - content link carried `scheduledAt=2026-06-01T01:00:00.000Z`.
- Content creation:
  - created `我的真实作品070测试`.
  - API confirmed content `content-creator-987ca8c17ad1`.
  - API confirmed four scheduled platform versions at `2026-06-01T01:00:00Z`.
- Publish helper:
  - `/content?contentId=content-creator-987ca8c17ad1` showed 4 helper cards.
  - all helper cards had `contentId=content-creator-987ca8c17ad1`.
  - no old `068/069/MAINLINE/走查` package noise.
  - copy clearly said not automatic publishing.
- Calendar after creation:
  - showed `09:00 我的真实作品070测试 4个平台 · 等待发布确认`.
  - card was in `data-calendar-date="2026-06-01"` and `data-calendar-hour="9"`.
- Import first screen:
  - showed 手动导入 / 浏览器辅助 / 官方 API 授权.
  - explained why web login + refresh does not auto-update.
  - auth check button returned: official API not connected/authorized; browser-assisted session not connected.

## Verification

Passed:

- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- `git diff --check`

The final strict local server health check passed on port 3200 with page, API, trusted data, and safe weekly readiness all green.

## Boundaries kept

- Did not call real publish APIs.
- Did not save login credentials, tokens, platform raw request details, comments, danmu, or sensitive material.
- Did not delete DB rows or data files.
- Did not batch delete files.
- WeChat Official Account / 公众号 remains paused.
- Bilibili account metrics remain preview-only and out of durable totals.
- `.local`, `.agents`, `.codex`, `.trellis`, and unrelated dirty worktree files were not staged.

## Residual risks

- The local DB still contains many historical acceptance/test rows; they are now isolated by default, not deleted.
- The acceptance/test classifier is intentionally conservative around obvious local test terms and task numbers. A real user title containing those exact patterns could be hidden unless it uses a real-work marker such as `我的真实作品`.
- Official API capture remains a future integration; current product truthfully exposes manual import/browser-assisted/authorization-needed states only.
