# UI-POLISH-001 Orchestrator Handoff

## 完成内容

- 统一四页视觉基线：内容管理、发布日历、数据看板、周月复盘。
- 保持后端主线不变，只调整 UI Harness 层和页面结构。
- 当前统一入口：`http://127.0.0.1:3200/calendar`、`/content`、`/dashboard`、`/reviews`。

## 修改文件

- `src/app/globals.css`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `docs/product-specs/ui-polish-001.md`
- `docs/handoffs/UI-POLISH-001-orchestrator-handoff.md`

## 验证

- `npm run typecheck`
- `npm run verify:harness`
- `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke`
- Playwright 截图核验四页，console error 为 0。

截图产物：

- `.local/calendar-ui-polish-3200.png`
- `.local/content-ui-polish-3200.png`
- `.local/dashboard-ui-polish-3200.png`
- `.local/reviews-ui-polish-3200.png`

## 已知问题

- 这是 UI 收口 v0，不是最终视觉成品。
- 日历仍缺日期前进/后退和空档新建排期入口。
- 内容页新建内容按钮被移除为事实 badges，因为当前未接通完整新建内容链路。
- 复盘行动项只做 UI 层去重展示，内部事实库仍保留完整历史。

## 后续并行会话话术

### Calendar 会话

只执行 `UI-POLISH-CALENDAR-002`：在 `D:\codex work\自媒体创作\Data Collection and Background Analysis` 内优化 `/calendar`。不得改后端实体/API。目标：保留当前 Mixpost 暖白风格，补日期上一周/下一周、今天、空档加入排期入口，并让周/月视图在 1440px 下不拥挤。完成后写 `docs/handoffs/UI-POLISH-CALENDAR-002-worker-handoff.md`，运行 `npm run typecheck` 和 `npm run test:ui-harness`。

### Content 会话

只执行 `UI-POLISH-CONTENT-002`：优化 `/content` 内容管理和平台版本编辑器。不得改 Repo/Service/Provider；如必须新建内容 API，先记录需求不要实现。目标：提高表格可读性、版本卡片层级、编辑器保存反馈和 checklist 体验。完成后写 `docs/handoffs/UI-POLISH-CONTENT-002-worker-handoff.md`，运行 `npm run typecheck` 和 `npm run test:ui-harness`。

### Dashboard 会话

只执行 `UI-POLISH-DASHBOARD-002`：优化 `/dashboard`。不得改后端数据模型。目标：继续靠近 Metabase，完善筛选器视觉、主趋势图、KPI 卡、平台占比和内容排行，不做发布/复盘操作。完成后写 `docs/handoffs/UI-POLISH-DASHBOARD-002-worker-handoff.md`，运行 `npm run typecheck` 和 `npm run test:ui-harness`。

### Review 会话

只执行 `UI-POLISH-REVIEW-002`：优化 `/reviews`。不得改后端实体/API。目标：Evidence 风格报告更清楚，行动项按周期/状态分组，历史复盘列表更可读，保留 evidence refs。完成后写 `docs/handoffs/UI-POLISH-REVIEW-002-worker-handoff.md`，运行 `npm run typecheck` 和 `npm run test:ui-harness`。

## Orchestrator 验收话术

读取四个 handoff 后统一验收：`npm run verify:harness`，再用 3200 端口打开 `/calendar`、`/content`、`/dashboard`、`/reviews` 截图检查，无 console error 后再进入真实平台数据采集。
