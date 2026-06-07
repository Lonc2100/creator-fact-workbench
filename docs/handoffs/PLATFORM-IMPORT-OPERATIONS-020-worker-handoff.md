# PLATFORM-IMPORT-OPERATIONS-020 Worker Handoff

## 任务结论

已完成抖音、小红书、视频号三个已闭环平台的本地导入操作入口。本轮只使用已有脱敏 raw capture 目录和现有 provider/service 保存能力，不触发浏览器采集、不自动登录、不采集 raw payload、不做公众号/微信后台、不做 B 站。

## 实现范围

- Types
  - 在 `src/domain/self-media/types/self-media-types.ts` 新增 `PlatformImportOperationPlatform`、`PlatformImportOperationAction`、`PlatformImportOperationRequest`、`PlatformImportOperationSummary`、`PlatformImportOperationResult`。
- Runtime
  - 在 `src/domain/self-media/runtime/self-media-runtime.ts` 新增 `runSelfMediaPlatformImportOperation`。
  - 固定白名单平台：
    - `douyin` -> `.local/douyin-personal-v0/raw`
    - `xiaohongshu` -> `.local/xiaohongshu-personal-v0/raw`
    - `video-account` -> `.local/video-account-personal-v0/raw`
  - 支持动作：
    - 单平台 `preview`
    - 单平台 `save`
    - 三平台 `save_smoke`
  - raw capture 缺失或目录为空会返回明确错误，不假成功。
  - 返回结构化 summary：`platform`、`source`、`contentCount`、`metricCount`、`warnings`、`runId`、`passed`。
  - summary 不包含 raw payload、cookie、token、header、password。
- API
  - 新增 `src/app/api/self-media/platform-imports/operations/route.ts`。
  - App Wiring 只 import Runtime，已通过 `lint:arch`。
  - guardrail：
    - 仅允许本地开发环境或 production 下 localhost/127.0.0.1/::1 调用。
    - 请求体递归拒绝 `cookie/token/password/header/raw/rawPayload/capture/captures` 等字段。
    - 不接受 raw payload，也不返回 raw payload。
- UI
  - 在 `src/domain/self-media/ui/screens/ImportPage.tsx` 的“平台导入状态”面板内新增紧凑操作区。
  - 每个平台提供“预览 / 保存”按钮。
  - 提供“三平台保存烟测”按钮。
  - 有运行中、成功、失败状态；运行中禁用所有按钮，避免重复点击。
  - 显示每个平台 summary 和 warning 摘要。
  - 样式补充在 `src/app/globals.css`，仅导入状态/操作区相关。
- Tests
  - `tests/self-media-contract.test.ts` 新增覆盖：
    - 白名单平台限制。
    - raw capture 不存在时报错。
    - preview summary 不含 raw payload/sensitive 字段。
    - save 后 dashboard/review 可读。

## 边界确认

- 未修改 Repo 持久化结构。
- 未新增 nativeMetrics/rawFields 持久化。
- 未接 live platform API。
- 未触发真实浏览器采集。
- 未改 dashboard/reviews/calendar 主流程。
- 未做公众号/微信后台。
- 未做 B 站。
- 未暴露 shell 命令给 UI 输入，前端只使用白名单平台枚举和固定 action。

## 验证结果

- `npm run test:self-media`：通过，42/42。
- `npm run typecheck`：通过。
- `npm run verify:harness`：通过。
- `git diff --check`：通过。
- 截图：已保存并人工查看 `.local/platform-import-operations-020.png`。

## 运行观察

- 本地 dev server 曾临时启动在 `http://127.0.0.1:3200/import` 用于截图；截图后已关闭监听。
- in-app browser 截图 CDP 命令超时，已改用项目现有 `agent-browser` CLI 保存截图。截图文件存在且能看到新操作区。

## 需主会话判断

是。

建议主会话判断：

- API 路径 `/api/self-media/platform-imports/operations` 是否作为长期命名保留。
- `save_smoke` 当前在 runtime 中按三平台逐一 save 并做 dashboard/review 可读检查；如后续要完全复用 `scripts/platform-personal-save-smoke.mjs` 的“双 save 幂等”报告，可再抽共享模块。
- 当前 UI 操作成功后只展示本次 summary，不自动刷新整个 dashboard snapshot；是否要后续增加轻量刷新入口或局部状态重拉。
