# MAINLINE-CAPTURE-FRESHNESS-MODEL-ALIGNMENT-120 Worker Handoff

## Scope
- Goal: align the freshness model so user-confirmed trusted browser/content metric saves count as real refresh evidence, without storing sensitive raw platform material.
- Entry context: 119 saved real Xiaohongshu and Douyin content-level metrics after explicit user confirmation, but freshness still reported the old raw capture timestamp.
- Code changes: yes.
- Commit: yes, included with `fix(self-media): align freshness with confirmed browser captures`.
- Push: pending at final handoff update time; final push result is recorded by the main session after commit.

## Root Cause
- The 118 freshness path used `.local/*/raw` file mtimes as the only real-capture timestamp.
- The 119 flow saved trusted creator-center metric snapshots into the operating DB but did not create or modify raw evidence files.
- As a result, the system had real user-confirmed browser-visible data but still showed the old raw timestamp as the freshness source.

## New Freshness Evidence Model
- The freshness window remains unchanged:
  - within 24 hours: fresh;
  - 24-72 hours: suggested refresh;
  - over 72 hours: needs refresh.
- Real freshness evidence now accepts:
  - raw real-capture evidence from the existing local raw capture directories;
  - trusted content-level metric saves from the operating sqlite DB.
- Trusted save evidence is accepted only when metric snapshots are from trusted creator-center/content import sources and remain in trusted `user_work` scope.
- Safe evidence summary fields are platform/source, captured/saved timestamp, source type, row count, and existing local import run id when available.
- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or real platform DOM is read into reports or saved.

## Platform Freshness After Alignment
- Douyin: fresh; source `trusted_browser_capture`; latest `2026-06-09T14:42:35.213Z`; trusted rows 6.
- Xiaohongshu: fresh; source `trusted_browser_capture`; latest `2026-06-09T14:34:57.489Z`; trusted rows 15.
- Video Account: fresh from existing manual-update trusted content metric evidence; source `trusted_manual_update`; latest `2026-06-09T06:58:57.211Z`; trusted rows 1.
- Bilibili: within 72h from trusted content-level import evidence; source `trusted_content_import`; latest `2026-06-06T17:35:40.901Z`; trusted rows 8. Account metrics remain preview-only.
- `npm run check:real-capture-freshness` now reports pass with no stale or missing platforms on the current operating DB.
- `npm run health:platform-data` still reports warn because older smoke/mapping/raw diagnostic files remain stale. This is separate from trusted real freshness and was not hidden with fake data.

## 119 Handoff
- Included in this task scope: yes.
- `docs/handoffs/MAINLINE-USER-ASSISTED-REAL-CAPTURE-119-worker-handoff.md` was reviewed as safe live capture evidence.
- It contains business summaries, platform IDs, metrics, import run ids, validation results, and no password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace.

## Live 3200 Acceptance
- Fixed entry: `http://localhost:3200/dashboard`.
- Dashboard freshness notice showed: `24 小时内有真实抓取，数据新鲜。 最近更新：06/09 22:42；需要刷新平台 0 个。`
- `/import` freshness cards showed:
  - Douyin: `最近 24 小时内有真实抓取，今天可以先看数据。`
  - Xiaohongshu: `最近 24 小时内有真实抓取，今天可以先看数据。`
  - Video Account: `最近 24 小时内有真实抓取，今天可以先看数据。`
  - Bilibili: `最近真实抓取已超过 24 小时，建议今天补一次数据。`
- `/import` warning summarized only Bilibili as suggested refresh under the 24-72h window.
- No external platform window was opened.
- No content, schedule, metric, or import rows were added or deleted.
- Default visible `/dashboard` and `/import` checks found no `raw`, `API`, `path`, `run id`, `storageState`, `cookie`, `token`, or `header` text.

## Validation
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:ui-harness`: PASS, 19 tests.
- `npm run test:self-media -- --test-name-pattern="platform data health|real capture freshness"`: PASS, 151 tests due shell pattern expansion; includes the new freshness test.
- `npm run test:self-media`: PASS, 151 tests.
- `NEXT_DIST_DIR=.next-build-120-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS on port 3200.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: exit 0, `passed:true`, status `warn`.

## Daily Gate Status
- Daily gate still reports `warn`, but not because trusted real freshness is stale.
- Daily gate freshness summary:
  - `latestRealCaptureAt`: `2026-06-09T14:42:35.213Z`.
  - `realCaptureAgeHours`: about `0.41`.
  - `realCaptureIsStale`: `false`.
  - `realCaptureEvidenceSource`: `trusted_browser_capture`.
  - `latestTrustedBrowserCaptureAt`: `2026-06-09T14:42:35.213Z`.
  - `trustedBrowserCaptureRowCount`: `30`.
- Remaining warning reason: old smoke/mapping/raw diagnostic summaries still have stale timestamps (`health staleCount=14`). This is warning-only and separate from real trusted freshness.

## Business Data
- No content, schedule, metric, or import rows were added or deleted by this task.
- Running health/freshness reports wrote local `.local/*/report.json` and `.local/*/report.md` diagnostic summaries only.

## Sensitive Boundary Check
- No sensitive login or raw platform material was saved, staged, or documented.
- No platform publishing API was called.
- WeChat/Official Account remains paused.
- Video Account remains manual-update-first.
- Bilibili account metrics remain preview-only.

## Remaining Risks
- Platform-data-health can still warn when smoke/mapping/raw diagnostic files are stale, even when trusted real freshness is current. This is intentional but should be explained in UI and handoffs.
- Trusted freshness reads the operating DB in read-only mode. If a future clean profile or alternate `SELF_MEDIA_DB_PATH` is used, freshness follows that profile's DB.

## Timing
- Started: 2026-06-09 22:52 +08:00.
- Finished: 2026-06-09 23:09 +08:00.
- Elapsed: about 17 minutes.
- Workload class: M.
- Extra-depth pass: checked the data flow through `platform-data-health`, `real-capture-freshness`, `platform-ops-with-health`, `trusted-dashboard-audit`, `daily-platform-ops`, Dashboard UI, and Import UI so the new evidence source is not dropped by intermediate reports.
- Need main-session judgment: No.
