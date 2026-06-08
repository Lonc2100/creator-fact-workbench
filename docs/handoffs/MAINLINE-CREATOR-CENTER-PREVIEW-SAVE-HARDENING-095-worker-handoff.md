# MAINLINE-CREATOR-CENTER-PREVIEW-SAVE-HARDENING-095 Worker Handoff

## Task

把 093 已打通的抖音 / 小红书作品页预览推进到“用户确认后可安全保存为可信内容级指标”的闭环：预览行必须说明来源页、ID 可靠性、保存候选状态；保存必须由用户显式确认；低可信 fallback ID、公开页、未知页、账号概览和敏感材料不能进入可信 dashboard。

## Started / Finished / Elapsed

- Started: 2026-06-08T00:20:00+08:00
- Finished: 2026-06-08T01:00:00+08:00
- Elapsed: ~40 minutes
- Workload class: normal
- `<15min` rule: not applicable.

## Completed Work

- Added explicit creator-center preview row classification fields:
  - `sourcePageKind`
  - `confidence`
  - `nativeId`
  - `nativeIdConfidence`
  - `saveCandidateCount`
  - `warnings`
- Hardened Douyin browser capture:
  - extracts native IDs from visible links, `data-*`/id attributes, and visible platform ID text before falling back to a text hash;
  - marks fallback text IDs as `fallback_text_hash`;
  - marks creator-center owned works pages separately from public/unknown pages;
  - only saves rows with creator-center ownership, owned-row confidence, stable/visible native ID, and non-zero content metrics.
- Hardened Xiaohongshu browser capture with the same candidate rules for creator service note/works pages.
- Added provider-level defense in `DouyinPersonalProvider` and `XiaohongshuPersonalProvider`:
  - low-confidence preview rows are skipped even if a route accidentally passes them to import;
  - skipped rows produce warnings and do not create contents or metric snapshots.
- Hardened sensitive input blocking for browser capture routes:
  - rejects `cookie`, `token`, `password`, `header`, `headers`, `authorization`, `raw`, `request`, `response`, `storage`, `storageState`, `screenshot`, `har`, `trace`, `credential`.
- Updated `/import` UI:
  - shows source page confidence and native ID confidence;
  - labels rows as `可保存候选` or `需人工核对`;
  - disables save confirmation and save button unless there is at least one save candidate;
  - explicitly says saved candidates enter the data dashboard and are never auto-saved.
- Preserved boundaries:
  - no automatic save;
  - no `userConfirmedContentMetrics: true` auto-confirm path;
  - no MediaCrawler public `search/detail/creator` rows promoted into trusted dashboard;
  - Bilibili account metrics remain preview-only;
  - Video Account remains discovery-only;
  - WeChat remains paused;
  - published/history imports remain out of the default calendar through the 092 calendar rules.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
- `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
- `src/app/api/self-media/browser-capture/route.ts`
- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-CREATOR-CENTER-PREVIEW-SAVE-HARDENING-095-worker-handoff.md`

## Tests / Verification

- `git diff --check` - pass
- `npm run typecheck` - pass
- `npm run test:self-media` - pass, 145 tests
- `npm run test:ui-harness` - pass, 19 tests
- `NEXT_DIST_DIR=.next-build-095-main npm run build` - pass
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` - pass on port 3200

## Live 3200 Check

Fixed entry was used:

- Opened `http://localhost:3200/dashboard`
- Then opened `http://localhost:3200/import`

Observed on live `/import`:

- `登录抓取四平台状态` is visible.
- Preview/save copy includes `可保存候选`, `保存后进入数据看板`, and `ID 可靠`.
- With no live preview candidate rows currently present, both Douyin and Xiaohongshu save-confirm checkboxes are disabled.
- Both Douyin and Xiaohongshu save buttons are disabled.
- Default visible text did not expose `cookie`, `token`, `storageState`, `HAR`, `trace`, `raw request`, or `raw response`.
- No browser save action was clicked.

## Real Save Status

No real creator-center data was saved during this 095 run.

Reason: live `/import` currently had zero Douyin/Xiaohongshu preview rows in the app state during the read-only browser check, so the save candidate count was `0` for both platforms and the save controls were disabled. This is the desired safe behavior until the user logs in, switches to the works/note page, reads preview rows, and confirms the candidates.

## Dashboard / Calendar Result

- Dashboard was live and trusted data was available before `/import` check: 12 trusted contents and 12 trusted metric snapshots.
- No save occurred, so dashboard trusted counts were not intentionally changed.
- Calendar was not polluted by this task. The provider writes saved creator-center rows as published historical content, and 092 keeps published/history imports out of the default publish calendar.

## Notes On MediaCrawler 094

095 follows the 094 audit result:

- borrowed the concept of explicit field mapping and platform-module separation;
- did not connect MediaCrawler public crawling as a trusted save source;
- kept existing MediaCrawler provider isolated as public signal / non-trusted dashboard data.

The untracked 094 handoff remained uncommitted by this task.

## Known Issues / Residual Risk

- Real platform DOM can change. Runtime candidate rules must continue to be checked against actual Douyin/Xiaohongshu pages.
- Some real rows may still be preview-only if the platform hides native IDs from links/data attributes; that is intentional until the row can show a stable or visible native ID.
- Live save was not performed in this run because no currently loaded preview rows were present. A full save acceptance still needs user login/page switching and a deliberate save click.

## Orchestrator Decision Required

No product-scope decision is required for the code path implemented here.

Main session may decide separately whether to stage/commit 094 and 095 together or keep 094 untracked, because the worktree still contains unrelated pre-existing dirty files outside this task.
