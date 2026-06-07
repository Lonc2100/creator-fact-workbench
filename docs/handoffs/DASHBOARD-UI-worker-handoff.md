# DASHBOARD-UI Worker Handoff

## Task

- Trellis task: `.trellis/tasks/06-03-dashboard-ui`
- Scope: dashboard UI maturity
- Boundary: UI only; no backend contracts, runtime, repo, service, types, package, or task-board changes.

## What Changed

- 将 `/dashboard` 从固定示意图升级为由 `DashboardSnapshot` 派生的 Metabase 风格看板。
- 增加当前分析口径区：时间窗口、平台对比、曝光互动、Top 8 排行。
- 主趋势图改为使用 metrics / metricSnapshots 聚合后的近 6 个日期桶。
- KPI 区补充总曝光、综合互动率、内容样本数、商业线索池和发布目标进度。
- 平台区补充曝光占比、平台互动对比和占比数字。
- 内容排行改为按聚合曝光排序，并显示互动数、互动率和运营判断。
- 洞察句改为根据领先平台、Top 内容和互动率动态生成。
- 页面头部去掉无实际行为的“导出”按钮，改为只读看板状态。

## Modified Files

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `docs/handoffs/DASHBOARD-UI-worker-handoff.md`

## Verification

- `npm run typecheck`：pass
- `npm run verify:harness`：pass
- `npm run test:smoke`：pass
- `npm run build`：pass

## Notes

- 本任务没有修改 `types`、`service`、`repo`、`runtime`、`package.json`、`docs/task-board.md`。
- 页面 smoke 已覆盖 dashboard 所在应用路径，并完成 imports、review、queue、editor、calendar 等 O2 交互链路。
- 额外浏览器可视检查尝试中，Codex 内置浏览器打开 localhost 被扩展拦截为 `ERR_BLOCKED_BY_CLIENT`；随后尝试临时 `next start` 时命中本地 `.next` transient chunk 缺失导致的 500。该问题没有影响 `verify:harness`、`test:smoke` 或 `build` 验收结果。

## Known Issues

- 筛选区目前是只读分析口径展示，没有接入新的服务端筛选查询；这是为了遵守本任务“不改 backend contracts”的边界。
