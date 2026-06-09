# MAINLINE-NAVIGATION-REVIEWS-SURFACE-CLEANUP-112 Worker Handoff

## Summary
- 目标：收敛主导航、复盘页首屏、线索入口和内部页日常可见性。
- 结果：完成。
- 是否提交：是。本 handoff 随 `refactor(self-media): simplify navigation and review surfaces` 提交；最终 hash 由提交后 `git rev-parse HEAD` 确认。
- 需主会话判断：否。

## 主导航最终入口列表
- 总览：`/`
- 导入：`/import`
- 内容：`/content`
- 发布日历：`/calendar`
- 数据看板：`/dashboard`
- 周月复盘：`/reviews`

## Leads 如何处理
- `线索` 已从日常主导航移除。
- `/leads` 路由和页面未删除，仍作为二级入口保留。
- 总览页的线索卡不再直接指向 `/leads`，改为指向 `/reviews#review-lead-followups`。
- 复盘首屏新增“线索轻量跟进”卡片，说明线索先作为复盘动作的一部分推进，避免误导为成熟 CRM 主线。

## UI Lab / 内部页
- `UI Lab` 未出现在左侧日常导航。
- 旧综合 Workbench 未挂到日常导航。
- 本轮未删除 `UiLabPage`、`LeadsPage` 或任何内部页文件。
- 工作区中 `LeadsPage.tsx` 与 `UiLabPage.tsx` 已有 unrelated dirty，本轮没有 stage 它们。

## Reviews 首屏保留内容
- 新增 `ReviewFocusSurface`：
  - 近 7 天表现摘要。
  - 近 30 天表现摘要。
  - Top 内容，按可信 user_work 最新快照排序。
  - 少量行动项，默认最多 5 条。
  - 线索轻量跟进二级入口。
  - 复盘口径说明。
- `EvidenceReviewReport` 仍保留，但放入 `reviews-full-detail` 折叠区，默认关闭。

## 默认技术词污染
- 3200 live 检查：默认可见 body 文本未匹配 `run id/raw/evidence/API/path/storageState/cookie/token/header/测试/验收/诊断`。
- 完整复盘明细内部仍保留历史明细和指标来源能力，但默认不可见。

## 3200 Live 验收
- 固定入口：`http://localhost:3200/dashboard`
- 服务：`.next-build-112-main`，端口 3200。
- Dashboard 左侧导航链接：
  - `/` 总览
  - `/import` 导入
  - `/content` 内容
  - `/calendar` 发布日历
  - `/dashboard` 数据看板
  - `/reviews` 周月复盘
- 未出现：
  - `/leads`
  - `/ui-lab`
  - UI Lab / 内部实验 / 旧工作台
- `/reviews` live 观察：
  - `reviews-focus-surface` 存在。
  - `review-top-content` 存在。
  - `review-priority-actions` 存在。
  - 默认行动项数量为 5。
  - `review-lead-followups` 存在。
  - `reviews-full-detail` 存在且默认关闭。

## 验证命令结果
- `git diff --check`：PASS。
- `npm run typecheck`：PASS。
- `npm run test:self-media`：PASS，150 tests。
- `npm run test:ui-harness`：PASS，19 tests。
- `NEXT_DIST_DIR=.next-build-112-main npm run build`：PASS。
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`：PASS，healthy port 3200。

## 剩余风险
- `/leads` 页面仍是可访问二级页，后续若确认没有真实闭环，可进一步改为只读说明页或移入复盘内部面板。
- 完整复盘明细的内部命名仍是 `EvidenceReviewReport`，但已从默认首屏隐藏；若后续继续产品化，可改名为业务化的 `ReviewDetailReport`。
- 本轮未处理 unrelated dirty 文件，提交时需继续精确 stage。

## Extra-Depth Pass
- 因本轮低于 15 分钟，额外检查了：
  - Sidebar 桌面导航和 rail 导航都没有 Leads / UI Lab。
  - 总览页不再直接链接 `/leads`。
  - `/reviews` 默认首屏可见文本没有技术词污染。
  - `reviews-full-detail` 在 live 页面中默认关闭。

## Timing
- Started：2026-06-09 17:57:48 +08:00
- Finished：2026-06-09 18:08:47 +08:00
- Elapsed：约 11 分钟
- Workload class：Medium
