# MAINLINE-XHS-ASSISTED-DETAIL-CAPTURE-101 worker handoff

## Summary

- Goal: commit the completed 100 assisted mouse detail capture work, then repair Xiaohongshu assisted capture so AI does not ask the user to manually open detail pages.
- 100 commit hash: `c9213ee` (`feat(self-media): add assisted detail capture clickthrough`).
- 094 handoff: not submitted in 101; it remained untracked and was explicitly outside the 100 commit scope.
- 101 code is not committed in this handoff. The required 100 commit was completed first; 101 leaves scoped repair changes for review.

## 100 commit

- Precisely staged the requested 100 files only.
- Confirmed no `.local/.agents/.codex/.trellis` staged.
- Confirmed no `browser.newContext`, no automatic save, no automatic `userConfirmedContentMetrics: true`, and no raw/cookie/token/header/storageState/screenshot/HAR/trace persistence in the staged 100 scope.
- Commit: `c9213ee`.

## Douyin Regression

- Did not redo the Douyin mainline save.
- Regression basis: committed 100 handoff and current live dashboard still include the successful Douyin assisted detail capture from 100.
- Current live trusted dashboard: `contents=13`, `metricSnapshots=13`, `metrics=13`.
- Current platform distribution: `douyin=5`, `bilibili=8`.
- Calendar default item count stayed `195`; no additional Douyin calendar pollution was observed in 101.

## Xiaohongshu Repair Result

- User clarified that clicking a visible note/title opened public `xiaohongshu.com/explore/...` and showed a public-site login QR dialog.
- Repair changed Xiaohongshu assisted clickthrough to avoid treating public explore pages as trusted detail pages.
- Repair changed the click path to enter creator backend data board content analysis first:
  - click `数据看板`
  - click `内容分析`
  - hover visible rows to reveal hidden actions
  - only click backend action candidates with data/detail/analysis semantics
  - no longer click note title, cover, or whole row as a detail target
- Live attempt reached `https://creator.xiaohongshu.com/statistics/data-analysis`.
- Live click diagnostics:
  - `safe_click_targets_16`
  - `safe_click_action_targets_1`
  - `attempted_safe_clicks_1`
- Result: no stable note detail URL and no stable drawer/modal with note ID.

## Fail-Closed Fix

- A live preview initially exposed a bad candidate on Xiaohongshu data-analysis:
  - `nativeId=creator-feedback-wrapper`
  - `title=笔记题材`
  - metrics included a leaked date-like `shares=2026`
- This was not saved.
- Provider-level defense was added so these aggregate/UI containers are rejected even if route extraction misreads them:
  - rejects `creator-feedback-wrapper`, `feedback`, `wrapper`, `data-analysis`, `statistics`
  - rejects aggregate titles/text such as `笔记题材`, `账号概览`, `内容分析`, `观看数据`, `互动数据`, `涨粉数据`, `发布数据`, `数据总览`, `统计周期`
  - rejects `近7日` / `近30日` / aggregate statistics context from Xiaohongshu detail save candidates
- Added synthetic contract fixture matching the live bad pattern: `creator-feedback-wrapper + 笔记题材 + 分享 2026` must return zero detail rows.

## Save / Dashboard / Calendar

- Xiaohongshu clean detail row: no.
- Xiaohongshu saved: no, `0` rows.
- Dashboard before XHS repair/acceptance: `contents=13`, `metricSnapshots=13`, `metrics=13`, `calendarItems=195`.
- Dashboard after XHS repair/acceptance: `contents=13`, `metricSnapshots=13`, `metrics=13`, `calendarItems=195`.
- Calendar polluted: no. Default calendar item count remained `195`; no Xiaohongshu historical/aggregate capture was saved.

## Failure Point

- Not a normal login blocker for creator backend: `creator.xiaohongshu.com/new/note-manager` and `creator.xiaohongshu.com/statistics/data-analysis` were reachable with the persistent profile.
- Public `xiaohongshu.com/explore/...` did require QR login, but that route is now treated as an invalid public-site path and not a trusted source.
- Specific remaining blocker: the visible creator `statistics/data-analysis` page exposes aggregate content-analysis/account widgets, but the route did not find a backend action or drawer that exposes a stable single-note ID plus same-note metrics. The one initially extracted row was an aggregate UI container and is now rejected by provider defense.
- Next concrete repair point: identify the platform's actual per-note drilldown entry inside `内容分析` (likely a filtered row/table area below the aggregate chart, pagination/scroll region, or a hidden action after selecting a specific note row). The selector must require a stable note ID from creator-domain URL/data attribute/drawer before preview/save.

## Validation

- `git diff --check`: pass.
- `npm run typecheck`: pass.
- `npm run test:self-media`: pass, 147 tests.
- `npm run test:ui-harness`: pass, 19 tests.
- `NEXT_DIST_DIR=.next-build-101-main npm run build`: pass.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: pass, healthy port `3200`.

## Boundaries

- No WeChat/公众号 restoration.
- Video Account remains discovery-only.
- Bilibili account metrics remain preview-only.
- No real publish API calls.
- No MediaCrawler public data saved into trusted dashboard.
- No password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace saved or committed.
- No real platform DOM, screenshot, page content, HAR, or trace committed.

## Timing

- Started: 2026-06-08 15:32:00 +08:00
- Finished: 2026-06-08 16:59:12 +08:00
- Elapsed: about 1h 27m
- Workload class: L
- 需主会话判断: 是
