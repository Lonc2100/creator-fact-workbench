# UI-CALENDAR-METRICOOL-005 Worker Handoff

## Task

把 `/calendar` 从平台行排班表重做为 Metricool 风格的日期优先发布画布。

## Completed

- `PublishCalendar` 从 `platform row x date column` 改成 `date-first calendar canvas`。
- 进一步根据 Metricool 官方 planner 图改成 `time slot x date column` 周视图，固定 9:00 / 13:00 / 17:00 / 21:00 时间轴。
- 卡片改成轻量结构：平台图标、时间、标题、短备注。
- 再次降噪卡片信息，卡片最终只保留平台图标、时间、标题、短备注；状态、检查项和阻塞细节放进右侧详情。
- 修正 Metricool 对标逻辑：按信息架构、比例、素材、信息取舍四层追踪，不再只凭视觉印象调色。
- 修正卡片和网格关系：时间列缩窄，卡片从居中改为格子左上定位，卡片体量压小，横向提示改为操作后右下角 toast。
- 日历上下文内恢复 simple-icons SVG 完整尺寸，避免平台图标因全局 62% 缩放显得劣质。
- 平台标识新增仿品牌 SVG 图标：抖音、小红书、公众号、视频号、B站。
- 用 `simple-icons` 替换手写劣质图形，抖音用 TikTok 路径，小红书、微信、B 站使用对应品牌路径；视频号先用微信路径加橙色语义。
- 卡片标题增加展示层清洗，避免长数字 ID 和 O2 测试噪声直接挤满卡片。
- 单日默认露出 3 张卡片，其余显示为轻量“还有 X 条”入口。
- 进一步按用户反馈降低卡片运营字段权重：移除卡片 checklist 数字和进度条，状态只作为轻量元信息。
- 保留用户认为较好的 Planning canvas strip、日期头和工具条比例，不做无关重排。
- 修复周视图日期范围使用 UTC `toISOString()` 导致中国时区下标题早一天的问题，改成本地日期 key。
- `CalendarPage` 增加 Metricool 式顶部 tabs/search/filter/best-times 结构。
- 平台版本详情从常驻右栏改为点击卡片后滑出抽屉。
- 保留 `onReschedule` 回调和 API patch 流，不改后端。

## Modified Files

- `src/domain/self-media/ui/components/PlatformBadge.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/app/globals.css`
- `package.json`
- `package-lock.json`
- `docs/product-specs/ui-calendar-metricool-005.md`
- `docs/task-board.md`

## Validation

- `npm run typecheck`
- `git diff --check`
- `npm run verify:harness`
- `$env:SMOKE_BASE_URL='http://127.0.0.1:3200'; npm run test:smoke`
- `npm run verify:harness` and smoke passed again after typography/icon refinement. Running smoke in parallel with the harness can produce transient Playwright navigation aborts; isolated smoke passed.
- `npm run verify:harness` passed after time-axis work.
- `npm run test:smoke` passed after local date-key fix.
- Playwright screenshots:
  - `.local/calendar-metricool-005-closed-3200.png`
  - `.local/calendar-metricool-005-inspector-3200.png`
  - `.local/calendar-metricool-006b-closed-3200.png`
  - `.local/calendar-design-system-007-3200.png`
  - `.local/benchmarks/metricool-planner-page.png`
  - `.local/benchmarks/metricool-planificador.webp`
  - `.local/calendar-metricool-time-grid-3205.png`
  - `.local/calendar-metricool-ratio-pass-3207.png`
  - `.local/calendar-metricool-card-grid-fix-3208.png`
  - `.local/overview-after-calendar-005-3200.png`
  - `.local/dashboard-after-calendar-005-3200.png`
  - `.local/reviews-after-calendar-005-3200.png`

## Known Follow-ups

- 月视图只是结构可用，还没有达到成熟视觉。
- 搜索框目前是视觉入口，后续需要接入本地过滤。
- 多平台图标已经按同一内容的 sibling platform versions 在卡片首行合并展示；若后续需要“一张卡代表一条内容”，还需要后端/服务层提供 content-level calendar grouping。
- 真实数据过多时，单日卡片会堆得过长，后续应做“当天展开/折叠”或“更多卡片抽屉”。
- 顶部工具条按钮已经接近 Metricool，但还可以继续减法，让主画布更安静。
- 还需要平台真实素材策略：如果用户愿意接受商标使用，需要统一采用官方/开源品牌图标；如果未来开源担心商标风险，需要提供 neutral icon set 切换。
- 下一步若继续追求 Metricool 精致度，应把本次参数固化为 Figma/token/component spec：卡片约 126px 宽、82px 最小高、12px 圆角、3px 彩色左线、16-21px 平台图标、12.5px 标题、9-10px 备注、10px 时间。
