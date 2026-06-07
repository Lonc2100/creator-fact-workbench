# DASHBOARD-FOUR-PLATFORM-POLISH-025 Worker Handoff

## 任务

- 任务名：DASHBOARD-FOUR-PLATFORM-POLISH-025
- 页面：`/dashboard`
- 目标：四平台进入后优化数据看板展示密度和可读性，不改变业务语义，不改采集/保存逻辑。

## 修改内容

- 补齐 dashboard 来源标签中的 `bilibili_creator_center`，B 站显示为“B站创作中心”。
- 顶部筛选 chip 增加“四平台对比”和“B站内容级”口径提示。
- 平台原生字段说明更新为抖音、小红书、视频号、B站四平台，并明确 B 站作为内容级指标参与 dashboard/review，不混入账号级趋势。
- 将账号趋势与平台成熟度放入 `dashboard-ops-grid` 双列运营区，减少纵向卡片堆叠。
- 将平台成熟度从宽表改为四平台紧凑卡片矩阵，保留阶段、内容数、指标数、dashboard/review 状态、发现/保存/运营/evidence 信息。
- 压缩平台曝光占比、来源参与统计、账号趋势、成熟度卡片、表格行距和 badge 密度。
- 添加响应式规则，窄屏下账号趋势、成熟度和平台卡片回落为单列。

## 修改文件

- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/app/globals.css`
- `docs/handoffs/DASHBOARD-FOUR-PLATFORM-POLISH-025-worker-handoff.md`

## 截图

- `.local/dashboard-four-platform-polish-025.png`

## 验证

- `npm run test:self-media`：PASS，62 tests
- `npm run typecheck`：PASS
- `npm run verify:harness`：PASS
- `git diff --check`：PASS
- 浏览器截图检查：PASS，包含 B站、账号趋势、平台成熟度、导入来源参与统计；无资源 404。

## 边界

- 未修改采集、保存、Repo、Service、Runtime、API 或模型逻辑。
- 账号趋势仍使用 `AccountMetricSnapshot` / `accountMetricGroups`，独立于内容级 `MetricSnapshot` 总量。
- B 站内容级数据仍走现有 `MetricSnapshot`/内容排行/dashboard/review 路径。

## 需主会话判断

- 是。当前账号趋势截图为空态；如果后续真实账号快照增多，是否需要给账号趋势单独做平台筛选/折叠，应由主会话决定。
