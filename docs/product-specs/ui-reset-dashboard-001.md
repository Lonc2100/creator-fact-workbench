# UI-RESET-DASHBOARD-001 数据看板视觉重做

## 背景

当前数据看板已经有 Metabase 式指标、图表和表格结构，但页面文字层级偏平、背景偏杂、组件之间缺少明确的信息优先级。用户确认 Figma-first 方案方向更好后，本任务把该方向落实到代码。

## 范围

- 保留现有后端、Runtime/API 和数据结构。
- 只重做 `/dashboard` 的视觉层级、组件密度、中文信息架构和分析页结构。
- 继续参考 Metabase 的 dashboard 组织：洞察句、主趋势、KPI、目标进度、平台占比、下钻分析、排行表。

## 非范围

- 不新增日/周/月深度表格，本阶段只预留后续扩展方向。
- 不接真实平台 API。
- 不改变指标计算规则。

## 验收

- 页面保留 `曝光与互动趋势`，满足 smoke 合约。
- 图表、KPI、平台结构、内容排行和经营洞察分区清晰。
- `patterns/components/primitives` 不直接 fetch，不越过 UI Harness 边界。
- `npm run verify:harness` 和 `npm run test:smoke` 通过。
