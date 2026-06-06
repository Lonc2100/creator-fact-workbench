# 熵扫描与治理规则

本文件是 `ENTROPY-GOVERNANCE-SCAN-073` 的长期治理入口。目标不是自动清理，而是让项目能定期发现文件系统漂移、证据膨胀、过期 handoff、未索引 spec、重复脚本和真实 DB 污染风险。

## 固定扫描命令

```bash
npm run scan:entropy
```

该命令只读扫描：

- 不删除文件或目录；
- 不写入 sqlite；
- 不迁移证据；
- 输出报告到 `.local/entropy-governance-scan/report.json` 和 `.local/entropy-governance-scan/report.md`。

扫描范围：

- `git status --porcelain=v1 --untracked-files=all` 的 modified/untracked 统计；
- `docs/handoffs/` 总量、未跟踪量、未被当前状态入口引用的归档候选；
- `docs/product-specs/` 总量、未跟踪量、未进入 `docs/product-specs/index.md` 的 spec；
- `.local/` 文件数、体积、sqlite/db 数量、大文件/大目录和本地敏感资产；
- `scripts/` 未跟踪、未被 package script 引用、疑似重复/过期脚本；
- `.local/self-media.sqlite` 中带 demo/smoke/test/fixture/acceptance 等标记的疑似验收污染记录。

## 子会话验收数据库规则

所有 Worker、Auditor、Explorer 子会话的验收、smoke、E2E、fixture、acceptance 命令默认必须使用隔离 DB。

允许：

- 使用临时目录下的 `test.sqlite`；
- 使用 `.local/<task-id>/...sqlite`；
- 使用脚本明确声明的 smoke DB，例如 `.local/platform-personal-save-smoke/self-media-smoke.sqlite`；
- 使用 `SELF_MEDIA_DB_PATH` 指向隔离文件，并设置 `SELF_MEDIA_SEED_MODE=off` 或任务明确要求的隔离 seed。

禁止：

- 让 smoke/E2E/acceptance 默认写入 `.local/self-media.sqlite`；
- 把 demo、fixture、seed、sample、test、acceptance 数据写入真实 operating DB；
- 为了让验收通过而清空、改写、迁移真实 operating DB；
- 在未说明隔离路径的情况下复用 3200 真实 operator 服务做写入验收。

如果必须用真实 `.local/self-media.sqlite` 做 live read-only 验证，任务必须写明 `read-only`，并在 handoff 中记录没有执行写入路径。

## Handoff 生命周期

`docs/handoffs/CURRENT-PLATFORM-STATUS.md` 是当前入口，不是所有历史记录的平铺索引。

规则：

- 当前主线、已接受 release、仍影响日常操作的 handoff 必须被 `CURRENT-PLATFORM-STATUS.md` 或 `docs/handoffs/README.md` 引用。
- 历史 UI、暂停平台、诊断探索、失败方案、重复 worker 记录默认进入归档候选，不要批量加入当前入口。
- 新任务完成必须写自己的 handoff，但只有被 Orchestrator 接受后才进入当前状态入口。
- 未跟踪 handoff 不等于可删文件；只能先分类为归档候选或待确认删除候选。

建议后续新增一个显式历史索引，例如 `docs/handoffs/archive-index.md`，只收纳 `historical`、`superseded`、`paused`、`diagnostic-only` 标签，不混入当前主线。

## Product Spec 索引策略

`docs/product-specs/index.md` 是 active/supporting/paused 的唯一索引入口。

规则：

- active release spec 必须进入 Active Release Baseline 或 Active Supporting Specs。
- paused/diagnostic-only spec 必须明确标注为 paused 或 diagnostic-only。
- 未进入 index 的 spec 视为未索引候选；不能被 Worker 当成 active scope。
- 不允许因为本地存在 spec 草稿就默认恢复暂停平台或诊断能力。

## `.local` 证据保留周期

`.local/` 是本地证据和真实资产混合区，默认不进 git，也不能自动清理。

保留规则：

- `.local/self-media.sqlite`、Chrome profile、cookies、raw capture、真实周报等属于敏感/本地资产，不能自动迁移、上传或删除。
- 当前任务的验收报告、截图、隔离 DB 可以保留到 Orchestrator 接受后一个复盘周期。
- smoke/E2E 产生的重复 sqlite、截图、报告在进入 handoff 摘要后，进入“可删除但需用户确认”清单。
- 安全可分享报告优先使用 redacted/safe 输出；完整本地报告只保存在 `.local`。

清理流程：

1. 运行 `npm run scan:entropy`。
2. 阅读 `.local/entropy-governance-scan/report.md`。
3. 把清理候选写入 handoff 或 cleanup manifest。
4. 用户明确确认具体文件后，才允许逐个 `Remove-Item -LiteralPath ...`。
5. 禁止脚本批量删除文件或目录。

## 脚本治理策略

脚本分为四类：

- active command：被 `package.json` 暴露，仍在当前 runbook/status 中使用；
- acceptance command：只服务某个任务的隔离验收，必须写明隔离 DB/端口/输出目录；
- diagnostic-only：探索、preview、browser、paused 平台相关脚本，不能被宣传为 active release；
- archive/delete candidate：被统一脚本替代、未被 package script 引用、且 handoff 已留存证据的脚本。

重复脚本只能先列入候选。删除、合并、改名都必须由单独 cleanup 任务处理，并跑对应验收。

## 定期节奏

- 每个 Worker 完成后：至少确认没有把 `.local` 大文件加入 git staging。
- 每个 release/status closure：运行 `npm run scan:entropy`，把摘要写入 handoff。
- 每周：审查归档候选和 `.local` 超量候选。
- 每月：由 Orchestrator 选择是否启动 strict slim refactor；删除仍必须逐项确认。
