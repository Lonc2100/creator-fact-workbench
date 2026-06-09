# MAINLINE-DASHBOARD-RECENCY-AND-VIDEO-ACCOUNT-REALITY-107 Worker Handoff

## Summary

- Dashboard now defaults to recent-first content-level metrics with published-work windows for `近 7 天` and `近 30 天`.
- Dashboard ranking/native tables show publish time, latest capture/save time, platform, exposure/views, and engagement, and collapse repeated snapshots to the latest snapshot per work.
- Video Account default reality is now manual update: paste/upload a content-level table, preview, explicitly confirm, then save to `video_account_creator_center`.
- Video Account startup/focus/auto-refresh does not open a platform window. Login capture/API remains a later exploration path because QR/scanning and individual-creator API capability are not assumed.

## Dashboard 7/30-Day Scope

- `近 7 天`: works whose `publishedAt` falls inside the last 7 calendar days relative to the dashboard snapshot generation time.
- `近 30 天`: works whose `publishedAt` falls inside the last 30 calendar days.
- Current implementation is a published-work window, not an incremental-growth window.
- When multiple snapshots exist for the same work, the dashboard shows the latest snapshot only.
- Trend buckets are sorted by date key before rendering, so chart x-axis ordering no longer depends on insertion order.

## Video Account Manual Update

- Status: available.
- UI entry: `/import` local export/manual update fold, panel `视频号手动更新`.
- Required fields in the supported CSV/XLSX path: stable video ID, title, publish time, views/play, likes, comments, saves, shares/forwards; optional native metrics such as `朋友圈转发`, completion rate, average play time, official-account conversion, traffic source.
- Save source: `video_account_creator_center`.
- Safety: no password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace accepted or saved.

## Live Acceptance

- Fixed entry: `http://localhost:3200/dashboard`.
- Dashboard before Video Account trusted save: `20` trusted contents / `21` trusted metric snapshots.
- Dashboard after trusted Video Account save: `21` trusted contents / `22` trusted metric snapshots.
- Saved Video Account trusted data: yes, `1` manual-update test row.
  - Trusted row title: `视频号手动更新日常样例`.
  - Metrics: views/play `432`, likes `18`, comments `4`, saves `7`, shares `6`, followersDelta `2`.
- Additional isolated probe: one earlier row containing `107/验收` was intentionally not counted as trusted by the existing acceptance/test isolation rules. It increased excluded diagnostics only and is not the accepted trusted save evidence.
- Calendar pollution: no default main-grid pollution. The default calendar card list did not include `视频号手动更新日常样例`; the only visible calendar card remained the existing scheduled `AI创作者一天的真实工作流`.
- `/import` startup check: did not show any auto-open result and displayed copy that it will not automatically open Douyin/Xiaohongshu/Video Account windows.

## Validation

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS.
- `npm run test:ui-harness`: PASS.
- `$env:NEXT_DIST_DIR='.next-build-107-main'; npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS on production server started from `.next-build-107-main`.

## Notes And Risks

- PowerShell does not support `NEXT_DIST_DIR=.next-build-107-main npm run build`; use `$env:NEXT_DIST_DIR='.next-build-107-main'; npm run build`.
- A stale dev `.next` cache produced a transient `/dashboard` 500 during live setup; production `next start` from `.next-build-107-main` passed strict health and live acceptance.
- Video Account manual update still depends on the operator providing a stable video ID. Rows without stable ID should remain preview-only or blocked.
- The import save message reports internal imported record count, so `2 条记录` means content plus metric record for one work, not two Video Account works.

## Remaining Boundaries

- Douyin: login detail/data-page capture has saved real content and remains user-confirmed only.
- Xiaohongshu: creator content-analysis table capture has saved real content and remains user-confirmed only.
- Video Account: manual update is the default; login capture/API is future exploration only.
- Bilibili: content-level archive/import remains usable; account metrics remain preview-only.
- WeChat/Official Account: paused.

## Timing

- Started: 2026-06-09 14:18 +08:00.
- Finished: 2026-06-09 15:00 +08:00.
- Elapsed: 42 minutes.
- Workload class: L.
- 需主会话判断: 否.
