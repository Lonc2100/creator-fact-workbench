# REAL-DATA-SCOPE-029 worker handoff

## 任务目标

把默认业务口径切到“可信真实平台数据”，避免 dashboard / reviews / import status 默认混入 demo、smoke、manual、csv、mediacrawler、n8n、wechat 等历史数据。

本轮未删除任何数据库数据，也未做真实采集按钮或 raw payload 展示。

## 默认可信来源

默认运营口径只信任以下 creator-center source：

- `douyin_creator_center`
- `xiaohongshu_creator_center`
- `video_account_creator_center`
- `bilibili_creator_center`

此外，为了防止历史 smoke/demo fixture 伪装成 creator-center source，Service 额外按内容/快照文本排除明显测试痕迹：

- `smoke`
- `demo`
- `test`
- `fixture`
- `op-save`
- `O2`
- `烟测`
- `浏览器烟测`
- `BiliOpSave`

这些数据仍保留在 Repo/DB 中，只是不进入默认 dashboard/reviews。

## 主要改动

### Types

- `src/domain/self-media/types/self-media-types.ts`
  - 新增 `RealDataScopeSourceSummary`。
  - 新增 `RealDataScopeSummary`。
  - `DashboardSnapshot` 增加 `realDataScope`。

### Service

- `src/domain/self-media/service/self-media-service.ts`
  - 增加 `trustedRealCreatorCenterSources`。
  - 增加 `isTrustedRealCreatorCenterSource`。
  - 增加 `isTestOrDemoContent`。
  - 增加 `isTrustedRealMetricSnapshot`。
  - 增加 `buildRealDataScopeSummary`。
  - `dashboard()` 默认只返回可信真实 creator-center content-level metric snapshots 关联的内容、指标、版本、review。
  - `saveReview()` 默认只基于可信真实 creator-center content-level metric snapshots。
  - `buildEvidenceInsights()` 默认只读取可信真实 creator-center snapshots。
  - `postImportActionSuggestions` 继续基于默认 filtered dashboard snapshots，不使用账号级指标进入内容总量。

### Runtime / Smoke

- `src/domain/self-media/runtime/self-media-runtime.ts`
  - 平台 save 操作不再把“默认 dashboard 未纳入 smoke/demo fixture”判定为保存失败。
  - 对被默认可信口径排除的保存结果返回 warning，提示可在排除来源统计中复核。

- `scripts/platform-personal-save-smoke.mjs`
  - 统一四平台 save smoke 改为验证：
    - 内容/指标/版本/快照已写入 Repo。
    - smoke fixture 不进入默认 dashboard/reviews。
    - `realDataScope` 记录对应 source 的 excluded snapshot count。
    - 默认 scope 为 `trusted_real_creator_center`。

### UI

- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
  - Dashboard 增加紧凑可信口径提示条。
  - KPI 文案改为可信真实内容数量。

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Import 页面增加“真实数据口径”面板：
    - 真实内容数。
    - 真实指标快照数。
    - 真实 import run 数。
    - 排除的测试/演示/历史指标数。
    - 排除来源摘要。
    - 当前默认看板是否可信。

- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
  - Review 页面说明默认只基于可信真实 creator-center 内容级数据生成结论。

## 测试覆盖

`tests/self-media-contract.test.ts` 增加/调整覆盖：

- `wechat_official` 同步数据保留在 Repo，但不进入默认 dashboard/reviews。
- `csv` 导入数据保留在 Repo，但不进入默认 dashboard/reviews。
- `manual` 导入数据保留在 Repo，但不进入默认 dashboard/reviews。
- `mediacrawler` / `n8n` 导入数据保留在 Repo，但不进入默认 dashboard/reviews。
- 四平台 unified smoke fixture 写入 Repo，但默认 dashboard/reviews 排除。
- B 站 operation save fixture 写入 Repo，但默认 dashboard/reviews 排除。
- 非 smoke 的真实 creator-center ID 仍可进入默认 dashboard/reviews。

## 验证

- `npm run test:self-media`：通过，75/75。
- `npm run typecheck`：通过。
- `npm run verify:harness`：通过。
- `git diff --check`：通过。

## 风险与主会话判断点

- 当前测试痕迹排除规则是保守文本匹配，主要覆盖历史 smoke/demo/test fixture。若未来真实内容标题包含这些词，可能被默认口径排除，需要主会话决定是否改为显式 source/run metadata 标记。
- all-data 视角目前通过 Repo 数据和 `realDataScope` excluded/all counts 保留为调试口径，没有新增默认 UI 入口。
- 现有工作区包含大量前序任务未提交改动，本 handoff 只描述 REAL-DATA-SCOPE-029 相关改动。
