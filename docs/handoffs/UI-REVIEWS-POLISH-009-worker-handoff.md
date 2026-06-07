# UI-REVIEWS-POLISH-009 Worker Handoff

## 任务

- 任务名：UI-REVIEWS-POLISH-009
- 范围：只优化 `/reviews` 周月复盘页面。
- 禁止范围：未改 self-media types / service / repo / runtime / api；未改 dashboard、calendar、content、import、leads 页面结构。

## 本轮完成

- 结论区从单段说明升级为经营决策摘要，补充周期、最佳平台、证据 refs 数和待推进动作。
- 证据表格保持主任务位置，收紧行高和表格密度，让发现、证据、影响、建议动作更像后台复盘表。
- 行动项侧栏进一步压缩：
  - 保留优先级分组。
  - 每条行动项拆成状态、标题、下一步、元信息和四个状态按钮。
  - 状态按钮改成紧凑四列，减少右侧侧栏松散感。
- 报告正文预览降权：
  - 标注“降权展示”。
  - 降低字号、行高和最大高度，避免压过结论、证据、行动项。

## 修改文件

- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/app/globals.css`
- `docs/handoffs/UI-REVIEWS-POLISH-009-worker-handoff.md`

说明：`src/domain/self-media/ui/screens/ReviewsPage.tsx` 已有当前 review 页面入口结构，本轮未继续改动它。

## 截图

- `.local/ui-reviews-polish-009.png`

## 验证

- `npm run typecheck`：PASS
- `git diff --check`：PASS
- `npm run verify:harness`：PASS
- 浏览器截图：PASS，已保存到 `.local/ui-reviews-polish-009.png`

## 已知问题 / 还没收好的点

- 行动项：右侧已经比上一版更紧凑，但数据量很大时历史重复行动仍依赖前端合并和折叠，后续最好有后端侧去重或分页。
- 证据表格：当前是 Evidence 风格摘要表，还没有真正的排序、过滤、展开证据明细。
- 报告正文：已经降权为预览，但 Markdown 仍是纯文本 `<pre>`，后续如果要更专业，需要受控渲染 headings/list，但不能反过来抢主任务权重。
- 复盘历史：仍然偏长，后续可以做固定高度滚动或按周期过滤。

## 备注

- 当前工作树已有其它会话留下的大量未提交改动，本 Worker 没有回退或触碰后端模型/API/Service/Repo。
