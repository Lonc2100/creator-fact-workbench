# LOCAL-DATA-QUARANTINE-PLAN-029 Worker Handoff

## Scope

为当前本地 self-media 数据污染问题补了一条非破坏性路径：先用只读检查命令识别数据来源分层，再用 clean profile / trusted scope 隔离后续运营视图。未删除数据库数据，未写批量删除脚本，未自动清库。

## Changes

- 新增只读检查脚本：
  - `scripts/local-data-quarantine-report.mjs`
  - npm command: `npm run check:local-data-quarantine`
- 脚本行为：
  - 以 `node:sqlite` 的 `readOnly` 模式打开 `.local/self-media.sqlite`。
  - 只读取 `entities` 与 `import_runs` 聚合统计。
  - 输出：
    - `.local/local-data-quarantine/report.json`
    - `.local/local-data-quarantine/report.md`
  - 报告只含分类、平台、collection、source 计数，不含 raw payload、cookie、token、headers，也不输出内容标题或实体 ID。
- 更新 `package.json`：
  - 增加 `check:local-data-quarantine` script。

## Current Source Classes

检查命令把当前本地数据分为以下互斥类别：

- `trusted_real_creator_center`
  - 明确来自 `douyin_creator_center`、`xiaohongshu_creator_center`、`video_account_creator_center`、`bilibili_creator_center` 的记录。
  - 对 `contents/metrics/platformVersions` 这类自身缺少 `source` 的记录，只在能从 `notes`、`contentId` 关联或现有字段推断 creator-center source 时归入该类。
- `demo_smoke`
  - `fake` source，或 id/action/title/topic/notes 等元信息出现 `demo/smoke/sample/seed/fake/test/o2/save-smoke/platform-smoke/烟测/演示/样例` 标记的记录。
  - 这类记录不应进入 clean profile 的运营总量。
- `manual_csv_mediacrawler_n8n`
  - 明确来自 `manual`、`csv`、`json`、`mediacrawler`、`n8n` 的记录。
  - 可作为历史工作台痕迹保留，但不应与真实 creator-center 数据混算。
- `paused_wechat`
  - `wechat` platform 或 `wechat_official` source。
  - 因公众号/微信后台当前仍暂停，应单独隔离，不继续扩展采集或保存。
- `unknown_unclassified`
  - 缺少可信 source 且无法从平台/内容关联安全推断来源的记录。
  - 默认不纳入 trusted dashboard/review。

## Read-Only Check Output Summary

命令：

```bash
npm run check:local-data-quarantine
```

本次输出摘要：

| Class | Entity rows | Import runs | Total records |
| --- | ---: | ---: | ---: |
| trusted_real_creator_center | 102 | 75 | 177 |
| demo_smoke | 533 | 1 | 534 |
| manual_csv_mediacrawler_n8n | 302 | 125 | 427 |
| paused_wechat | 79 | 3 | 82 |
| unknown_unclassified | 303 | 0 | 303 |
| total | 1319 | 204 | 1523 |

平台摘要：

- trusted creator-center：douyin 44、xiaohongshu 27、video_account 29、bilibili 72、unknown 5。
- demo/smoke：douyin 165、xiaohongshu 202、wechat 156、bilibili 5、unknown 6。
- manual/csv/mediacrawler/n8n：douyin 111、xiaohongshu 1、video_account 154、unknown 161。
- paused/wechat：wechat 82。
- unknown：douyin 4、xiaohongshu 5、video_account 1、unknown 293。

## Clean Profile Recommendation

优先建议：先做 `trusted_scope_view`，不要立即迁移或清理数据库。

推荐顺序：

1. `trusted_scope_view`
   - dashboard/review 默认只读取 `trusted_real_creator_center` 范围。
   - 明确排除 `demo_smoke`、`manual_csv_mediacrawler_n8n`、`paused_wechat`、`unknown_unclassified`。
   - 作品级运营总量只统计可信 creator-center 内容/MetricSnapshot，不与 operation history、import run、AccountMetricSnapshot 或 smoke 记录重复计数。
2. `clean_local_db`
   - 新建一个新的本地 sqlite 文件作为 clean profile。
   - 仅导入已验收的 creator-center preview/save 结果。
   - 当前代码的默认 DB path 固定为 `.local/self-media.sqlite`，且空库进入 service/dashboard 时可能触发 seed 数据，因此切换 clean DB 前需要主会话确认是否新增显式 DB path/profile 配置和 seed-free 开关。
3. `backup_then_seed_free_rebuild`
   - 先复制当前 `.local/self-media.sqlite` 作为证据备份。
   - 再生成一个不带 seed/demo 的新本地数据文件。
   - 该步骤必须由主会话确认后逐步执行，不在本任务中自动执行。

## Operational Guidance

- 每次平台运营前后可运行：
  - `npm run check:local-data-quarantine`
  - `npm run health:platform-data`
- dashboard/review 应继续把内容级指标与账号级指标分开：
  - 内容表现：只读 trusted creator-center 的作品级 metrics / metricSnapshots。
  - 账号趋势：未来只能读 `AccountMetricSnapshot` 或 preview-only 账号指标，不合并进作品总量。
  - operation history/import run 只做审计，不参与内容表现加总。
- B 站账号级指标仍不得入库，不得影响 dashboard/review 内容总量。
- 微信/公众号继续 paused，不作为 clean profile 的导入来源。

## Full Cleanup Requirement

如果用户之后要求彻底清理污染数据，必须由主会话再次确认，并一步一步执行：

1. 明确要保留的范围与证据文件。
2. 备份当前 DB。
3. 生成 dry-run 删除/迁移清单。
4. 用户确认每一步。
5. 才能考虑单文件、单集合、单记录级操作。

不得批量删除，不得自动清库，不得写批量删除脚本。

## Validation

- `npm run check:local-data-quarantine`：通过，生成 `.local/local-data-quarantine/report.json` 与 `.local/local-data-quarantine/report.md`。
- `npm run typecheck`：待运行。
- `git diff --check`：待运行。

## Main Session Decision Needed

是。需要主会话决定后续采用：

- 仅启用 trusted scope view；
- 还是新增 clean DB/profile 配置；
- 或者在备份后做 seed-free 重建。
