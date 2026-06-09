# MAINLINE-IMPORT-FIRST-SCREEN-CONSOLIDATION-109 Worker Handoff

## Scope
- Goal: converge `/import` first screen into a creator-facing data update page.
- Result: implemented low-risk UI/component consolidation only; no provider, save, capture, route, or persistence logic was changed.
- Commit status: yes, prepared for commit with `refactor(self-media): simplify import first screen`; final commit hash is reported by the worker after commit.

## ImportPage Component Split
- Added `src/domain/self-media/ui/patterns/ImportPlatformOverview.tsx`.
- Removed the old inline `ImportFirstViewportGuide` from `ImportPage.tsx`.
- `ImportPage.tsx` now owns only the active detail panel state and existing capture/import actions.

## First Screen Content
- Page title: `数据更新`.
- One-line copy: `手动更新平台数据，预览后确认保存。`
- First-screen overview panel: `今天怎么更新数据`.
- Four platform cards:
  - Douyin: `登录抓取可用`, main action `打开抖音更新`.
  - Xiaohongshu: `内容分析表格可用`, main action `打开小红书更新`.
  - Video Account: `手动更新为主`, main action `手动更新视频号`.
  - Bilibili: `内容级导入可用`, main action `导入 B站数据`.
- First-screen boundary copy includes:
  - 保存前人工确认
  - 不会自动打开平台窗口
  - 视频号手动更新为主
  - B站账号指标 preview-only

## Folded Content
- Folded by default:
  - 登录抓取状态与手动刷新
  - 抖音更新详情
  - 小红书更新详情
  - 发布后数据回收
  - 本地导出兜底
  - 四平台同步与数据新鲜度
  - 高级诊断与手动导入
- Local fallback now has platform sub-folds:
  - 抖音本地导出兜底
  - 小红书本地导出兜底
  - 视频号手动更新
  - B站数据导入
- Clicking Video Account or Bilibili from the first screen opens only the local fallback wrapper plus the matching platform sub-panel.

## Preserved Capabilities
- Douyin assisted browser open/status/list/detail preview/save/close entries remain in the Douyin detail panel.
- Xiaohongshu content-analysis table/detail fallback preview/save/close entries remain in the Xiaohongshu detail panel.
- Video Account manual CSV/XLSX update preview/confirm/save remains available.
- Bilibili content-level CSV/XLSX import preview/confirm/save remains available.
- Diagnostics and generic/manual import remain available only after explicit expansion.

## Auto-Open Boundary
- Page startup still only refreshes local browser profile status.
- `focus` / `visibilitychange` still only prompts the user to refresh manually.
- No first-screen button opens platform windows directly; first-screen buttons only expand local details.
- Platform backend windows are opened only by explicit detail-panel buttons such as `douyin-login-browser-open` or `xiaohongshu-login-browser-open`.

## Live 3200 Acceptance
- Fixed entry used: `http://localhost:3200/dashboard`, then `/import`.
- Server: restarted 3200 from `NEXT_DIST_DIR=.next-build-109-main npm run start` because the old 3200 process was serving pre-109 code.
- Health: PASS on strict local server health after restart.
- `/import` first screen:
  - Shows four platform status cards and the four main actions.
  - Shows 0 default-open detail panels.
  - Does not expose first-screen technical words: API, raw, evidence, run id, local paths, storageState, password, cookie, token, header.
  - Browser tab count stayed stable during overview button clicks.
- Button checks:
  - `打开抖音更新` opens `login-capture-detail-panel` + `douyin-import-update-detail`.
  - `打开小红书更新` opens `login-capture-detail-panel` + `xiaohongshu-import-update-detail`.
  - `手动更新视频号` opens `local-export-fallback` + `video_account-import-update-detail`.
  - `导入 B站数据` opens `local-export-fallback` + `bilibili-import-update-detail`.

## Verification
- `git diff --check`: PASS
- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS, 150 tests
- `npm run test:ui-harness`: PASS, 19 tests
- `NEXT_DIST_DIR=.next-build-109-main npm run build`: PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS

## Remaining Risk
- `ImportPage.tsx` is still large; this task extracted only the first-screen overview and added detail folds.
- Local fallback still shares one wrapper for all local import methods; platform sub-folds now prevent first-screen Bilibili/Video Account clicks from dumping all local panels at once.
- Browser live check verified expansion and no extra tabs; it did not trigger external platform open buttons or save buttons.

## Remaining Dirty Files Not Staged For 109
- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
- `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

## Timing
- Started: 2026-06-09 16:18 +08:00, approximate continuation time after context compaction.
- Finished: 2026-06-09 16:51 +08:00.
- Elapsed: about 33 minutes.
- Workload class: M.

## Main Session Decision
- 需主会话判断：否
