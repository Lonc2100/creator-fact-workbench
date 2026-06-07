# UI-RESET-DASHBOARD-REVIEWS-001 Worker Handoff

## 任务

按 Figma-first 方向落地 `/dashboard` 和 `/reviews` 的第一轮视觉重做，同时保持后端主线、API 和 UI Harness 边界不变。

## 已完成

- `/dashboard` 改为分析页结构：经营洞察条、筛选条、主趋势、KPI、平台结构、下钻对比、内容排行和经营洞察。
- `/reviews` 改为 Evidence 报告结构：结论优先、指标摘要、证据表格、报告正文、行动项、复盘历史和当前周期。
- 新增样式类，强化文字层级、卡片留白、表格阅读性和窄屏响应。
- 新增 product specs：`ui-reset-dashboard-001.md`、`ui-reset-reviews-001.md`。

## 修改文件

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/app/globals.css`
- `docs/product-specs/ui-reset-dashboard-001.md`
- `docs/product-specs/ui-reset-reviews-001.md`
- `docs/task-board.md`

## 验收命令

- `npm run typecheck`：PASS
- `npm run verify:harness`：PASS
- `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke`：PASS
- `git diff --check`：PASS

## 截图证据

- `.local/dashboard-reset-001-3200.png`
- `.local/reviews-reset-001-3200.png`

## 已知问题

- 米白主题暂时保留，后续可以继续评估是否改成更纯净的暖白/浅灰混合底。
- 数据看板后续还需要补日/周/月表格深度，并对齐各平台后台的数据表类型。
- 复盘业务逻辑后续需要继续优化，本阶段只做视觉和信息层级收口。
