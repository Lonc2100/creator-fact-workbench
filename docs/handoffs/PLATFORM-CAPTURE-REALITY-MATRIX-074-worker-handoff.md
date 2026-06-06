# PLATFORM-CAPTURE-REALITY-MATRIX-074 Worker Handoff

## Scope

- Task:重新梳理抖音、小红书、视频号、B站的数据抓取现实能力，并把 `/import` / `/dashboard` 的自动抓取暗示收回到真实状态。
- Fixed entry for acceptance: `http://localhost:3200/dashboard` -> `/import`.
- Boundary kept: no real platform API calls, no account/password/cookie/token/header/raw payload storage, no WeChat Official Account resume, no Bilibili account metrics promotion.

## Official / Authoritative Sources

- Douyin Open Platform access token / OAuth area: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/get-access-token
- Douyin Open Platform video data: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-data/
- Douyin Open Platform video create/upload: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-create/
- Bilibili Open Platform documentation entry: https://openhome.bilibili.com/doc
- Bilibili Open Platform entry from user task: https://open.bilibili.com/doc
- Xiaohongshu Open Platform: https://open.xiaohongshu.com/
- Xiaohongshu Ark / business platform: https://ark.xiaohongshu.com/
- WeChat Developers documentation entry: https://developers.weixin.qq.com/doc/
- WeChat official Video Account live open-ability documentation example: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/channels-live.html
- Video Account assistant official entry: https://channels.weixin.qq.com/

I did not rely on unofficial endpoint dumps, cookies, passwords, request headers, or raw request details. GitHub automation projects were not used as implementation authority because this task required official/authoritative confirmation and the product must not present unofficial browser scraping as official API capture.

## Reality Matrix

| Platform | Official API feasibility | App review required | OAuth/token/scope required | Content-level data | Publish/draft support | Scheduled auto-capture | Current product state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 抖音 | Future API adapter is plausible from official OAuth/video-data docs | Yes | Yes, OAuth/access token/scope | Official video-data docs exist, but not connected here | Official create/upload docs exist; current product must not auto publish | No, not without authorized API or browser-assisted session | Manual import + browser-assisted local sanitized mapping only; API not connected |
| 小红书 | No confirmed public stable personal creator-data API for this product scope | Official platform/Ark capability depends on qualification | Not connected here | Current product should treat as manual/browser-assisted only | Do not claim official draftbox/API publishing | No | Manual import + browser-assisted local sanitized mapping only |
| 视频号 | No confirmed stable creator content-data API for this product scope | WeChat open abilities are scenario-specific | Not connected here | Current product should treat Video Account assistant as manual/browser-assisted only | Do not claim official draftbox/API publishing | No | Manual import + browser-assisted local sanitized mapping only |
| B站 | Future adapter is plausible from official open platform capabilities | Yes, developer/platform capability review | Yes, authorization/access token | Content-level archive/work metrics can be imported locally; official API not connected here | Content distribution can be future adapter; current product must not auto publish | No, not without authorized API or browser-assisted session | Content-level import/save works locally; account metrics remain preview-only |

## Product Changes

Files changed:

- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/app/globals.css`
- `tests/ui-harness.test.mjs`

Implemented:

- Added a first-screen `platform-capture-reality-matrix` on `/import`.
- Each platform now displays:
  - `未授权`
  - `API 未接入`
  - whether official API is plausible/confirmed
  - whether app review is required
  - OAuth/access-token/scope requirement in user-safe wording
  - content-level data reality
  - publish/draft reality
  - scheduled auto-capture reality
  - current implemented state
  - browser-assisted and manual-import availability
  - latest import/capture time
  - `自动抓取：未启用`
- Added disabled `连接平台：待接入...` entries. They are placeholders only; no OAuth flow is implemented.
- `/import` first screen now directly answers:
  - Web login plus app refresh does not update data because the system does not read platform webpage login state.
  - Current update path is manual import or browser-assisted local reading.
  - Douyin and Bilibili are future API-adapter candidates.
  - Xiaohongshu and Video Account remain manual/browser-assisted unless a confirmed official creator-data API is introduced.
  - Current automatic capture is not enabled.
- Changed the scheduled panel from `定时抓取设定` to `手动检查节奏 / 非自动抓取`.
- Dashboard wording now says:
  - `人工导入新鲜度`
  - `手动检查节奏`
  - login refresh will not auto-update
  - no background automatic capture is running
  - post-publish metrics require manual import/browser-assisted recovery.

## Validation

Completed:

- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS, 131/131
- `npm run test:ui-harness`: PASS, 15/15
- `npm run build`: PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS, healthy port `3200`
- Browser acceptance: PASS
  - Started at `http://localhost:3200/dashboard`
  - Clicked the sidebar `/import` navigation
  - Verified first screen contains:
    - `网页登录状态不会自动被本系统读取`
    - `当前自动抓取：未启用`
    - `手动导入`
    - `未来可 API`
    - `浏览器辅助`
    - `连接平台`
    - `待接入`
    - four platform names and status labels
- `git diff --check`: PASS

Operational note:

- Port `3200` was initially running an older `next start` process from the same project, so the browser still showed the old copy after the new build. I restarted that local `next start` process on `3200`, reran health check, then repeated browser acceptance against the refreshed page.

## Security Boundary

- No real platform APIs were called.
- No OAuth flow was implemented.
- No passwords, cookies, tokens, headers, raw payloads, or sensitive request details were requested or stored.
- Existing unrelated dirty files were not staged.
- No files or directories were deleted.
