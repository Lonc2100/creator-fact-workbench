# UI-REVIEW-DASHBOARD-THEME-002 Worker Handoff

## 任务

继续优化 Figma-first UI：复盘行动项分组折叠、Dashboard 日周月和平台原生字段表、纯净背景主题试验。

## 已完成

- `/reviews` 右侧行动项按高/中/低优先级分组，使用折叠面板控制密度。
- 行动项保留状态推进按钮和 evidence 关联摘要。
- `/dashboard` 新增日数据、周数据、月数据聚合表。
- `/dashboard` 新增平台原生字段预览表，对齐抖音、小红书、公众号、视频号、B站常见后台指标口径。
- `/ui-lab` 新增当前米白与纯净暖白 token 对比卡。

## 修改文件

- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `src/domain/self-media/ui/foundations/tokens.css`
- `src/app/globals.css`
- `docs/product-specs/ui-review-actions-002.md`
- `docs/product-specs/ui-dashboard-tables-002.md`
- `docs/product-specs/ui-theme-clean-002.md`
- `docs/task-board.md`

## 验收命令

- `npm run typecheck`：PASS
- `git diff --check`：PASS
- `npm run verify:harness`：PASS
- `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke`：PASS

## 截图证据

- `.local/reviews-002-3200.png`
- `.local/dashboard-002-3200.png`
- `.local/ui-lab-002-3200.png`

## 后续建议

- 复盘行动项下一阶段可加入“本周必做 / 可延后 / 已放弃”运营视图。
- Dashboard 后续应继续接真实平台导出字段别名，并区分内容数据、粉丝数据、互动评论数据。
- 纯净暖白主题需要用截图对比后再决定是否设为默认。
