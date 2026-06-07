# REVIEW-PANEL-UI Worker Handoff

## Task

- Task ID: `.trellis/tasks/06-03-review-panel-ui`
- Scope: `/reviews` 复盘面板成熟化
- Worker boundary: 只改复盘页 UI 与本 handoff，不改 Types / Service / Repo / Runtime / package / task board。

## Completed Work

- `ReviewsPage` 增加周复盘、月复盘两个明确入口，保存按钮随当前周期显示为“保存周复盘 / 保存月复盘”。
- `EvidenceReviewReport` 强化 Evidence 风格结构：
  - Markdown 报告区保留为主阅读区。
  - 增加互动率、证据 refs 数、行动项进度摘要。
  - 只把带 `evidenceRefs` 的 insight 作为可执行证据展示；无 refs 的条目作为“待补证据”提示，避免无证据建议。
  - 行动项展示自身、复盘、关联业务对象 refs，并支持 `doing / done / dropped / todo` 状态推进。
  - 历史复盘列表显示周期、摘要和日期窗口。

## Modified Files

- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `docs/handoffs/REVIEW-PANEL-UI-worker-handoff.md`

## References Used

- `.trellis/spec/frontend/*`
- `.trellis/spec/guides/self-media-parallel-sessions.md`
- `docs/ui-harness/ARCHITECTURE.md`
- `docs/ui-harness/PAGE_BOUNDARIES.md`
- `docs/product-specs/review-actions-001.md`
- `docs/references/vendor/evidence/README.md`
- `docs/references/vendor/evidence/docs__index.md`
- `docs/references/vendor/metabase/README.md`
- `docs/references/vendor/metabase/docs__questions__start.md`

## Verification

- `npm run typecheck`：PASS
- `npm run test:ui-harness`：PASS
- `npm run verify:harness`：PASS
- `npm run test:smoke`：第一次直接运行时，临时 dev server 已通过 dashboard readiness，但 Playwright 等待首页 `h1` 超时。
- `SMOKE_BASE_URL=http://127.0.0.1:3040 npm run test:smoke`：PASS
  - 复盘 UI 保存 weekly review：PASS
  - 复盘 UI 推进行动项到 `doing`：PASS

## Known Issues

- 直接运行 `npm run test:smoke` 曾出现一次首页 `h1` 等待超时；使用独立启动的本地 dev server 复跑通过。临时 3040 dev server 已停止，临时日志已删除。
- 工作树中存在其他会话或既有未提交改动，包括 PRD 禁止修改的核心文件和其他 UI 文件；本 Worker 未回退、未修改这些范围外文件。

## Orchestrator Decision Needed

- 无。建议 Orchestrator 只审查上述三个本任务文件，并单独处理并行会话留下的其他 dirty files。
