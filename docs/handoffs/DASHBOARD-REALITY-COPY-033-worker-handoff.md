# DASHBOARD-REALITY-COPY-033 Worker Handoff

## Task

把页面文案进一步改成用户一眼知道“这些数字是真的、哪些被排除、什么时候审计过”。

## Completed Work

- Dashboard 顶部可信运营条改成明确运营口径：
  - 显示“真实四平台内容级数据”。
  - 显示“非全库汇总”。
  - 明确默认运营看板只算抖音、小红书、视频号、B站创作中心内容快照。
  - KPI 文案改成真实内容、内容级快照、真实曝光、真实互动、最近审计、最近运营检查。
- Import 页上方状态区文案改成操作台口吻：
  - Daily gate 改为“每日运营检查 / 看板可用性”。
  - Health gate 改为“数据健康”。
  - Trusted audit 改为“看板审计 / 看板口径审计”。
  - blocking、mismatch、overall、completed 等开发词改成中文运营文案。
  - 默认看板口径面板说明哪些来源不进入默认看板，并强调历史数据仍在库里。
- Content 页排除/恢复文案更明确：
  - 标题改为“运营看板内容口径”。
  - 明确“不删除，只控制是否入看板”。
  - 按钮改为“不计入看板 / 恢复进看板”。
  - 操作反馈说明数据没有删除，仍保留在本地库。

## Changed Files

- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `docs/handoffs/DASHBOARD-REALITY-COPY-033-worker-handoff.md`

## Screenshot

- `.local/dashboard-reality-copy-033.png`

Screenshot check confirmed Dashboard top strip includes:

- `真实四平台内容级数据`
- `非全库汇总`
- `默认运营看板只算抖音 / 小红书 / 视频号 / B站创作中心内容快照`
- `最近审计`
- `最近运营检查`

## Verification

- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundaries

- Only UI copy and minimal presentational wording were changed.
- No data logic, Repo, Service, Runtime, API route, DB migration, or DB deletion was changed.
- No platform collection, login, gate execution, audit execution, save, or smoke action was added to UI.

## Known Issues

- None found in this task scope.
- The working tree already had many pre-existing modified/untracked files before this task; unrelated files were not reverted.

## Next Recommendation

- Orchestrator should review the screenshot and decide whether the Dashboard top strip should stay as a single compact strip or split into two rows if future copy becomes longer.

## Orchestrator Decision Required

Yes.
