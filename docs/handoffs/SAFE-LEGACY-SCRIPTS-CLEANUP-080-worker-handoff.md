# SAFE-LEGACY-SCRIPTS-CLEANUP-080 worker handoff

## 结论

本轮未删除任何脚本文件。

原因：任务要求基于 `REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080` 的结论，仅删除“明确无用且无敏感价值”的脚本；但当前仓库内未找到该 attribution handoff 或等价的 exact delete list。已有资料只把若干脚本列为 `paused/diagnostic archive`、`staleOrPausedCandidates` 或重复候选，这些分类不等于已确认可删除。

为避免误删真实采集、验收、诊断或当前 `package.json` 已引用的脚本，本轮安全停止在 handoff 记录阶段。

082 归档说明：本 handoff 记录的是 cleanup 执行当时的阻塞状态。后续 `REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080-worker-handoff.md` 已出现，并确认没有 exact-path 删除建议；后续脚本处理应以该归因 handoff 的 action lists 为准。

## 删除前 exact path 列表

无。

未执行任何 `Remove-Item`。未使用通配符、目录删除、`git clean` 或批量删除。

## 已读取/核对

- `AGENTS.md`：清理任务必须逐个明确路径 `Remove-Item`，禁止脚本批量删除文件或目录。
- `docs/quality-execution-system.md`：清理必须说明删除了什么复杂度、保留什么契约、跑了什么验证、残留什么风险。
- `docs/golden-principles.md`：删除优于兼容包袱，但清理要保持当前契约并可验证。
- `docs/entropy-governance.md`：脚本候选只能先列入候选；删除、合并、改名必须由单独 cleanup 任务处理，并跑对应验收。
- `.local/entropy-governance-scan/report.md` 与 `.local/entropy-governance-scan/report.json`：显示脚本重复候选、未跟踪脚本、stale/paused 候选，但未给出“明确无用且无敏感价值”的删除确认清单。

## 查找结果

未找到以下文件或同名任务 handoff：

- `docs/handoffs/REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080*`
- 仓库内任意 `*REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080*`

当前未跟踪脚本清单：

- `scripts/bilibili-account-metrics-preview.mjs`
- `scripts/bilibili-personal-discovery.mjs`
- `scripts/calendar-real-scheduling-smoke-044.mjs`
- `scripts/check-browser-automation.mjs`
- `scripts/content-curation-e2e.mjs`
- `scripts/dashboard-number-trust-audit.mjs`
- `scripts/douyin-personal-discovery.mjs`
- `scripts/draft-review-ui-e2e-039.mjs`
- `scripts/operating-e2e-action-to-content.mjs`
- `scripts/operating-e2e-dashboard-import.mjs`
- `scripts/sync-wechat-official.ts`
- `scripts/video-account-personal-discovery.mjs`
- `scripts/wechat-backend-discovery.mjs`
- `scripts/xiaohongshu-personal-discovery.mjs`

当前 `package.json` 已引用上述未跟踪脚本中的多项 discovery、diagnostic、E2E、smoke、sync 命令。删除这些文件会破坏当前工作区的 package script 契约，因此它们不能仅凭“未跟踪”或“paused/diagnostic”被删除。

## 安全边界

本轮未触碰：

- 真实数据；
- 登录状态；
- `.local/self-media.sqlite` 或其他运营 DB；
- `.local/` 证据目录；
- Chrome profile/cookie/raw capture；
- 已跟踪业务代码。

## 验证

- `git status -sb`：用于记录前后工作区状态。
- `git diff --check`：通过，无输出。

## 后续可执行路径

若要继续 SAFE-LEGACY-SCRIPTS-CLEANUP-080，需要先提供或生成一个明确的 deletion approval list，每一项必须是单个 exact path，并说明：

1. 为什么该脚本已无用；
2. 是否被 `package.json`、handoff、runbook 或测试引用；
3. 是否含敏感路径、账号、cookie、DB 写入或真实运营逻辑；
4. 删除后需要跑哪些验收命令。

拿到该列表后，才能逐个执行：

```powershell
Remove-Item -LiteralPath '<exact file path>'
```

每次仅一个文件路径，不使用通配符，不删除目录。
