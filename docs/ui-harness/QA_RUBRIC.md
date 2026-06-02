# UI QA Rubric

## 必过项

- `npm run verify:harness` 通过。
- `npm run build` 通过。
- smoke 能打开 `/`、`/calendar`、`/content`、`/import`、`/dashboard`、`/reviews`、`/leads`、`/ui-lab`。
- 页面无 404、无 console error。
- `components`、`primitives`、`patterns` 不直接 `fetch`。
- UI 不 import Repo、Service、Provider。

## 视觉验收

| 维度 | 通过标准 |
| --- | --- |
| 页面边界 | 每页只服务一个主任务 |
| Mixpost 气质 | 暖底、细线、轻量图标、舒展留白 |
| Metabase 数据页 | 有洞察句、主趋势图、KPI、目标进度、占比/对比、排行 |
| Evidence 复盘页 | 有报告段落、证据 refs、行动项、历史复盘 |
| 组件复用 | 重复 UI 不散写在页面里 |
| 状态表达 | 状态色 + 文案同时存在 |
| 移动基础 | 不重叠，不出现横向失控 |

## 失败信号

- 日历页出现完整导入 diff 或复盘报告。
- 数据页只有 KPI 卡片，没有图表层级。
- 页面颜色回到冷灰老后台。
- 大量 one-off CSS 只为一个页面服务。
- 组件内部直接调用 API。
