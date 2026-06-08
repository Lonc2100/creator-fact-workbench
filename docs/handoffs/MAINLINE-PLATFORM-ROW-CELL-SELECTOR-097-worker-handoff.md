# MAINLINE-PLATFORM-ROW-CELL-SELECTOR-097 Worker Handoff

## Summary

- 096 fail-closed 修复已提交：`d8c667740cfb` (`fix(self-media): fail closed on noisy creator-center previews`)。
- 094 handoff 未提交，仍作为 untracked docs evidence 保留；本轮阶段 1 按用户给出的 096 精确文件列表提交，没有把 094 混入 096 commit。
- 097 已实现抖音 / 小红书平台专用 creator-center row/cell selector，避免泛扫整块 DOM 后直接生成保存候选。
- 本轮没有真实保存数据：两平台 live 预览均 fail-closed，`saveCandidateCount=0`，未进入用户确认保存。

## Files Changed For 097

- `src/domain/self-media/providers/creator-center-row-selector.ts`
  - 新增纯函数 selector：`selectDouyinCreatorCenterRows` / `selectXiaohongshuCreatorCenterRows`。
  - 只从候选作品行/表格行/卡片内提取标题、稳定平台 ID、同一行/同一卡片指标。
  - 拒绝 `fallback_text_hash`、`notes-request`、`semiTab`、tab/container/request/list 父级块、0 指标行、多日期父容器和动作噪声块。
  - 仅返回 `hasTrustedCreatorCenterRowShape(...)` 通过的 clean row；非可信候选不进入 preview row。
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
  - route 只把页面 DOM 映射成脱敏候选结构；真正筛选交给 Douyin selector。
  - 从链接 query 中提取 `modal_id` / `item_id` / `aweme_id` 作为候选 ID，但保存 URL 继续去 query/hash。
  - route `saveCandidateRows` 复用 provider 同款可信 row shape。
- `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
  - route 只把页面 DOM 映射成脱敏候选结构；真正筛选交给 XHS selector。
  - 支持从 `note_id` / `noteId` / `explore/<id>` / `note/<id>` 提取稳定 ID，但保存 URL 继续去 query/hash。
  - route `saveCandidateRows` 复用 provider 同款可信 row shape。
- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
  - provider-level defense 复用 `hasTrustedCreatorCenterRowShape`，route 误判时 provider 仍拒绝脏 row。
- `tests/self-media-contract.test.ts`
  - 新增合成 candidate fixture，覆盖 clean row 通过、父级块/`semiTab`/`notes-request`/日期型数字拒绝。
- `tests/ui-harness.test.mjs`
  - 静态契约更新为检查新 selector helper、route 连接和敏感材料边界。

## Selector Conclusions

### Douyin

- 目标页：`https://creator.douyin.com/creator-micro/content/manage`。
- live 结果：登录状态可访问，页面正确，但 selector 没有找到同时满足以下条件的单条作品行：
  - 明确作品行/表格行/卡片；
  - 稳定 `aweme/item/video` ID 来自 href、详情链接、query ID、data attribute 或可见平台 ID；
  - 指标数字来自同一行/同一卡片；
  - title 不是“投稿作品直播场次投稿分析投稿列表...”父级块。
- live response：`ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_content_rows`。
- 下一步具体修复点：如果当前真实作品管理列表可见，需要补当前页面实际 row/card selector 或 ID attribute/href 位置；当前已拒绝无稳定 ID 或无同行指标的候选。

### Xiaohongshu

- 目标页：`https://creator.xiaohongshu.com/new/note-manager`。
- live 结果：登录状态可访问，页面正确，但 selector 没有找到同时满足以下条件的单条笔记行：
  - 明确笔记行/笔记卡片；
  - 稳定 note ID 来自 `note_id` / `noteId` / `explore/<id>` / `note/<id>` / data attribute / 可见平台 ID；
  - 浏览/点赞/评论/收藏/分享来自同一行/同一卡片；
  - 不是 `notes-request`、`semiTab`、tab 容器、请求容器或页面总览块；
  - 不把日期 `2026` 解析成分享等互动指标。
- live response：`ok=false`, `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_creator_note_rows`。
- 下一步具体修复点：如果当前笔记管理列表可见，需要补当前页面实际 note row/card selector 或 note ID attribute/href 位置；当前已拒绝 `fallback_text_hash`、0 指标和日期误读。

## Live Acceptance

- 固定入口已验证：
  - `http://localhost:3200/dashboard`
  - `http://localhost:3200/import`
- 保存前 dashboard/calendar：
  - trusted contents: `12`
  - metric snapshots: `12`
  - trusted total views: `73719`
  - calendar items: `195`
- 真实抓到 clean row：否。
- 真实保存：否，保存 `0` 条；原因是两平台 `saveCandidateCount=0`，没有进入用户确认保存。
- 保存后 dashboard/calendar：
  - trusted contents: `12`
  - metric snapshots: `12`
  - trusted total views: `73719`
  - calendar items: `195`
  - calendar Douyin/XHS default items: `0`
- calendar 是否污染：否；未新增历史/已发布抓取卡片，默认主网格未出现本轮抖音/小红书抓取内容。

## Validation

- `git diff --check`：pass
- `npm run typecheck`：pass
- `npm run test:self-media`：pass (`146` tests)
- `npm run test:ui-harness`：pass (`19` tests)
- `NEXT_DIST_DIR=.next-build-097-main npm run build`：pass
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`：pass, healthy port `3200`

## Safety Notes

- 未保存 password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace。
- 未调用真实发布 API。
- 未恢复 WeChat / 公众号。
- 视频号仍 discovery-only；B 站账号指标仍 preview-only。
- 未把 MediaCrawler public search/detail/creator 数据写入 trusted dashboard。
- 未使用 `browser.newContext` 回退临时登录；保持 persistent profile 路径。

## Timing

- Started: 2026-06-08 10:45 +08:00
- Finished: 2026-06-08 11:23 +08:00
- Elapsed: 约 38 分钟
- Workload class: M
- 需主会话判断：是
