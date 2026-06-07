# UI-REVIEW-ACTIONS-002 复盘行动项管理收口

## 背景

复盘右侧行动项在数据变多后容易变成长列表，阅读和推进都很挤。本任务先不改行动项后端模型，直接使用已有 `priority`、`status`、`relatedType` 字段做可管理表达。

## 范围

- 行动项按 `high / medium / low` 分组。
- 每组使用可折叠 `details`，默认展开高优先级、进行中或首个非空分组。
- 每条行动保留状态推进按钮，继续调用 screen 层传入的 callback。
- 重复行动项继续合并展示，内部事实库保留完整历史。

## 验收

- `/reviews` 仍可推进行动项状态。
- 页面保留 `总曝光` 和 evidence 表格。
- `EvidenceReviewReport` 不直接 fetch，不越过 UI Harness 边界。
