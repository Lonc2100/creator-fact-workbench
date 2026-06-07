# UI-RESET-CALENDAR-001 Worker Handoff

## 完成内容

- 写入 UI 病因诊断：`docs/product-specs/ui-diag-001.md`。
- 写入日历硬重设 spec：`docs/product-specs/ui-reset-calendar-001.md`。
- 移除 Self-media UI 的全局网格背景，改为纯净暖白背景。
- 将 `/calendar` 从普通卡片日历重设为“平台行 x 日期列”的发布排期矩阵。
- 压缩顶部工具条：本周/本月、平台筛选、状态筛选、新建排期入口。
- 保留右侧平台版本 inspector、发布检查、阻塞原因和下一步动作。
- 修复 DndKit SSR hydration mismatch：拖拽日历仅在客户端 mounted 后渲染。
- 调整 smoke 拖拽目标选择，适配新矩阵结构，避免拖到边缘不可稳定命中的单元格。

## 修改文件

- `docs/product-specs/ui-diag-001.md`
- `docs/product-specs/ui-reset-calendar-001.md`
- `docs/task-board.md`
- `docs/handoffs/UI-RESET-CALENDAR-001-worker-handoff.md`
- `src/domain/self-media/ui/foundations/tokens.css`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/app/globals.css`
- `scripts/smoke-self-media.mjs`

## 验证

- `npm run typecheck`
- `npm run verify:harness`
- `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke`
- `git diff --check`
- Playwright screenshot: `.local/calendar-reset-001-final-3200.png`

## 已知问题

- 新建排期按钮仍为 disabled，因为当前没有完整新建排期 API/UI 链路。
- 当前重设只覆盖 `/calendar`，其他页面仍需要按同一纯净标准迁移。
- 周视图 1440px 已无横向溢出；月视图仍允许横向滚动，这是合理选择。

## 下一步建议

按同一标准继续做：

1. `UI-RESET-CONTENT-001`：内容页改成纯净数据管理 + 右侧编辑器。
2. `UI-RESET-DASHBOARD-001`：看板页按 Metabase 做图表和指标层级。
3. `UI-RESET-REVIEWS-001`：复盘页按 Evidence 做报告、证据、行动项。
