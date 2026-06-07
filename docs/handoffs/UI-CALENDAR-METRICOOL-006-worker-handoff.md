# UI-CALENDAR-METRICOOL-006 Worker Handoff

## Task

继续优化 `/calendar`，把发布日历向 Metricool Planning 的近似像素比例推进。本轮不改后端，只改日历页面结构、工具条、画布比例、卡片信息层级和展示文案降噪。

## Completed

- 移除 `PublishCalendar` 的 `calendar-summary-strip` 总结条，日历画布前不再额外占一行。
- 移除默认横向拖拽提示，操作反馈改为只有执行后才出现的右下角 toast。
- `/calendar` 顶部工具条合并为 Metricool-like 单行控制区：搜索、This week/Month、日期范围、平台图标筛选、状态筛选、Best times 和新建排期。
- 周视图继续保持 `time slot x date column`，并压缩工具条与画布间距，让白底大画布成为视觉主体。
- 调整卡片展示层，只保留平台图标、时间、标题、短备注；状态、检查项、阻塞原因和下一步动作留在右侧详情抽屉。
- 增加卡片标题降噪：过滤 `O2`、长数字 ID、CSV/n8n/MediaCrawler 导入噪声，让测试数据也更像真实内容计划。
- 卡片备注进一步缩短为运营语义，避免工程提示占据卡片。
- 保留 `onReschedule` 和现有 PATCH API 流，不改 Runtime/API/Service/Repo。

## Modified Files

- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/app/globals.css`
- `docs/product-specs/ui-calendar-metricool-006.md`
- `docs/task-board.md`

## Validation

- `npm run typecheck`
- `git diff --check`
- `npm run verify:harness`
- `npm run test:smoke`
- Playwright screenshot:
  - `.local/calendar-metricool-006-desktop.png`

## Known Follow-ups

- 月视图仍只是保持可用，没有做 Metricool 级别的深度设计。
- 工具条中的搜索和 Best times 仍偏视觉入口，后续需要接真实过滤和最佳发布时间建议。
- 当前卡片仍受测试数据质量影响；真实内容标题、封面和平台素材接入后，视觉质感会进一步提高。
- 若继续追求 Metricool 精致度，下一轮应做 Figma/token 固化：卡片宽高、字体比例、图标尺寸、日期头高度、列宽、阴影和空态都进入 UI Harness 规范。
