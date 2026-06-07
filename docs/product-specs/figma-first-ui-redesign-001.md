# FIGMA-FIRST-UI-REDESIGN-001：Dashboard / Reviews 视觉方案

## 目标

先在 Figma 中审查 `/dashboard` 与 `/reviews` 的视觉方向，再决定是否进入代码实现。

## Figma 文件

- 文件名：CreatorFact UI Redesign - Reviews Dashboard
- URL：https://www.figma.com/design/u37t6S59pF2Xb3s3SruSwe

## 已生成画板

1. `00 Design Direction / 设计标准`
   - 文字层级
   - 图标系统
   - 复盘信息架构
   - 图表质量
   - 主题策略

2. `01 Dashboard Redesign / 数据看板`
   - 左侧导航
   - 顶部筛选条
   - 主趋势图
   - KPI 卡
   - 平台占比
   - 平台互动对比
   - 内容排行

3. `02 Reviews Redesign / 周月复盘`
   - 结论优先
   - 指标摘要
   - 证据表格
   - 行动项
   - 历史复盘
   - 报告正文预览

## 参考原则

- OpenAI role-based plugins：只借鉴 Product Design review 工作流，不引入运行时架构。
- Figma：作为设计审查与 tokens/component 资产层。
- Metabase：Dashboard 信息层级。
- Evidence：报告页结构。
- Linear / modern SaaS：字体层级、克制图标、细边界。

## 进入代码实现前的验收问题

- 背景是否应该继续保留米白，还是切到更纯白的专业后台主题？
- Dashboard 是否采用当前“主图 + KPI + 占比 + 排行”结构？
- Reviews 是否采用当前“结论 -> 表格证据 -> 行动项 -> 历史”的结构？
- 图标是否接受当前“功能字母占位 + 后续 lucide 替换”的策略？
- 哪些字段必须隐藏，哪些字段需要一键展开？

## 暂不实现的内容

- 不改 Next.js 代码。
- 不改后端模型。
- 不把 Figma 文件接入运行时。
- 不生成 Code Connect。

## 下一步

用户审查 Figma 方向后，再创建：

- `UI-RESET-DASHBOARD-001`
- `UI-RESET-REVIEWS-001`

并按 Figma 截图进行 Playwright 对比验收。
