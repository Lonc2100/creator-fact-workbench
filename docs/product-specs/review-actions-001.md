# REVIEW-004: 复盘保存与行动项推进

## Spec

复盘页必须从实时报告升级为可沉淀记录，并且能推动下一轮动作：

- 支持周/月复盘生成并保存。
- 展示历史复盘。
- 展示 evidence refs，建议必须引用内部事实。
- 行动项支持 `todo / doing / done / dropped` 状态推进。

## Reference Notes

- Evidence docs：报告由 markdown、数据查询结果、图表/组件共同构成，适合用于“数据证据 + 可读复盘”。
- Metabase dashboard 思路继续用于 dashboard，不混入复盘页；复盘页只保留报告、证据和行动项。

## Implementation

- `ReviewsPage` 作为 screen 层调用 `/api/self-media/reviews` 和 `/api/self-media/action-items`。
- `EvidenceReviewReport` 只展示报告、证据、历史和行动按钮，通过 `onActionStatus` 回调交还 screen。
- `SavedReview` 和 `ReviewActionItem` 继续由后端事实源提供。

## Acceptance

- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run test:smoke`
- 保存复盘后 dashboard 可读到 `savedReviews`。
- 推进行动项后 dashboard 可读到更新后的 action item。
