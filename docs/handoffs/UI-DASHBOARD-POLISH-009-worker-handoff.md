# UI-DASHBOARD-POLISH-009 Worker Handoff

## 任务

- 任务名：UI-DASHBOARD-POLISH-009
- 页面：`/dashboard` 数据看板
- 范围：只优化 dashboard 页面和 dashboard / analytics 相关样式

## 修改内容

- 将 dashboard 顶部说明调整为日常运营复盘语气，按钮状态改为“分析视图”。
- 将筛选区按钮改为 dashboard 专用 `analytics-chip`，视觉上更接近当前 calendar 的厚实控件。
- KPI panel 增加 `analytics-kpi-card` 专用样式，压缩字号层级、间距和目标进度条高度。
- 收紧 dashboard panel 圆角、阴影、padding、标题层级和顶部 insight strip 的留白。
- 压缩主趋势图高度、柱宽、网格线间距和点位尺寸，让首屏更像运营工具而不是展示页。
- 收紧平台占比、平台互动对比、内容排行、日周月表格和原生字段表格的行高、字号、badge 尺寸。
- 截图保存到 `.local/ui-dashboard-polish-009.png`。

## 修改文件

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/app/globals.css`
- `docs/handoffs/UI-DASHBOARD-POLISH-009-worker-handoff.md`

## 验证

- `npm run typecheck`：pass
- `git diff --check`：pass
- `npm run verify:harness`：pass
- 浏览器截图：pass，路径 `.local/ui-dashboard-polish-009.png`

## 遗留问题

- 筛选 chip 仍是只读口径展示，没有接入新的查询交互；本任务要求不改后端模型/API，因此保留现有数据结构和图表逻辑。
- 当前测试数据下“发布目标完成度”会出现超额数字，这是现有数据/逻辑表现，本任务未改业务计算。
