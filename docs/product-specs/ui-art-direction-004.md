# UI-ART-DIRECTION-004 首页卡片矩阵与 Metricool 日历卡片

## 背景

用户确认 UI-ART-DIRECTION-003 后，要求继续把审美原则落实到最影响观感的两个页面：总览首页和发布日历。参考方向包括 Apple/Linear 的简洁专业、创作者卡片矩阵的趣味感、Metricool 发布日历的圆弧卡片和平台识别。

## 范围

- `/` 首页从传统 KPI 拼盘改为创作者工作台卡片矩阵。
- `/calendar` 日历卡片改为更圆润、更轻、更有平台识别感的 Metricool 式卡片。
- 保留现有拖拽、筛选、发布状态、右侧详情和所有后端接口。
- 启动 `127.0.0.1:3200` 截图验收。

## 非范围

- 不改后端数据模型。
- 不接真实平台 API。
- 不重做 Dashboard 和 Reviews 的业务结构。
- 不新增大型组件库或 Storybook。

## 验收

- 首页仍保留 `自媒体经营后台` h1 和 `今日工作入口` 文本合约。
- 日历仍保留 `平台版本详情` 文本合约。
- `npm run verify:harness` 和 `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke` 通过。
- 截图包含 `/`、`/calendar`、`/dashboard`、`/reviews`。
