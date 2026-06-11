# MAINLINE-VIDEO-ACCOUNT-ASSISTED-PAGE-SCAN-128 Worker Handoff

## Summary

- Task ID: `MAINLINE-VIDEO-ACCOUNT-ASSISTED-PAGE-SCAN-128`.
- Goal: add Video Account Assistant assisted page scanning so a creator can scan the current assistant page, preview candidates, then explicitly batch-confirm saves.
- Result: implemented conservative scan -> preview -> explicit batch save path for Video Account, plus tests and live fail-closed check.
- Commit: yes, in this commit.
- Push: yes, pushed to `origin HEAD` after validation.
- Need main-session judgment: no for the implemented preview-first scanner; yes only before future default auto-save or selector-stability auto-save mode.

## External Reference Pass

- Checked mature social scheduling/management patterns from Postiz and Mixpost at a high level.
- Borrowed only the product pattern: connect/account context, preview result, explicit confirmation before durable action.
- Did not add a new framework, daemon, OAuth layer, or platform publish API.

## Implemented Work

- Added Video Account DOM/page scan selection in `src/domain/self-media/providers/video-account-personal-provider.ts`:
  - `selectVideoAccountAssistantPageRows` reads visible row candidates, same-row/table-header cells, stable links/export IDs, title, publish time, and metrics.
  - Stable IDs accept long `export/...` IDs or full `https://weixin.qq.com/sph/...` links.
  - Short/truncated/generic IDs are blocked as save candidates.
  - `推荐` is detected as a warning but is not mapped to `saves`; only explicit `收藏` maps to `saves`.
- Added `VideoAccountBrowserVisibleRow` and `VideoAccountAuthedBrowserCaptureResult` types.
- Added `SelfMediaService.parseVideoAccountBrowserVisibleRows` and `importVideoAccountBrowserVisibleRows`.
- Added local route `src/app/api/self-media/platform-imports/browser-capture/video-account/route.ts`:
  - actions: `open`, `status`, `capture_preview`, `save`, `close`.
  - `capture_preview` does not auto-open a window; if no controlled assistant page exists, it fails closed with a creator-facing prompt.
  - `save` requires `userConfirmedContentMetrics` and only saves rows with `canSave=true`.
- Updated `/import`:
  - Video Account card now points to assistant page scanning as the primary path.
  - Video Account detail includes `扫描当前视频号助手页面`, preview table, blocked reasons/missing fields, and `批量确认保存`.
  - CSV/XLSX/manual paste remains as a fallback panel.
  - Default page does not expose raw/API/path/run id/cookie/token/header/storageState wording.
- Added contract/UI tests for scanning, blocked rows, recommendation-vs-saves boundary, and visible UI entry.

## Scanner Reliability Notes

- Scanner reads current visible DOM rows in a controlled local browser session, not background platform APIs.
- Reliable inputs:
  - current page under `channels.weixin.qq.com` after user login;
  - row-like DOM such as `tr`, `[role=row]`, card/list items;
  - same-row cells or nearest table/grid headers;
  - full `weixin.qq.com/sph/...` links or long `export/...` IDs;
  - labels/header text for 播放/曝光/浏览, 点赞, 评论, 分享/转发, optional 收藏.
- Unreliable/blocked inputs:
  - nav/overview/account/fan/private-message containers;
  - rows missing publish time, stable ID/link, views, likes, comments, or shares;
  - short/truncated IDs or text-hash fallback IDs;
  - recommendation-only rows where `推荐` appears but `收藏` does not.

## Preview / Save Result

- Live preview from a real Video Account Assistant page: not performed because no controlled Video Account Assistant browser session was open in this worker.
- Live fail-closed scan check: performed.
  - Request: `capture_preview` with user login confirmation, but no assistant session.
  - Result: HTTP 400, `contentCount=0`, `metricCount=0`.
  - Message: asks user to open/login Video Account Assistant; confirms scan action does not auto-open a window.
- Save result: no save performed in live check.
- New business data: none added by this worker.
- Deleted business data: none.

## User Assistance Needed

- To do real live capture, the user needs to open the Video Account Assistant scanning window or keep the controlled session available, complete login/QR/risk-control if prompted, and switch to a works/data list page.
- If the page cannot show title, publish time, stable link/export ID, and same-row metrics, the scanner will preview blocked candidates or fail closed instead of saving.

## Recommendation / Likes / Saves Boundary

- `点赞` maps to `likes`.
- `收藏` maps to `saves` only when explicitly present.
- `推荐` is not mapped to `saves`; scanner adds `video_account_recommendation_not_mapped_to_saves` and saves remain `0` unless a real 收藏 field exists.
- `分享` / `转发` / `朋友圈转发` map to `shares`.

## Dashboard / Freshness / Calendar

Observed after live fail-closed check:

- Trusted contents: `28`.
- Trusted metric snapshots: `37`.
- Video Account trusted snapshots: `6`.
- Video Account latest source: `video_account_creator_center`.
- Video Account freshness: `fresh`, latest real capture `2026-06-11T09:39:37.508Z`, age about `0.94h` at check time.
- Dashboard default calendar items: `12`.
- Calendar API item count: `203`.
- No preview save was confirmed, so this worker did not add dashboard/freshness/calendar records.

## Sensitive Material Boundary Check

- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM was saved to business data, docs, tests, or Git.
- Route rejects sensitive input keys.
- UI default live check found no visible `raw`, `API`, `path`, `run id`, `cookie`, `token`, `header`, or `storageState` wording on `/import`.

## Validation

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 155 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- `NEXT_DIST_DIR=.next-build-128-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS, 3200 healthy and page-ready.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: command PASS / exit 0, report status `warn`, `passed=true`, steps `platform_ops_with_health` and `trusted_dashboard_audit` passed.
- Live 3200 read-only check:
  - `http://localhost:3200/dashboard`: loaded.
  - `/import`: loaded.
  - Video Account scan entry present.
  - Default did not auto-open Video Account.
  - Scan without open assistant page failed closed and did not save.

## Changed Files Committed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/providers/video-account-personal-provider.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/app/api/self-media/platform-imports/browser-capture/video-account/route.ts`
- `src/domain/self-media/ui/patterns/ImportPlatformOverview.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-VIDEO-ACCOUNT-ASSISTED-PAGE-SCAN-128-worker-handoff.md`

Do not stage unrelated dirty files listed by the delegation.

## Known Issues / Next Step

- This proves scanner logic and fail-closed UI/route behavior, but not a successful real Video Account Assistant DOM scan. That requires the user to open/login the assistant page and switch to the correct works/data list page.
- Future optional auto-save can be designed only after selector stability is proven across real pages, and must be behind an explicit switch with dedupe and non-destructive exclusion controls. It is not implemented here.
- The route currently uses a controlled local browser session; a web app cannot inspect an arbitrary already-open normal browser tab unless that tab is opened through a controlled/debuggable session.

## Worklog

- Started: 2026-06-11T18:03:00+08:00.
- Finished: 2026-06-11T18:38:31+08:00.
- Elapsed: about 35 minutes.
- Workload class: long-cycle implementation + verification.
- Extra-depth pass: not required because elapsed exceeded 15 minutes; nevertheless performed adjacent selector/test review, live fail-closed check, and build side-effect cleanup.
- Need main-session judgment: no for scanner/preview/batch-confirm path; yes for any future default auto-save or selector-stability automation.
