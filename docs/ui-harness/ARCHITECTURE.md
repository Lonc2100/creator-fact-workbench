# Self-media UI Harness Architecture

Self-media UI Harness 是本项目的前端生产底座。它放在主仓库内，但按未来可抽离包设计；它只负责 UI 设计系统、组件库、页面边界、视觉 QA 和可复用 registry，不定义后端实体、Repo、Service、Provider 或外部工具行为。

## 主线目标

最终 UI 要服务这条运营闭环：

```text
内容草稿 -> 平台版本 -> 发布日历 -> 发布记录 -> 数据回收 -> 指标快照 -> 周/月复盘 -> 行动项 -> 线索跟进 -> 下一轮内容计划
```

通俗讲：后端已经是内部事实系统，UI Harness 要把它变成每天能用、长期能改、风格统一的自媒体经营后台。

## 巨人的肩膀

| 来源 | 本项目采用什么 | 控制复杂度的方式 |
| --- | --- | --- |
| Atomic Design | `primitives -> components -> patterns -> screens` | 只保留 4 层，不再细分 atoms/molecules 名称 |
| Storybook / component-driven UI | 组件先展示状态，再进入页面 | 第一阶段用 `/ui-lab`，不上正式 Storybook |
| shadcn/ui Registry | 按 registry 思路组织可复制组件 | 先在主仓库内做 registry-compatible shape，稳定后再抽离 |
| Material Design Tokens | 颜色、字体、圆角、间距、状态集中管理 | 用 CSS variables 驱动 Tailwind 和组件 |
| NN/g Heuristics | 状态可见、错误预防、识别优于记忆 | 写入页面边界、组件状态和 QA 检查 |

## 固定层级

```text
foundations -> primitives -> components -> patterns -> screens -> app routes
```

- `foundations`：tokens、平台色、状态色、格式化函数和 UI 常量。
- `primitives`：Button、Badge、Panel、Input、Tabs 等基础 UI，不知道自媒体业务。
- `components`：AppShell、SidebarNav、PageHeader、PlatformBadge、StatusBadge 等跨页面组件。
- `patterns`：PublishCalendar、PlatformVersionEditor、ImportDiffTable、MetricDashboardGrid、EvidenceReviewReport 等业务组合。
- `screens`：按页面任务组合 patterns；只有 screen 层可以触发 API 交互。
- `app routes`：Next.js 路由装配；可以读取 Runtime，然后把数据交给 screens。

## 边界规则

- UI 不 import Repo、Service、Provider、Config。
- App Wiring 只 import Runtime 或 UI。
- `primitives`、`components`、`patterns` 不允许直接 `fetch`。
- 业务 pattern 只接收 typed props 和 callbacks。
- 页面不混任务：发布日历页不放导入 diff，不写复盘报告；数据看板页不改发布状态。
- 视觉规则进入 tokens 或组件，不靠聊天里的形容词维持一致。

## 视觉方向

- 应用壳、内容、发布、导入页：参考 Mixpost 主页的暖白、细线、轻松专业和平台识别。
- 数据看板页：参考 Metabase 的洞察句、主趋势图、KPI、目标进度、占比、排行表。
- 复盘页：参考 Evidence 的 Markdown 报告、数据块、证据 refs 和行动项。
- 不采用 shadcn 默认 dashboard 风格；shadcn 是生态和组件方法，不是视觉导演。

## 成熟路线

| 阶段 | 目标 | 完成标准 |
| --- | --- | --- |
| UI-H0 | 架构与治理 | `docs/ui-harness/` 有单一入口、边界、参考、QA |
| UI-H1 | 视觉底座 | Tailwind + tokens 接入，冷灰老 SaaS 风格被替换 |
| UI-H2 | 组件库 v0 | primitives/components/patterns 建立，`/ui-lab` 展示状态 |
| UI-H3 | 页面拆分 | `/calendar`、`/content`、`/import`、`/dashboard`、`/reviews`、`/leads` 可打开 |
| UI-H4 | 数据与复盘成熟 | 数据页像 Metabase，复盘页像 Evidence |
| UI-H5 | 视觉 QA | smoke 覆盖页面，截图验证核心页面无明显错位 |
| UI-H6 | 抽离准备 | 跨页面复用且 QA 稳定的组件进入 registry 草案 |

## 当前默认

- 第一阶段使用 `/ui-lab` 替代正式 Storybook。
- 第一阶段不抽离独立包。
- 第一阶段不迁移 canvas workbench 组件，只借鉴它的治理方法。
- 所有新增文件留在 `D:\codex work\自媒体创作\Data Collection and Background Analysis`。
