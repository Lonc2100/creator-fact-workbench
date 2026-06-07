# CONTENT-DRAFT-REVIEW-038 Worker Handoff

## Summary

把行动项生成的内容/排期草稿推进到可人工编辑确认的内容工作流。新增服务层草稿审核操作，由 Service 同步 `ContentItem`、`ContentPlatformVersion`、`PublishQueueItem` 和关联行动项；UI 在 `/content/` 提供紧凑的草稿审核台；Dashboard 已关联内容的行动项提供清晰跳转。

这不是自动发布：草稿审核、排期和 Calendar 拖拽不会调用真实平台 API，也不会生成 publish record。发布成功/失败只能通过人工发布确认记录。

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - 新增 `ContentDraftReviewRequest` / `ContentDraftReviewResult`。
- `src/domain/self-media/service/self-media-service.ts`
  - 新增 `reviewContentDraft`。
  - 新增 workflow 同步 helper：从 platform version 同步 content root、queue、action item。
  - `patchPlatformVersion` 排期/状态变更后同步 queue，但不生成 publish record。
  - `confirmPlatformVersionPublish` 发布确认后同步 content/queue。
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - 新增 `reviewSelfMediaContentDraft` runtime。
- `src/app/api/self-media/content-versions/route.ts`
  - `PATCH` 支持 `action: "review_draft"`，保留 `confirm_publish`。
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
  - 草稿审核台支持编辑 title/body/topic/scheduledAt/status/nextAction/checklist。
  - 增加行动项/queue 引用和人工发布结果按钮。
- `src/domain/self-media/ui/screens/ContentPage.tsx`
  - 接入草稿审核、人工发布确认、URL contentId/versionId 选中。
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
  - 已关联内容的行动项显示“打开内容草稿”和“查看排期”。
- `src/app/globals.css`
  - 增加紧凑引用区和人工发布确认区样式。
- `tests/self-media-contract.test.ts`
  - 新增草稿审核服务层闭环测试。
- `tests/ui-harness.test.mjs`
  - 新增 UI/harness 静态覆盖。
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - 更新 Content/Calendar/Dashboard 状态和 guardrails。

## Behavior Notes

- `reviewContentDraft` 可改：
  - content title/topic/status/scheduledAt；
  - platform version title/body/status/scheduledAt/nextAction/checklist；
  - queue status/scheduledAt/nextAction。
- `draft` / `scheduled` / `published` / `failed` 明确分离：
  - 草稿审核不允许直接写 `published` / `failed`。
  - `published` / `failed` 通过 `confirm_publish` 人工确认。
  - schedule patch 不生成 publish record。
- action-generated drafts visible in `/content/` and `/calendar` but do not enter trusted dashboard/review metric totals without trusted creator-center metric snapshots.

## Validation

- `npm run test:self-media` PASS
  - 115 tests pass.
- `npm run typecheck` PASS
- `npm run test:ui-harness` PASS
  - 6 tests pass.
- `npm run verify:harness` PASS
- `git diff --check` PASS

## Screenshot / Visual Note

未保存截图。原因：当前本机 3200/3201 以及临时 3202 均出现“端口监听但 dashboard API timeout / old route”的本地服务健康问题；已用 `npm run check:local-server-health -- --ports=3200,3201` 和临时 3202 检查确认。3202 是本轮临时启动用于截图尝试的服务，已停止。UI 变更由 `test:ui-harness` 和 `verify:harness` 覆盖。

## Boundaries

- 未调用真实平台 API。
- 未恢复公众号。
- 未保存 B站账号级指标。
- 未删除 DB。
- 未自动发布。
- 未让 action-generated draft 进入 trusted metric totals。

## External Reference Scan

按 `AGENTS.md` 要求，参考了成熟社媒排期/内容工作流方向：

- Postiz: https://github.com/gitroomhq/postiz-app
- Mixpost: https://github.com/inovector/mixpost

本轮只借鉴“草稿/审核/排期/发布确认分层”的产品边界，没有引入新依赖。

## Needs Main Session Judgment

是。
