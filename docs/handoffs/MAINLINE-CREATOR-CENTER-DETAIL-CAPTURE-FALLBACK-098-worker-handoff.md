# MAINLINE-CREATOR-CENTER-DETAIL-CAPTURE-FALLBACK-098 Worker Handoff

## Summary

- 097 已提交：`f8e6dca3f842` (`fix(self-media): add creator-center row selectors`)。
- 098 已实现“当前作品/笔记详情页预览”兜底入口和后端 action。
- 本轮未真实保存数据：当前 live 平台窗口仍停在列表页/管理页，不是具体作品/笔记详情页；详情页预览 fail-closed，`saveCandidateCount=0`。

## 097 Commit

- Commit hash: `f8e6dca3f842`
- Commit message: `fix(self-media): add creator-center row selectors`
- Stage 范围按 097 指定文件精确提交，未 stage unrelated dirty files，未使用 `git add .`。
- 094 handoff 仍未提交，继续作为 untracked docs evidence 保留。

## 098 Implementation

- `src/domain/self-media/types/self-media-types.ts`
  - 新增 browser action：`capture_current_detail_preview`。
  - 新增详情页 provenance：`creator_center_owned_detail`。
  - 新增详情页 confidence：`owned_creator_center_detail`。
- `src/domain/self-media/providers/creator-center-row-selector.ts`
  - 新增 `selectDouyinCreatorCenterDetailRow` / `selectXiaohongshuCreatorCenterDetailRow`。
  - 详情页 selector 只产出单条 row。
  - 要求 stable platform ID、非通用标题、详情页同一上下文指标覆盖。
  - 拒绝 `fallback_text_hash`、`notes-request`、`semiTab`、日期 `2026` 误读、`__SVG_SPRITE_NODE__`/sprite/svg/node/icon 这类通用 DOM id。
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
  - 支持 `capture_current_detail_preview`。
  - 当前 URL 必须像详情/数据页，不能在 `content/manage` 列表页从全页链接猜详情。
  - save 使用最近一次 preview 的 `session.lastRows`，不会保存时重新跑列表 selector 覆盖详情 row。
- `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
  - 支持 `capture_current_detail_preview`。
  - 当前 URL 不能是 `/new/note-manager` 列表页，必须像详情/数据/笔记页。
  - save 使用最近一次 preview 的 `session.lastRows`。
- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
  - provider-level defense 同时接受可信列表 row 和可信详情 row。
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - 抖音新增按钮：`从当前作品详情页预览`。
  - 小红书新增按钮：`从当前笔记详情页预览`。
  - 文案说明：列表抓不到时，先在平台窗口点开具体作品/笔记的数据/详情页，再回到系统预览。
- `tests/self-media-contract.test.ts`
  - 新增合成详情页 fixture：clean detail row 可保存，generic title / `notes-request` / `__SVG_SPRITE_NODE__` 拒绝。
  - 验证详情 row 保存后进入 trusted dashboard metrics，但不进入 default calendar。
- `tests/ui-harness.test.mjs`
  - 增加 UI 按钮/action/route selector 静态契约。

## Live Acceptance

- 固定入口已验证：
  - `http://localhost:3200/dashboard`
  - `http://localhost:3200/import`
- UI 验证：
  - 抖音详情页预览按钮存在。
  - 小红书详情页预览按钮存在。
- 保存前 dashboard/calendar：
  - trusted contents: `12`
  - metric snapshots: `12`
  - trusted total views: `73719`
  - calendar items: `195`
- 列表页预览：
  - Douyin: `ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_content_rows`, page `https://creator.douyin.com/creator-micro/content/manage`
  - Xiaohongshu: `ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_creator_note_rows`, page `https://creator.xiaohongshu.com/new/note-manager`
- 详情页预览初次 live 发现的问题：
  - Douyin 当前仍在列表页时，一度把通用 DOM id `__SVG_SPRITE_NODE__` 和通用标题 `内容管理` 误判成 detail row。
  - 未保存；随后已修复：要求当前 URL 像详情/数据页，并拒绝 SVG/sprite/node 通用 ID 与通用详情标题。
- 修复后详情页预览：
  - Douyin: `ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_detail_content_row`, page 仍是 `https://creator.douyin.com/creator-micro/content/manage`
  - Xiaohongshu: `ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_detail_note_row`, page 仍是 `https://creator.xiaohongshu.com/new/note-manager`
- 2026-06-08 12:06 +08:00 重新复查详情页预览：
  - Douyin: `ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_detail_content_row`, page `https://creator.douyin.com/creator-micro/content/manage`
  - Xiaohongshu: `ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_detail_note_row`, page `https://creator.xiaohongshu.com/new/note-manager`
- 是否真实抓到详情页 clean row：否。
- 是否真实保存：否，保存 `0` 条。
- 保存后 dashboard/calendar：
  - trusted contents: `12`
  - metric snapshots: `12`
  - trusted total views: `73719`
  - calendar items: `195`
  - default calendar Douyin/XHS items: `0`
- calendar 是否污染：否。

## Failure Point

当前失败点不是登录状态，也不是保存确认；两平台都显示 `logged_in_or_accessible`。

具体失败点：

- Douyin：当前平台窗口停在作品管理列表页 `content/manage`，不是具体作品的数据/详情页；详情页兜底按 URL 闸门 fail-closed，未抽取 ID/title/metric。
- Xiaohongshu：当前平台窗口停在笔记管理列表页 `/new/note-manager`，不是具体笔记的数据/详情页；详情页兜底按 URL 闸门 fail-closed，未抽取 ID/title/metric。

下一步具体操作：

- 用户需要在已打开的抖音窗口里点开一个具体作品的数据/详情页。
- 用户需要在已打开的小红书窗口里点开一个具体笔记的数据/详情页。
- 回到 `/import` 点击对应的“从当前作品/笔记详情页预览”。
- 若出现 clean detail row，再由用户显式勾选确认并保存。

## Validation

- `git diff --check`：pass
- `npm run typecheck`：pass
- `npm run test:self-media`：pass (`147` tests)
- `npm run test:ui-harness`：pass (`19` tests)
- `NEXT_DIST_DIR=.next-build-098-main npm run build`：pass
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`：pass, healthy port `3200`
- 2026-06-08 12:06 +08:00 重新验证：
  - `git diff --check`：pass
  - `npm run typecheck`：pass
  - `npm run test:self-media`：pass (`147` tests)
  - `npm run test:ui-harness`：pass (`19` tests)
  - `NEXT_DIST_DIR=.next-build-098-main npm run build`：pass
  - `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`：pass

## Safety Notes

- 未保存 password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace。
- 未提交真实平台 DOM、截图或页面内容。
- 未调用真实发布 API。
- 未恢复 WeChat / 公众号。
- 视频号仍 discovery-only。
- B 站账号指标仍 preview-only。
- 未把 MediaCrawler public search/detail/creator 数据写入 trusted dashboard。
- 未使用 `browser.newContext` 回退临时登录；继续使用 persistent profile。

## Timing

- Started: 2026-06-08 11:28 +08:00
- Finished: 2026-06-08 11:41 +08:00
- Elapsed: 约 13 分钟
- Workload class: M
- 需主会话判断：是
