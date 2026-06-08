# MAINLINE-ASSISTED-MOUSE-DETAIL-CAPTURE-100 Worker Handoff

## Summary

- 098 detail fallback was already committed before this worker's implementation work.
- 100 added a platform-session mouse-assisted detail action for Douyin and Xiaohongshu: `open_first_visible_detail`.
- The new action uses the existing persistent browser profile/session and `page.mouse.click`; it does not create a temporary login context.
- After explicit user confirmation, 1 Douyin detail preview row was saved to trusted dashboard metrics. Xiaohongshu stayed fail-closed.

## 098 Commit

- Commit hash: `5ad44b7`
- Commit message: `feat(self-media): add creator-center detail capture fallback`

## Implementation

- `src/domain/self-media/types/self-media-types.ts`
  - Added browser capture action `open_first_visible_detail` for Douyin and Xiaohongshu.
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
  - Added safe mouse-assisted detail opening inside the existing persistent session.
  - Allowed stable Douyin detail ID extraction from `work-detail/<id>`.
  - Added sanitized failure diagnostics for detail pages: URL gate, stable ID presence, title candidate count, metric cell count, and labeled metric block count.
  - Did not return DOM, raw text dumps, screenshots, storage state, cookies, headers, or request/response payloads.
- `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
  - Added the same safe mouse-assisted detail opening action.
  - Added same-page drawer/modal detection, but only when the visible drawer/modal exposes a stable note ID.
  - Current live XHS window did not navigate to a stable detail URL and did not expose a stable-ID drawer after the safe click attempt.
- `src/domain/self-media/providers/creator-center-row-selector.ts`
  - Hardened detail selectors against generic detail/nav titles such as platform management/data-center labels.
  - Added adjacent label/value metric parsing for detail pages where labels and numbers are split across nearby cells.
  - Added fail-closed protection for suspicious detail metric alignment such as interaction metrics equal to the view/play count.
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Added UI buttons:
    - `AI 点开首条作品详情`
    - `AI 点开首条笔记详情`
  - Updated guidance so the system can attempt the post-login click instead of stopping at "user opens detail page".
- `tests/self-media-contract.test.ts`
  - Added synthetic selector coverage for `work-detail/<id>`, adjacent label/value metric parsing, generic title rejection, and misaligned metric rejection.
- `tests/ui-harness.test.mjs`
  - Added static UI/route contract coverage for `open_first_visible_detail` and safe click boundaries.

## Live Acceptance

- Fixed entry verified:
  - `http://localhost:3200/dashboard`
  - `http://localhost:3200/import`
- `/import` displayed both assisted detail buttons.
- Douyin:
  - Opened `https://creator.douyin.com/creator-micro/content/manage`.
  - List preview remained fail-closed: no clean list row.
  - First unsafe implementation attempt clicked a safe but wrong non-detail management entry; this was fixed by requiring detail/data/action text or stable detail href, plus row/card fallback.
  - Final mouse-assisted click entered a real Douyin work detail URL with stable `work-detail/<id>`.
  - Detail preview produced `1` save candidate after title/nav filtering and adjacent metric parsing.
  - After the user explicitly confirmed, the candidate was saved.
- Xiaohongshu:
  - Opened `https://creator.xiaohongshu.com/new/note-manager`.
  - List preview remained fail-closed: no clean list row.
  - Mouse-assisted click executed, but the page URL stayed on `/new/note-manager`.
  - The click action now returns fail-closed when the click does not enter a stable detail context: warning `click_did_not_enter_detail`.
  - Sanitized diagnostics after retry: `detail_url_gate_failed`, `detail_url_stable_id_missing`, `same_page_detail_roots_0`, `same_page_stable_id_roots_0`, `detail_title_candidates_12`, `detail_metric_cells_71`, `detail_labeled_metric_blocks_2`.
  - Detail preview stayed fail-closed with `saveCandidateCount=0`.

## Save Result

- 是否真实保存过数据：是。
- 保存平台和条数：Douyin `1` 条；Xiaohongshu `0` 条。
- Douyin saved metrics:
  - views: `2328`
  - likes: `58`
  - comments: `1`
  - saves: `21`
  - shares: `2`
- Import run id: `import-douyin_creator_center-1780904672019`
- Xiaohongshu produced no clean detail row and was not saved.

## Dashboard / Calendar

- Before confirmed save:
  - trusted contents: `12`
  - metric snapshots: `12`
  - metrics: `12`
  - trusted total views: `73719`
  - calendar items: `195`
- After confirmed save:
  - trusted contents: `13`
  - metric snapshots: `13`
  - metrics: `13`
  - trusted total views: `76047`
  - calendar items: `195`
- Saved Douyin candidate:
  - dashboard content rows: `1`
  - metric snapshots: `1`
  - calendar items for candidate: `0`
- Calendar 是否污染：否。The saved historical/posted capture did not enter the default calendar grid.

## Failure / Next Selector Point

- Douyin:
  - Assisted mouse navigation succeeded and detail extraction reached a clean preview candidate.
  - User explicitly confirmed and save succeeded.
- Xiaohongshu:
  - Failure point: click after note-manager did not enter a stable note detail context.
  - Current evidence says there is no visible stable-ID same-page drawer/modal after the safe click (`same_page_stable_id_roots_0`).
  - Specific next fix: identify the actual clickable title/thumbnail/data-cell selector that opens a note detail page or drawer with stable `note_id`/`noteId`/`explore/<id>`. If the platform does not expose a stable note ID in the clicked surface, continue fail-closed.

## Safety Notes

- No password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace was saved.
- No real platform DOM, screenshot, raw page content, raw response, or trace was committed.
- No real publish API was called.
- No publish/delete/submit-review/edit-profile/authorize/activate/pay/upload/private-message action was clicked intentionally; the click filter rejects these labels before mouse action.
- WeChat / Official Account remains paused.
- Video Account remains discovery-only.
- Bilibili account metrics remain preview-only.
- MediaCrawler public search/detail/creator data was not used for trusted dashboard data.

## Validation

- `git diff --check`: pass
- `npm run typecheck`: pass
- `npm run test:self-media`: pass (`147` tests)
- `npm run test:ui-harness`: pass (`19` tests)
- `NEXT_DIST_DIR=.next-build-100-main npm run build`: pass
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: pass, healthy port `3200`
- Re-run completed after XHS same-page detail diagnostics and strict click-result verification.

## Worktree Notes

- Pre-existing unrelated dirty files were not staged or modified intentionally:
  - `docs/generated/template-doctor-report.md`
  - `scripts/smoke-self-media.mjs`
  - `src/domain/self-media/ui/screens/LeadsPage.tsx`
  - `src/domain/self-media/ui/screens/UiLabPage.tsx`
  - `tests/agent-trajectory.test.mjs`
- Existing untracked evidence/helper files remain untracked:
  - `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
  - `scripts/check-browser-automation.mjs`

## Timing

- Started: 2026-06-08 15:05 +08:00
- Finished: 2026-06-08 15:45 +08:00
- Elapsed: about 40 minutes
- Workload class: M
- 需主会话判断：是
