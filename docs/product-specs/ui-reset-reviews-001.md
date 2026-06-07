# UI-RESET-REVIEWS-001 周月复盘视觉重做

## 背景

当前复盘页功能可用，但复盘内容、证据、行动项和历史记录混在同一视觉权重里，容易显得杂。用户确认业务逻辑后续继续优化，本阶段先把 UI 做成 Evidence 风格的报告页。

## 范围

- 保留现有复盘生成、保存、行动项推进 API。
- 重做 `/reviews` 的视觉结构：结论优先、指标摘要、证据表格、报告正文、行动项侧栏、历史记录。
- 默认隐藏内部 evidence ID，改为展示可读证据摘要。

## 非范围

- 不重写复盘业务逻辑。
- 不新增 AI 生成接口。
- 不重做线索 CRM 页面。

## 验收

- 页面保留 `总曝光`，满足 smoke 合约。
- 复盘建议必须仍来自内部 evidence refs。
- 行动项按钮可推进 `todo / doing / done / dropped`。
- `npm run verify:harness` 和 `npm run test:smoke` 通过。
