# MAINLINE-VIDEO-ACCOUNT-LIVE-ASSISTED-SCAN-129 Worker Handoff

## Summary

- Task ID: `MAINLINE-VIDEO-ACCOUNT-LIVE-ASSISTED-SCAN-129`.
- Goal: run the Video Account Assistant assisted page-scan path from `/import`, scan the logged-in current works/data list page, preview candidates, and save only after explicit user confirmation.
- Result: completed after user-assisted login. The controlled Video Account Assistant browser window was opened/reused from the local 3200 flow, the logged-in works list was scanned, 6 can-save Video Account content rows were previewed, the user confirmed saving, and 6 rows were saved to trusted dashboard metrics.
- Commit: pending for the final live completion patch at the time this addendum was written.
- Push: pending for the final live completion patch at the time this addendum was written.
- Need main-session/user action: no for this task. Future scans still require the user to be logged into the controlled Video Account Assistant profile and to confirm before saving.

## Worklog

- Started: 2026-06-11T19:51:18+08:00.
- Finished: 2026-06-11T20:01:15+08:00 for this blocked live pass and hardening patch.
- Elapsed: about 10 minutes.
- Workload class: live assisted acceptance attempt plus narrow scanner/route hardening.

## External Reference Pass

- Per `AGENTS.md`, did a light reference pass against Playwright official guidance for persistent browser contexts and locator-oriented visible page interaction.
- Applied only the existing project pattern: local persistent profile, visible page scan, preview before save, and explicit user confirmation.
- Did not introduce OAuth, daemon capture, platform API changes, new framework, or storage-state export.

## Initial State

- Current branch: `main`.
- Initial HEAD: `5e79cfebddcc4406b4185a5dd3ea65f2ae1accfb` (`feat(self-media): add video account assisted page scan`).
- `git fetch`: completed before work; local `main` matched `origin/main`.
- Pre-existing unrelated dirty files were observed and not staged:
  - `docs/generated/template-doctor-report.md`
  - `scripts/smoke-self-media.mjs`
  - `src/domain/self-media/ui/screens/LeadsPage.tsx`
  - `src/domain/self-media/ui/screens/UiLabPage.tsx`
  - `tests/agent-trajectory.test.mjs`
  - untracked historical handoffs and `scripts/check-browser-automation.mjs`

## Code Changes

- `src/domain/self-media/providers/authed-browser-profile-provider.ts`
  - Added a Video Account `works_page` target: `https://channels.weixin.qq.com/platform/post/list`.
- `src/app/api/self-media/platform-imports/browser-capture/video-account/route.ts`
  - `open` now defaults to `works_page`, matching Douyin/Xiaohongshu capture behavior.
  - Reusing an existing controlled window now navigates from login/platform root to the works target, but does not disturb a user who is already on a deeper data page.
  - Fixed login-state inference order so the route detects login/QR/captcha pages before trusting `userConfirmedLogin`.
  - Fixed profile-confirmation marking so a request body checkbox alone cannot write `lastUserConfirmedLoginAt` while the browser is still on a login page.
  - `needs_login` now fails closed before scanning, even if the request body includes `userConfirmedLogin`.
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Video Account assisted browser open now defaults to `works_page`.
  - User-facing copy now says the dedicated local window opens only after the user clicks, then asks them to finish QR login and stay on a works/data list page.
- `tests/ui-harness.test.mjs`
  - Added static coverage for the Video Account works-page target, route default, login-page-first ordering, and no login-material persistence.

## Live Acceptance Attempt

- Fixed inspection entry was used: `http://localhost:3200/dashboard`, then `/import`.
- Existing local server on port 3200 was reused; no new app server was started.
- The `/import` Video Account card was rendered and the Video Account assistant scan panel can be opened from the first-screen card.
- The controlled Video Account Assistant window was opened/reused through the route.
- Actual controlled page URL observed: `https://channels.weixin.qq.com/login.html`.
- Login state observed: `needs_login`.
- User assistance needed: yes. The user needs to scan/login in the controlled browser window and switch to a Video Account Assistant works/data list page.

## Preview Result

- `capture_preview` was attempted against the controlled browser session.
- Result: failed closed, HTTP 400 semantics through the route result.
- Rows: `0`.
- Content candidates: `0`.
- Metric candidates: `0`.
- Save candidates: `0`.
- Message after hardening: page still looks like a login page; complete QR login and confirm login before scanning.
- No selector/row parsing from a real works/data list page could be validated because the browser never reached that page.

## Save Result

- No save was performed.
- Reason: there was no real preview with can-save candidates, and the user did not explicitly confirm saving any preview rows.
- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM was saved.
- After save/verification, the controlled Video Account Assistant scanning window was closed through the route; the local browser profile remains on disk for future user-assisted login reuse.

## Current Data Check

Observed on `http://127.0.0.1:3200/api/self-media/dashboard` after the failed preview-only attempt:

- Trusted contents: `28`.
- Trusted metric snapshots: `37`.
- Video Account trusted snapshots: `6`.
- Default dashboard calendar items: `12`.
- Calendar API items: `203`.
- Because no save happened, dashboard trusted totals and calendar counts stayed at the known baseline.

## UI Live Check

- `/dashboard`: loaded successfully.
- `/import`: loaded successfully.
- From the `/import` Video Account card, the scan panel opens and shows:
  - `扫描当前视频号助手页面`
  - `先扫描预览，再批量确认保存`
  - safety copy that login material is not accepted or saved.
- Rendered visible default text before advanced diagnostics did not expose `raw`, `API`, `path`, `run id`, `cookie`, `token`, `header`, or `storageState`.
- The Video Account scan still does not auto-open on page load; it opens only after the user clicks.

## Validation

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 155 tests.
- `npm run test:ui-harness`: PASS, 20 tests.
- `NEXT_DIST_DIR=.next-build-129-main npm run build`: PASS when run with PowerShell env syntax as `$env:NEXT_DIST_DIR='.next-build-129-main'; npm run build`.
  - A first attempt used POSIX env syntax in PowerShell and failed before running build; rerun with correct syntax passed.
  - Next.js build side effects to `next-env.d.ts` and `tsconfig.json` were manually restored because they only referenced the temporary build dir.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: not run, because the business save did not happen.

## Next Shortest Path

1. Keep or reopen the controlled Video Account Assistant window from `/import`.
2. User completes QR/login/risk-control in that window.
3. User switches to a works/data list page that visibly contains one row per work with title, publish time, views/play/exposure, likes, comments, shares, and stable link/export ID.
4. Run `capture_preview`.
5. If preview rows include correct can-save candidates, request explicit user confirmation before `save`.
6. After save, rerun dashboard/calendar checks and `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`.

## Commit / Push

- Commit: yes, using narrow staging.
- Push: yes, pushed to `origin main` after validation.

## Continuation Check

- Checked again on 2026-06-11T20:03:58+08:00.
- Current HEAD: `6dda8aaa4219025feea1d1fa6da9077588513838`.
- Controlled Video Account Assistant session still exists, but remains on `https://channels.weixin.qq.com/login.html`.
- Route status remains `needs_login`; preview/save were not attempted beyond status because the login-page blocker is unchanged.
- Dashboard totals remain unchanged: trusted contents `28`, trusted metric snapshots `37`, Video Account snapshots `6`, default calendar items `12`.
- No data was saved and no sensitive login material was persisted.

## Login Continuation Check

- Checked again after the user indicated login on 2026-06-11T20:09:34+08:00.
- Current HEAD before this addendum patch: `94c08016e88294b3966b086eac861b861e0d4113`.
- Controlled Video Account Assistant session reached `https://channels.weixin.qq.com/platform/post/list`.
- `capture_preview` was attempted with user login confirmation.
- Result: still failed closed with `0` rows, `0` content candidates, `0` metric candidates, `0` save candidates.
- Safe page-hint warnings returned by the route:
  - `no_visible_video_account_work_rows`
  - `video_account_no_visible_publish_time`
  - `video_account_no_visible_stable_link_or_export_id`
  - `video_account_no_same_row_metric_publish_time`
- A no-DOM/no-screenshot local diagnostic confirmed the page was no longer a login page and did have Video Account/metric words, but the visible page did not expose publish-time text or stable `weixin.qq.com/sph` / `export/...` identifiers.
- A safe navigation attempt clicked the visible `数据中心` entry, but the page still did not expose a same-row work/data table with publish time plus stable ID/link.
- No save was performed because the preview had no `canSave` candidates and no user save confirmation was requested.
- Dashboard totals stayed unchanged from the baseline: trusted contents `28`, trusted metric snapshots `37`, Video Account snapshots `6`.

## Additional Hardening After Login Check

- Added safe no-DOM page-hint warnings to the Video Account assisted scan route for failed preview cases:
  - visible metric words without reliable work rows;
  - no visible publish time;
  - no visible stable link or export ID;
  - no same-row metric plus publish-time structure.
- Added UI warning labels for these cases so the next user step is clearer.
- Verified:
  - `git diff --check`: PASS.
  - `npm run typecheck`: PASS.
  - `npm run test:self-media`: PASS, 155 tests.
  - `npm run test:ui-harness`: PASS, 20 tests.

## Follow-up Navigation Probe

- Checked again on 2026-06-11T20:11:52+08:00 from current HEAD `851efd0005db477d6ead7f03c6a6612fd6a94961`.
- The existing controlled route session was closed cleanly, then the same local persistent Video Account profile was reopened with Playwright for safe navigation probing.
- No screenshot, platform DOM, raw response, storageState, cookie, token, header, or raw page text was saved.
- Candidate paths probed with count/boolean signals only:
  - `/platform/post/list`
  - `/platform/data`
  - `/platform/data/home`
  - `/platform/data/overview`
  - `/platform/data/content`
  - `/platform/data/post`
  - `/platform/data/post/list`
  - `/platform/data/works`
  - `/platform/analysis`
  - `/platform/analysis/content`
  - `/platform/statistics`
  - `/platform/statistics/content`
- Result:
  - Some candidate paths redirected to `/platform/` and showed general assistant/metric words.
  - Other candidate paths rendered no useful visible row signals.
  - None exposed same-row metric plus publish-time rows.
  - None exposed stable `weixin.qq.com/sph` anchors or `export/...` attributes.
- Conclusion: the current accessible Video Account Assistant pages still do not provide the minimum durable scan contract: title, publish time, same-row views/likes/comments/shares, and stable link/export ID. No save was attempted.

## Share-menu Insight Addendum

- User provided a screenshot showing the real stable ID/link workflow:
  - hover/aim at a specific work row in Video Account Assistant video management;
  - row-right action icons appear only after hover;
  - click the share icon;
  - the menu contains `复制视频ID`, `下载视频二维码`, and `复制视频链接`.
- Root cause clarified: the stable ID/link is not persistently visible in the work row DOM, so a pure visible-row scan cannot collect the required stable ref.
- Implemented a narrow preview-only enrichment path:
  - hover candidate rows before trying row-right action controls;
  - open the share menu when available;
  - only click explicit copy actions: `复制视频ID` and `复制视频链接`;
  - read clipboard text and keep only sanitized `export/...` IDs or `https://weixin.qq.com/sph/...` links;
  - do not click publish/edit/delete/upload/private-message actions;
  - do not save DOM, screenshots, raw responses, cookies, tokens, headers, HAR, trace, or storageState.
- Also added support for unlabeled icon metric rows matching the screenshot order:
  - first number after publish time = views/watch;
  - second number = recommendation, not saved as `saves`;
  - third number = comments;
  - fourth number = shares;
  - fifth number = likes/thumbs-up.
- Validation after this patch:
  - `npm run typecheck`: PASS.
  - `npm run test:self-media`: PASS, 156 tests.
  - `npm run test:ui-harness`: PASS, 20 tests.
- Live retry still returned 0 candidates because the controlled browser page was not in the screenshot-like hovered video-management row state at the time of scan.

## Final Live Completion Addendum

- Final completion checked on: 2026-06-11T21:01:19+08:00.
- Final workload class: live assisted business acceptance plus narrow scanner/parser hardening, save, verification, and handoff.
- Controlled Video Account Assistant page: yes, opened/reused at `https://channels.weixin.qq.com/platform/post/list`.
- User login assistance: yes. The user logged in and then kept the Video Account Assistant video-management page available for scanning.
- User insight used: stable refs can appear only after aiming/hovering a work row and opening the row-right share menu; the page also exposes a sanitized `post_list` response after page refresh.

### Final Code / Scanner Changes

- `src/app/api/self-media/platform-imports/browser-capture/video-account/route.ts`
  - Added frame-aware scanning, because the works list can live inside a child frame.
  - Added a narrow visual-row fallback for Video Account `div`/virtual-list layouts.
  - Added a safe works-list navigation nudge to `内容管理 > 视频` before scanning.
  - Added safe diagnostics for failed/no-save previews: frame count, frames with publish time, same-row metric/publish-time counts, and unlabeled-work-like counts. These diagnostics do not persist DOM or raw payloads.
  - Added a final fallback that listens only to the current page's Video Account Assistant `post_list` response during a user-triggered preview refresh, converts it immediately into sanitized preview rows, and does not save or return raw response bodies.
  - For assisted page-scan rows from this final fallback, mapped metrics according to the live UI/user-confirmed semantics:
    - `readCount` -> views/play.
    - `favCount` -> likes/thumbs-up.
    - `commentCount` -> comments.
    - `forwardCount` / `forwardAggregationCount` -> shares.
    - `likeCount` is recommendation/heart and is not mapped to `saves`.
    - `saves` remains `0`.
- `src/domain/self-media/providers/video-account-personal-provider.ts`
  - Relaxed noisy-container filtering only for a single publish-time row with recognizable metric shape.
  - Combined table/labeled/icon metric parsing so table headers cannot mask icon-row numeric extraction.

### Final Preview Result

- `capture_preview` succeeded on 2026-06-11T20:56:23+08:00.
- Rows: `6`.
- Content candidates: `6`.
- Metric candidates: `6`.
- Save candidates: `6`.
- All rows had stable `export/...` IDs, titles, publish times, views, likes, comments, shares, and no blocking fields.
- Preview safety warnings were expected:
  - `video_account_sanitized_post_list_preview`
  - `video_account_recommendation_not_mapped_to_saves`

Preview candidates:

| Title | Published | Views | Likes | Comments | Saves | Shares | Stable ref |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `原创AI短片《星落之后》...` | 2026-06-08T09:14:44.000Z | 412 | 1 | 0 | 0 | 0 | `export/UzFfBgAAxKWDHHsCWQrMjMzT4DCao9aQjeiyfVb_tNj2HS6rbg` |
| `真以为我到此为止了吗...` | 2026-06-05T11:50:25.000Z | 656 | 6 | 1 | 0 | 1 | `export/UzFfBgAAxLuDUAk9ACnAjMzT4DCarAKQYo8bFstbMDJZ4yjH0g` |
| `以为是末日，没想到是.....` | 2026-06-01T11:46:07.000Z | 308073 | 2166 | 69 | 0 | 719 | `export/UzFfBgAAxMCCUB4-ejrFjMzT4DCakJTvG3K-ewwdef-rPe1fGQ` |
| `《玻璃》｜当年暗恋的人，现在在哪？...` | 2026-05-21T02:36:02.000Z | 1607 | 9 | 0 | 0 | 1 | `export/UzFfBgAAxN2CDA8EUVb3jMzT4DCa1ZydVdtAgHCTRkTXxsqsqA` |
| `用AI体验独居老人的一天，看完想给爸妈打个电话...` | 2026-05-17T09:19:33.000Z | 844 | 10 | 0 | 0 | 0 | `export/UzFfBgAAxN-CQHMOUX3ojMzT4DCaC4mbJKtM9uvJFqKx3dQeJg` |
| `《在那一瞬间我仿佛身上的每一个细胞都受到了生命威胁...` | 2021-02-05T09:59:22.000Z | 507 | 0 | 0 | 0 | 4 | `export/UzFfAgtgekIEAQAAAAAAwQklOKQwJgAAAAstQy6ubaLX4KHWvLEZgBPEyYMQHQFwbrn4zNPgMJoCsZLaGrHJi_yZpUjssuz8` |

### Final Save Result

- User confirmation: after the preview was shown in chat, the user replied `可以保存`.
- Save request used:
  - `action = save`
  - `userConfirmedLogin = true`
  - `userConfirmedContentMetrics = true`
- Save result: HTTP 200 / ok.
- Import run ID: `import-video_account_creator_center-1781182682103`.
- Saved rows: the 6 preview candidates listed above.
- Saved metrics mapping:
  - recommendation/heart did not enter `saves`;
  - thumbs-up entered `likes`;
  - comments/shares followed same-row/platform response fields;
  - `saves` stayed `0`.
- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or platform DOM was saved.

### Final Data / Boundary Checks

Observed from `http://127.0.0.1:3200/api/self-media/dashboard` after save:

- Trusted contents: `34` (previous live baseline was `28`, so +6).
- Trusted metric snapshots: `46`.
- Video Account metric snapshots: `15` total.
- The six new saved rows were visible by content IDs:
  - `video-account-7cd39f75`
  - `video-account-e3fe6513`
  - `video-account-911534ec`
  - `video-account-8f3d9a9e`
  - `video-account-982677fe`
  - `video-account-38513717`
- Default dashboard calendar items remained `12`.
- Default calendar imported/trusted rows remained `0`, confirming imported Video Account metrics did not enter the main publish calendar.

### Final Validation

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 156 tests.
- `npm run test:ui-harness`: PASS, 20 tests.
- `$env:NEXT_DIST_DIR='.next-build-129-main'; npm run build`: PASS.
  - Next.js temporary build side effects to `next-env.d.ts` and `tsconfig.json` were restored.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS with warning status.
  - Command exit code: `0`.
  - Gate report status: `warn`, `passed: true`, `blocked: false`.
  - Warning reason: stale smoke health count under the current 72h threshold.
  - Trusted dashboard audit inside the gate passed with trusted contents `34`, trusted metric snapshots `46`, latest real capture around 2026-06-11T12:58Z, and no mismatches.

### Final Commit / Push

- Final commit/push: pending when this section was written; expected narrow commit message:
  - `feat(self-media): verify video account assisted scan`
