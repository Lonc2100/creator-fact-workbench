# CALENDAR-UI Worker Handoff

## Task

- Task ID: `.trellis/tasks/06-03-calendar-ui`
- Scope: `/calendar` 发布日历 UI 成熟化
- Locked files respected: 未修改 types/service/repo/runtime/package.json/docs/task-board.md

## Completed Work

- 将月视图从 35 格补成 42 格，覆盖完整 6 周日历排期。
- 在日历 pattern 顶部增加发布排期摘要：排期数、就绪数、检查完成率、阻塞数。
- 平台版本卡片补充短时间、状态、检查进度条、阻塞摘要和超量提示。
- 日期格补充今天/跨月弱化显示，空档态保持发布排期语义。
- 将页面筛选从下拉框升级为平台/状态 chip，显示当前筛选条件和结果数。
- 侧栏补充平台版本就绪度、阻塞原因 fallback、下一步动作和内容准备状态。

## Modified Files

- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `docs/handoffs/CALENDAR-UI-worker-handoff.md`

## Verification

- `npm run typecheck`
  - 首次失败：现有 `.next/types` 引用缺失。
  - 运行 `npm run build` 后重新生成 `.next/types`，随后通过。
- `npm run build`
  - 编译通过。
  - 收集页面数据阶段失败：`Cannot find module for page: /api/self-media/content-versions`。该问题发生在 Next build 路由收集阶段，和本任务 UI 文件无直接关系。
- `npm run verify:harness`
  - 通过。
- `npm run test:smoke`
  - 通过，包含 `uiDraggedVersion`。

## Browser Check

- 启动临时 `http://127.0.0.1:3032` 后，服务健康返回 200。
- Browser 打开 `/calendar` 时出现 Next dev cache/module miss：`Cannot find module './873.js'`。
- 该现象发生在已有 3001 dev server 卡住且 3032 并行共享 `.next` 缓存时；已停止 3032 临时进程。
- 以 `verify:harness` 和 `test:smoke` 作为本任务验收证据。

## Known Issues

- 未做全量视觉截图验收，原因是 Browser 验证被 Next dev 缓存冲突阻断。
- 本任务未实现月份切换；仍沿用当前数据锚点展示周/月。

## Orchestrator Decision Needed

- 无。若需要人工视觉 QA，建议在停止其他 dev server 后单独启动一个干净的 Next dev 实例再打开 `/calendar`。
