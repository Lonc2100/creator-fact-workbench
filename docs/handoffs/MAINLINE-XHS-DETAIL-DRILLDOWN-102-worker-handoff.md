# MAINLINE-XHS-FAIL-CLOSED-COMMIT-AND-DRILLDOWN-102 Worker Handoff

Started: 2026-06-08 17:12:30 +08:00
Finished: 2026-06-08 17:28:01 +08:00
Elapsed: 15m31s
Workload class: medium

## Scope

- First committed the 101 Xiaohongshu fail-closed safety repair.
- Continued Xiaohongshu creator-backend drilldown from the fixed local entry: `http://localhost:3200/dashboard` -> `/import`.
- Did not rework the already successful Douyin path.
- Did not save public Xiaohongshu explore data, aggregate account overview data, raw DOM, screenshots, cookies, tokens, headers, HAR, traces, storageState, raw requests, or raw responses.

## 101 Commit

- Commit hash: `4272463`
- Commit message: `fix(self-media): reject unsafe xiaohongshu detail candidates`
- Precise committed files:
  - `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
  - `src/domain/self-media/providers/creator-center-row-selector.ts`
  - `tests/self-media-contract.test.ts`
  - `docs/handoffs/MAINLINE-XHS-ASSISTED-DETAIL-CAPTURE-101-worker-handoff.md`

Pre-commit checks for 101:

- `git diff --cached --name-status`: only the four requested 101 files.
- `git diff --cached --check`: pass.
- `git diff --check`: pass.
- No `browser.newContext` staged as an implementation fallback.
- No automatic save or automatic `userConfirmedContentMetrics:true`.
- No password/cookie/token/header/storageState/raw/screenshot/HAR/trace persistence.

## 102 Drilldown Change

Uncommitted 102 repair in `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`:

- Added exact visible creator navigation clicking for `数据看板 -> 内容分析`.
- Prevented broad sidebar/container misclicks by requiring exact or compact target text.
- Kept `笔记分析` / `作品数据` / `数据详情` / `查看详情` as safe row/action text, not as unsafe top-level page navigation.
- Moved the mouse into the main content area before wheel scrolling.
- Retried up to 8 bounded main-content scroll attempts looking below aggregate charts.
- Kept the save gate fail-closed: only a stable creator-domain note ID or stable drawer/detail root can become a save candidate.

## Live Xiaohongshu Result

- Opened Xiaohongshu creator note manager successfully:
  - `pageUrl`: `https://creator.xiaohongshu.com/new/note-manager`
  - `loginState`: `unknown` on open, then `user_confirmed` for assisted drilldown.
- Assisted drilldown moved to creator backend content analysis:
  - `pageUrl`: `https://creator.xiaohongshu.com/statistics/data-analysis`
- It did not enter a backend single-note detail page or stable drawer.
- It did not use or save public `xiaohongshu.com/explore/...`; that path remains invalid because it prompts public QR login and is not a creator-backend trusted source.

Last drilldown evidence:

- `open_first_visible_detail`
  - `ok`: false
  - `warnings`: `click_did_not_enter_detail`, `safe_click_targets_16`, `safe_click_action_targets_1`, `analysis_scrolls_8`, `attempted_safe_clicks_1`
- `capture_current_detail_preview`
  - `ok`: false
  - `contentCount`: 0
  - `metricCount`: 0
  - `saveCandidateCount`: 0
  - `warnings`: `no_visible_detail_note_row`, `detail_url_gate_passed`, `detail_url_stable_id_missing`, `same_page_detail_roots_0`, `same_page_stable_id_roots_0`, `detail_title_candidates_11`, `detail_metric_cells_134`, `detail_labeled_metric_blocks_6`

## Save / Dashboard / Calendar

- Xiaohongshu saved: no
- Saved count: 0
- Reason: no stable backend note ID, no stable drawer/detail root, and no single-note metrics context.

Dashboard and calendar numbers:

- Before drilldown:
  - trusted contents: 13
  - metric snapshots: 13
  - metrics: 13
  - calendar items: 195
- After drilldown:
  - trusted contents: 13
  - metric snapshots: 13
  - metrics: 13
  - calendar items: 195

Calendar pollution:

- No. Because no Xiaohongshu row was saved, the default calendar grid stayed unchanged at 195 items.

## Concrete Failure Point

The failure is not login and not public explore anymore. The current blocker is:

- The creator backend `数据看板 -> 内容分析` page exposes aggregate metric regions and many metric cells, but the automation found only one safe action-like click target.
- Clicking that target did not open a URL or drawer containing a stable note ID.
- After 8 bounded main-content scroll attempts below the visible analysis area, no additional safe single-note `数据/分析/详情` row action was discoverable by the current selector.

Next specific repair point:

- Add a sanitized selector probe for the `statistics/data-analysis` lower content area that reports only structural counts and safe labels around row/table/card controls, without storing text content or raw DOM.
- Use that probe to distinguish whether the per-note table is rendered inside a nonstandard virtual scroll container, an iframe, or a hover-only row action outside the current `a/button/[role=button]/[tabindex]` target set.
- Then add a platform-specific row/action selector for that exact backend table or drawer trigger.

## Validation

- `git diff --check`: pass
- `npm run typecheck`: pass
- `npm run test:self-media`: pass, 147 tests
- `npm run test:ui-harness`: pass, 19 tests
- `NEXT_DIST_DIR=.next-build-102-main npm run build`: pass
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`:
  - first run: fail due transient safe weekly API timeout; dashboard API, trusted data, and page were ready
  - retry: pass on port 3200

Build note:

- `next build` temporarily rewrote `next-env.d.ts` and `tsconfig.json` for `.next-build-102-main`; those generated changes were restored and are not part of 102.

## Dirty Worktree Notes

Left unrelated dirty files untouched:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

102 currently has uncommitted implementation and this handoff.

需主会话判断: 是
