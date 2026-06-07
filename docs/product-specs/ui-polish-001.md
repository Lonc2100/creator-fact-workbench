# UI-POLISH-001：四页统一视觉收口

## 目标

在后端主线不变的前提下，把内容管理、发布日历、数据看板、周月复盘四页收敛到同一套 Self-media UI Harness 视觉语言。

## 范围

- 不新增后端实体，不改变 Runtime/API 合约。
- 页面继续按边界拆分：内容页只管内容与平台版本，日历页只管排期，数据页只管指标，复盘页只管报告与行动项。
- 视觉参考继续采用 Mixpost 暖白后台、Metabase 数据层级、Evidence 报告结构。

## 本轮改动

- 统一工作区宽度、页头分隔、轻面板、卡片 hover/selected 状态。
- 数据看板重排为：洞察句 -> 分析口径 -> 主趋势图 + KPI -> 平台占比/互动对比 -> 内容排行 -> 洞察句。
- 日历页压缩 7 列栅格，保留拖拽、状态筛选、右侧详情。
- 内容页移除未接通的新建按钮，改为事实统计 badges。
- 复盘页移除重复 Tabs，保留两张入口卡；行动项 UI 层去重展示，不改内部事实库。

## 验收

- `npm run typecheck`
- 四页浏览器打开无 console error：
  - `/calendar`
  - `/content`
  - `/dashboard`
  - `/reviews`
- 四页不混入其他页面工作流。

## 下一轮默认方向

- Calendar Worker：提升日历密度、日期导航、空档排期入口。
- Content Worker：补新建内容最小 API/UI，并优化版本编辑器保存反馈。
- Dashboard Worker：补平台筛选交互和更真实的 Metabase 式图表细节。
- Review Worker：优化历史复盘列表和行动项按周期过滤。
