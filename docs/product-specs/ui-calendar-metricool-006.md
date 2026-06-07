# UI-CALENDAR-METRICOOL-006：发布日历近似像素复刻优化

## 背景

`UI-CALENDAR-METRICOOL-005` 已经把发布日历从平台行排班表改成时间轴发布画布，但用户反馈仍然离 Metricool Planning 的精致度有距离。问题集中在：画布前信息条过重、工具条割裂、卡片信息仍偏工程化、网格和卡片比例不够像成熟产品。

## 目标

本轮只优化 `/calendar`，继续向 Metricool Planning 的页面节奏和视觉比例靠近：

- 白底大画布优先，减少画布前的说明和总结。
- 工具条合并搜索、视图、日期范围、平台筛选、状态筛选和新建入口。
- 周视图保持 `时间段 x 日期列`，但时间列、日期头、行高、列宽和卡片比例更接近 Metricool。
- 卡片只展示平台图标、时间、标题、短备注。
- 状态、检查项、阻塞原因、下一步动作全部放到右侧详情抽屉。

## 参考

- Metricool Planning：白底大画布、轻网格、小圆角发布卡片、平台图标、简洁工具条。
- 本地 benchmark：`.local/benchmarks/metricool-planificador.webp`、`.local/benchmarks/metricool-planner-dom.json`。
- 本项目上一轮：`docs/product-specs/ui-calendar-metricool-005.md`。

## 范围

- 移除 `calendar-summary-strip` 总结条。
- 移除默认横向拖拽提示，操作反馈只保留右下角 toast。
- 重做 `/calendar` 顶部工具条为单行 Metricool-like 控制区。
- 优化周视图时间列、日期头、行高、列宽、今日列和空排期入口。
- 优化卡片展示层，过滤 `O2`、长数字 ID、导入噪声和测试标题。
- 保留 `simple-icons` 作为平台图标来源，不复制 Metricool 私有素材和 CSS。

## 非目标

- 不改 Dashboard、Reviews、Overview 或 Content 页面。
- 不接真实平台 API。
- 不改后端模型、Runtime/API、状态机和拖拽保存流。
- 不深度优化月视图。

## 验收

- `/calendar` 无横向提示条和总结条。
- 工具条合并为一行，包含搜索、This week/Month、日期范围、平台图标筛选、状态筛选、Best times、新建排期。
- 周视图是白底大画布、轻网格、小卡片、今日列淡粉色。
- 卡片落在时间格左上区域，不居中。
- 卡片只展示平台图标、时间、标题、短备注。
- 点击卡片仍打开右侧详情。
- 拖拽卡片仍通过现有 PATCH 流保存排期。
- `npm run typecheck`、`git diff --check`、`npm run verify:harness`、`npm run test:smoke` 通过。
- 截图保存到 `.local/calendar-metricool-006-desktop.png`。
