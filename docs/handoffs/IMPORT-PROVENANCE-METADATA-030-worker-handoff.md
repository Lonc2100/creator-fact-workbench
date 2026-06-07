# IMPORT-PROVENANCE-METADATA-030 Worker Handoff

## Scope

把 REAL-DATA-SCOPE-029 的临时文本匹配 fixture 排除，升级为结构化 provenance metadata 优先的 trusted scope 方案。未删除数据库数据，未迁移旧数据，未清库。

## Implemented

- 类型层新增 provenance metadata：
  - `ImportOperationKind`
  - `ImportProvenanceMetadata`
  - `ImportRun.provenance`
  - `MetricSnapshot.provenance`
  - `ProviderImportPayload.provenance`
  - `OperationHistory.provenance`
  - `MetricSnapshotRequest.provenance`
  - `PlatformImportOperationSummary.provenance`
- 写入路径：
  - `SqliteSelfMediaRepo.savePayload()` 会把 payload provenance 写入 import run。
  - `SelfMediaService.importPayload()` 会把 provenance 写入对应 MetricSnapshot。
  - `SelfMediaService.upsertMetricSnapshot()` 支持显式 provenance。
  - 平台 import 方法支持可选 provenance 参数，旧调用不传仍可读取/写入。
  - `/import` operation history 会保存 summary provenance。
- trusted scope 判断：
  - 先看 `snapshot.provenance.isTestFixture` 与 `snapshot.provenance.trustedScopeEligible`。
  - `isTestFixture: true` 或 `trustedScopeEligible: false` 排除默认 dashboard/review。
  - `trustedScopeEligible: true` 允许真实 creator-center 数据进入，即使标题包含 `test/demo`。
  - 没有 provenance 的旧数据继续使用历史文本兜底，兼容污染库。
- smoke 标记：
  - `scripts/platform-personal-save-smoke.mjs` 对四平台 smoke 写入 `isTestFixture: true`、`operationKind: platform_save_smoke`、`trustedScopeEligible: false`。
  - `runSelfMediaPlatformImportOperation({ action: "save_smoke" })` 对 operation smoke 使用同样 fixture metadata。
  - 普通平台 `save` 写入 `operationKind: platform_save`、`isTestFixture: false`、`trustedScopeEligible: true`。
  - `preview` 只写 operation history summary provenance，不写 Repo 内容。
- 本地隔离检查脚本同步调整：
  - `scripts/local-data-quarantine-report.mjs` 现在 metadata 优先、文本匹配只做旧数据兜底。

## Tests Added / Updated

- 新增覆盖：
  - 标记为 fixture 的 creator-center source 不进默认 dashboard/review。
  - 未标记、真实 creator-center source 仍可进入默认 dashboard/review。
  - 标题含 `test/demo` 但 metadata 表示真实时，不再被文本兜底误排除。
- 更新统一四平台 save smoke 测试：
  - 验证 import run 与 metric snapshot 都带 fixture provenance。
- 更新 B 站 operation save 测试：
  - 普通 save 因 `platform_save` metadata 进入 trusted scope。
  - B 站 account diagnostics 仍不保存为 AccountMetricSnapshot，也不混入内容指标。

## Compatibility

- 所有 provenance 字段都是 optional。
- 旧数据库没有 metadata 时仍可读取。
- 旧 smoke/demo/test 污染行仍由文本兜底排除。
- 没有做 DB 删除、清库、迁移或批量修复。

## Validation

- `npm run test:self-media`：通过，80/80。
- `npm run typecheck`：通过。
- `npm run verify:harness`：通过。
- `npm run check:local-data-quarantine`：通过，metadata 优先分类报告生成成功。
- `git diff --check`：通过。

## Main Session Decision Needed

是。后续需要主会话判断是否：

- 给历史污染数据做只读 provenance backfill 方案设计；
- 或保持 metadata 优先 + 文本兜底，等待自然替换；
- 或新增显式 all-data/debug scope UI。
