# MAINLINE-PREVIEW-SAVE-COMMIT-AND-REAL-ACCEPTANCE-096 Worker Handoff

## Task

First review and commit the staged 095 creator-center preview-save hardening, then run a real assisted acceptance from the fixed `http://localhost:3200/dashboard` entrypoint through `/import`: real login capture, preview, explicit user-confirmed save, dashboard visibility, and calendar non-pollution.

## Started / Finished / Elapsed

- Started: 2026-06-08T10:31:55+08:00
- Finished: 2026-06-08T10:39:50+08:00; blocked at explicit user save confirmation
- Elapsed: ~8 minutes to the blocked checkpoint in this continuation; cumulative work spans the 095 commit review, live preview, verification gates, and handoff writing
- Workload class: long-cycle
- `<15min` rule: not applicable.

## Phase 1: 095 Commit

- Reviewed required context:
  - `AGENTS.md`
  - `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - `docs/handoffs/MAINLINE-CREATOR-CENTER-PREVIEW-SAVE-HARDENING-095-worker-handoff.md`
  - `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
  - core project context from `docs/context/`, `ARCHITECTURE.md`, `docs/mainline-framework.md`, `docs/task-board.md`, `docs/architecture/current-stage.md`, `docs/spec-governance.md`, and `docs/agent-playbook.md`.
- Staged scope before commit contained only the 095 hardening files:
  - `docs/handoffs/MAINLINE-CREATOR-CENTER-PREVIEW-SAVE-HARDENING-095-worker-handoff.md`
  - `src/app/api/self-media/browser-capture/route.ts`
  - `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
  - `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
  - `src/domain/self-media/providers/douyin-personal-provider.ts`
  - `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
  - `src/domain/self-media/types/self-media-types.ts`
  - `src/domain/self-media/ui/screens/ImportPage.tsx`
  - `tests/self-media-contract.test.ts`
  - `tests/ui-harness.test.mjs`
- Pre-commit checks:
  - `git diff --cached --check` - pass
  - `git diff --cached --name-status` - 095-only staged scope
  - `git diff --check` - pass
  - staged name check found no `.local/`, `.agents/`, `.codex/`, or `.trellis/` paths
  - sensitive/forbidden text scan hits were defensive blocks, test assertions, or handoff boundary statements, not persisted secrets or auto-save behavior.
- 095 commit hash:
  - `b7aebc9 feat(self-media): harden creator-center preview save`

## 094 Submission Choice

The 094 MediaCrawler adapter audit handoff remained untracked and was not submitted in the 095 commit.

Reason: the task asked to first commit the current staged 095 scope. 094 was not staged at that point, and keeping it uncommitted avoided broadening the commit beyond the already-reviewed staged set. It remains available as `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`.

## Phase 2: Real Acceptance Progress

Fixed entry was used:

- Opened `http://localhost:3200/dashboard`
- Then opened `http://localhost:3200/import`

Save-before baseline from live page and API:

- Dashboard visible totals before save: `12` trusted real contents and `12` content-level metric snapshots.
- API baseline before save: `contents=12`, `metrics=12`, `calendarItems=4`, `imports=243`.

Real preview capture status:

- Douyin preview: captured `1` visible work, `1` save candidate, `1` content metric.
- Xiaohongshu preview: captured `1` visible note/work, `1` save candidate, `1` content metric.
- Both rows were shown by `/import` as `可保存候选` and `本人后台作品页 · 平台 ID 可靠`.

Original candidate summaries shown for user confirmation:

- Douyin: title text begins `投稿作品直播场次投稿分析投稿列表...`; metrics shown as plays `1,057`, likes `2,600`, comments `110`, saves `0`, shares `340`.
- Xiaohongshu: title text begins `全部 6已发布审核中未通过00:24AI机甲大片感...`; metrics shown as views `0`, likes `0`, comments `0`, saves `0`, shares `2,026`.

Follow-up review after user questioned the data:

- User correctly flagged these rows as suspicious.
- Douyin re-preview from `https://creator.douyin.com/creator-micro/content/manage` returned 13 visible rows but `saveCandidateCount=0`; all rows had `nativeIdConfidence=fallback_text_hash`.
- Xiaohongshu re-preview from `https://creator.xiaohongshu.com/new/note-manager` returned 1 visible row with `nativeId=notes-request`, title text containing a whole note-manager block, and `shares=2026`; this was identified as a container/request id plus date/DOM text misparse, not a trustworthy note-level row.
- The 096 code was hardened to reject generic DOM ids such as `notes-request` / `semiTab1` and noisy management-page block titles before a row can become a save candidate or trusted provider row.
- After the hardening, live preview-only checks returned:
  - Douyin: `contentCount=13`, `metricCount=13`, `saveCandidateCount=0`.
  - Xiaohongshu: `contentCount=1`, `metricCount=1`, `saveCandidateCount=0`, warning `fallback_id_from_visible_text`.

DOM boundary repair after explicit user request:

- Added row-boundary filtering inside both browser-capture routes:
  - skip parent containers that contain nested metric candidates;
  - skip aggregate/noisy blocks such as submission overview, note-manager tab summaries, and multi-date/multi-action containers;
  - annotate remaining preview rows with `noisy_visible_dom_title` and `unstable_native_id` warnings when applicable.
- Kept provider-level defense in both personal providers so route mistakes still cannot write generic DOM IDs or noisy titles into trusted metrics.
- Added regression coverage for `semiTab1` and `notes-request` style rows, plus static route checks for `hasNestedMetricCandidate`, `isLikelyContainerBlock`, and `noisy_visible_dom_title`.
- Live 3200 preview-only after the boundary repair returned no rows instead of noisy row candidates:
  - Douyin: HTTP 400 preview response with `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_content_rows`, page `https://creator.douyin.com/creator-micro/content/manage`.
  - Xiaohongshu: HTTP 400 preview response with `contentCount=0`, `metricCount=0`, `saveCandidateCount=0`, warning `no_visible_creator_note_rows`, page `https://creator.xiaohongshu.com/new/note-manager`.

## Save Status

No data has been saved during 096 so far.

Reason: user review found the candidate metrics suspicious, and follow-up preview confirmed the rows were not reliable single-work rows. No save should be performed from the current preview state.

## Dashboard / Calendar Result So Far

- Dashboard counts remain unchanged at `12` trusted contents and `12` trusted metric snapshots after the suspicious preview checks.
- Calendar post-save pollution check has not run because no save occurred.
- Current evidence supports that the suspicious preview rows did not enter trusted dashboard or calendar.

## Verification

- `git diff --check` - pass
- `npm run typecheck` - pass
- `npm run test:self-media` - pass, 145 tests
- `npm run test:ui-harness` - pass, 19 tests
- `NEXT_DIST_DIR=.next-build-096-main npm run build` - pass
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` - pass on port 3200
- After the suspicious-row hardening:
  - `git diff --check` - pass
  - `npm run typecheck` - pass
  - `npm run test:self-media` - pass, 145 tests
  - `npm run test:ui-harness` - pass, 19 tests
  - `NEXT_DIST_DIR=.next-build-096-main npm run build` - pass
- After the DOM boundary repair:
  - `git diff --check` - pass
  - `npm run typecheck` - pass
  - `npm run test:self-media` - pass, 145 tests
  - `npm run test:ui-harness` - pass, 19 tests
  - `NEXT_DIST_DIR=.next-build-096-main npm run build` - pass
  - `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` - pass on port 3200

Notes:

- Next.js build temporarily rewrote `next-env.d.ts` and `tsconfig.json` to point at `.next-build-096-main`; those build side effects were restored to the existing default `.next` references.
- A final `git diff --check` after restoration passed.

## Current Worktree State

Known pre-existing or unrelated dirty files remain uncommitted and unstaged:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

096 adds this handoff file and does not stage it yet.

## Known Issues / Residual Risk

- Real save acceptance is incomplete because the current live preview contains no trustworthy save candidates after review.
- The earlier two captured title strings were broad/noisy because visible platform DOM row text included surrounding table/header text. The Xiaohongshu row also used a generic request/container id and likely parsed a date fragment as `shares=2026`.
- Calendar non-pollution must be verified after a confirmed save, not inferred from pre-save state.

## Next Recommendation

Do not save the current Douyin or Xiaohongshu preview rows.

Next concrete repair point: inspect the actual platform row structure and add platform-specific row selectors/cell mapping for real per-work rows with stable native IDs and title/metric cell boundaries. The current generic DOM scraper now fails closed instead of producing noisy candidates. Only after a clean row appears should the user be asked to confirm saving.

## Orchestrator Decision Required

需主会话判断：是。

Reason: the real acceptance failed at candidate quality. The Orchestrator should decide whether to continue with a DOM extractor repair bundle now or keep 096 as failed/no-save evidence and open a follow-up task. Orchestrator may also decide whether 094 should later be submitted as a separate docs evidence commit.
