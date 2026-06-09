# MAINLINE-HUMAN-CREATOR-WORKFLOW-WALKTHROUGH-113 Worker Handoff

## Summary
- 目标：用真人鼠标式路径走查创作者一天的主流程，并修掉影响主线可用性的默认页面噪音。
- 结果：完成。
- 是否提交：是。本 handoff 随 `fix(self-media): smooth creator workflow walkthrough` 提交；最终 hash 由提交后确认。
- 需主会话判断：否。

## 真人鼠标路径逐步结果
1. 固定入口进入 `http://localhost:3200/dashboard`。
   - 看板首屏是数据优先。
   - 可见 `dashboard-trusted-status`，高级信息默认收起。
   - 113 最终 live 检查：默认可见文本未出现 run/raw/API/path/cookie/token/header/storageState/测试/验收/诊断等词。

2. 从侧边导航点击进入 `/import`。
   - 首屏显示 4 个平台更新卡。
   - 抖音：登录抓取可用，需手动打开后台。
   - 小红书：内容分析表格可用，需手动打开后台。
   - 视频号：手动更新为主。
   - B站：内容级导入可用，账号指标 preview-only。
   - 点击四个平台首屏按钮只展开本地详情面板，没有打开外部平台窗口。

3. 从侧边导航进入 `/content`。
   - 默认进入创作模式。
   - 填写标题、主题、大致内容和未来时间。
   - 点击 `分析并生成讨论稿`，页面生成方向分析、受众、语气、时长、平台差异。
   - 点击 `生成并保存四平台版本`，成功保存四个平台草稿。

4. 从 `/calendar` 空白时间格创建排期。
   - 点击 `2026-06-12 09:00` 的空白排期格。
   - 页面弹出新增排期面板。
   - 点击 `去内容台创建`，进入带 `scheduledAt` 的 `/content`。
   - 保存后四个平台版本进入日历排期。

5. 回到 `/calendar`。
   - 主日历显示一张合并卡片：`AI短片创作：三步把画面变成故事`。
   - 卡片显示 `4个平台 · 等待发布确认`。
   - 历史/隔离/台账区默认收起。
   - 主日历没有出现历史抓取内容或后台词污染。

6. 回到 `/dashboard` 和 `/reviews`。
   - Dashboard 可信指标仍是 `21` 真实内容、`22` 内容级快照。
   - 本轮创建本地内容没有新增 metric snapshot，也没有进入可信内容级指标。
   - Reviews 首屏显示近 7/30 表现、Top 内容、5 条以内行动项；完整明细默认收起。

## 创建或保留的本地内容 / 排期 / 指标
- 保留本地内容 1：
  - title：`AI短片创作：从一个镜头找到故事张力`
  - contentId：`content-creator-001e676847fb`
  - 结果：保存四个平台草稿，但第一轮直接填时间的自动化路径未进入排期；没有进入主日历。
  - 指标：未创建 metric snapshot。

- 保留本地内容 2：
  - title：`AI短片创作：三步把画面变成故事`
  - contentId：`content-creator-40b0aa2dd932`
  - schedule：`2026-06-12 09:00 +08:00` / `2026-06-12T01:00:00.000Z`
  - platformVersionIds：
    - `version-content-creator-40b0aa2dd932-douyin`
    - `version-content-creator-40b0aa2dd932-video_account`
    - `version-content-creator-40b0aa2dd932-xiaohongshu`
    - `version-content-creator-40b0aa2dd932-bilibili`
  - 结果：主日历显示一张合并排期卡。
  - 指标：未创建 metric snapshot。

## 发现并修复的问题
- Dashboard 默认可见说明里出现“高级诊断”。
  - 修复：改为 `更多记录区域` / `更多运行信息`。

- Import 默认折叠摘要出现“高级诊断与手动导入”“原始字段”。
  - 修复：改为 `更多设置与手动导入`、`字段细节默认收起`。

- Content 发布助手和内容库可见区域出现 `API`、`全部本地/诊断`、`验收内容`、`诊断筛选` 等技术/内部词。
  - 修复：改为 `手动发布为主`、`不会自动发布`、`全部本地内容`、`历史样例`、`本地内容筛选`。

- Import 展开详情中的“官方 API”旧文案。
  - 修复：改为 `官方能力` / `官方授权能力`。

## 未修复但影响可用性的问题
- 第一轮从 `/content` 直接填写未来时间并保存时，自动化走查结果是四平台草稿保存成功，但排期没有落到发布助手里。
- 从 `/calendar` 空白时间格进入 `/content?scheduledAt=...` 的主排期路径可以稳定保存排期。
- 判断：不阻塞主线，因为用户主流程里“安排未来发布”从日历入口完成；但建议后续加一个小增强：保存前在创作面板显式显示“将排到某日某时”，并在未成功写入排期时给出页面级提醒。

## 是否需要用户登录协助
- 本轮没有点击外部平台后台按钮。
- 没有打开抖音、小红书、视频号、B站外部窗口。
- 不需要用户扫码、登录、验证码或风控协助。

## 3200 Live 验收结果
- 服务：`.next-build-113-main` on port 3200。
- `check:local-server-health`：PASS。
- Dashboard：数据优先，默认无技术词污染。
- Import：首屏能看懂四个平台怎么更新，默认无技术词污染，不自动开平台窗口。
- Content：默认创作模式，可生成讨论稿和保存四平台草稿；内容库文案已业务化。
- Calendar：主日历只显示未来真实排期；本轮新排期合并为一张 4 平台卡。
- Reviews：复盘优先，Top 内容和 5 条行动项可见，完整明细默认收起。
- 外部平台窗口：0。
- 本地内容/排期/指标：
  - 新增本地内容 2 条。
  - 新增未来排期 1 个内容 / 4 个平台版本。
  - 未新增可信 metric snapshot。

## 验证命令结果
- `git diff --check`：PASS。
- `npm run typecheck`：PASS。
- `npm run test:self-media`：PASS，150 tests。
- `npm run test:ui-harness`：PASS，19 tests。
- `NEXT_DIST_DIR=.next-build-113-main npm run build`：PASS。
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`：PASS。

## 剩余风险
- 内容库仍然是较重的管理页，但日常默认入口已经是创作模式。
- 直接在 `/content` 输入未来时间的自动化路径需要后续加显式确认或更强校验。
- `/leads` 仍作为二级页面保留，没有在本轮继续产品化。

## Timing
- Started：2026-06-09 18:12:58 +08:00
- Finished：2026-06-09 18:29:04 +08:00
- Elapsed：约 16 分钟
- Workload class：Medium
