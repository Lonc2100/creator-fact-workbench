# MAINLINE-VIDEO-ACCOUNT-AND-BILIBILI-IMPORT-PATH-121 Worker Handoff

- Started: 2026-06-11T10:10:00+08:00
- Finished: 2026-06-11T11:24:00+08:00
- Elapsed: about 1h14m
- Workload class: normal
- Need main-session judgment: no
- Submitted: yes
- Primary commit: `daa13b5` (`feat(self-media): improve video account and bilibili import paths`)
- Push: yes, pushed to `origin/main` (`github.com:Lonc2100/creator-fact-workbench.git`)

## Scope

Improve the remaining practical data paths for Video Account and Bilibili without dashboard visual redesign, without pretending Video Account has stable automated capture, and without changing the Douyin/Xiaohongshu browser capture mainline.

External reference pass:

- Bilibili Open Platform exposes user-data style APIs only behind declared scope/authorization, so account-level metrics remain preview-only unless a future authorized connector is explicitly added.
- Mixpost/Postiz-style social tools informed the flow shape: connect/import data, preview analytics, confirm before durable workflow changes.
- No sufficiently stable public official Video Account personal creator data API was adopted for this task; the product keeps manual update as the default reality.

## Changes

- `src/domain/self-media/ui/patterns/ImportPlatformOverview.tsx`
  - Video Account first-screen card now says manual updates become the safe refresh evidence after explicit save.
  - Bilibili first-screen card now says content-level imports refresh Bilibili data state, while account metrics stay preview-only.

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Removed prefilled Video Account/Bilibili sample CSV from the visible manual-update textareas.
  - Added creator-facing placeholders that show expected headers without putting savable fake rows into the form.
  - Added Video Account field guide: title, publish time, play/exposure, likes, comments, saves, shares, stable video ID/link when available.
  - Added Bilibili field guide: manuscript ID/BV, title, publish time, views, likes, comments, danmaku, saves, shares, coins.
  - Reworded preview success messages away from internal source ids.
  - Reworded preview row labels from English/internal fields to creator-facing Chinese labels.
  - Normalized draft-realistic field warnings into a business label.

- `tests/self-media-contract.test.ts`
  - Added coverage proving Video Account manual confirmed metrics count as `trusted_manual_update` freshness evidence.
  - Added coverage proving Bilibili content-level confirmed imports count as `trusted_content_import` freshness evidence.
  - Sensitive-material assertions remain in place.

- `tests/ui-harness.test.mjs`
  - Locked the simplified Video Account and Bilibili import panels.
  - Locked empty-by-default manual textareas, creator-facing field guides, no old sample CSV constants, and no `Native metrics` / raw-field visible labels.

## Video Account Practical Path

- Current default: manual update.
- User action: copy/export owned content-level data from Video Account assistant, paste/upload CSV/XLSX, click preview, review rows, explicitly check confirmation, then save.
- Required fields: work title, publish time, play/view or exposure if available, likes, comments, saves, shares; stable video ID or work link should be included when available.
- Save behavior: explicit user confirmation only; saved content-level rows enter trusted dashboard metrics and update freshness as `trusted_manual_update`.
- Not promised: no default automatic login capture; no default external window; no official/API assumption for individual creators.

## Bilibili Practical Path

- Current default: content-level import from Bilibili creator center/export/copied table.
- User action: paste/upload manuscript-level CSV/XLSX, preview, review rows, explicitly check confirmation, then save.
- Required fields: manuscript ID or BV, title, publish time, views, likes, comments, danmaku, saves, shares, coins if available.
- Save behavior: explicit user confirmation only; saved manuscript-level rows enter trusted dashboard metrics and update freshness as `trusted_content_import`.
- Boundary: Bilibili account overview metrics remain preview-only and do not enter durable totals.

## Preview / Save Result

- Live Video Account preview: generated 1 preview row using a temporary browser-only CSV value; not saved.
- Live Bilibili preview: generated 1 preview row using a temporary browser-only CSV value; not saved.
- Saved rows this task: 0.
- No user confirmation to save was requested or performed.
- No business data was added or deleted.

## Dashboard / Freshness / Calendar

Live read-only check after preview-only flows:

- Trusted contents: 22.
- Trusted metric snapshots: 30.
- Default dashboard calendar items: 12.
- Calendar pollution: no new saved import rows entered the default future publish calendar.

Freshness states observed from `/api/self-media/dashboard`:

- Douyin: fresh, evidence `trusted_browser_capture`, latest `2026-06-09T14:42:35.213Z`, rows 6.
- Xiaohongshu: fresh, evidence `trusted_browser_capture`, latest `2026-06-09T14:34:57.489Z`, rows 15.
- Video Account: fresh, evidence `trusted_manual_update`, latest `2026-06-09T06:58:57.211Z`, rows 1.
- Bilibili: stale, evidence `trusted_content_import`, latest `2026-06-06T17:35:40.901Z`, rows 8. This is truthful stale status by the 72h rule; no fake import was created to suppress it.

## Live 3200 Acceptance

- Fixed entry used: `http://localhost:3200/dashboard`.
- Navigated to `/import` on the same 3200 app.
- `/import` default first screen remained four platform update cards.
- No external platform window opened automatically.
- Video Account panel:
  - empty textarea by default;
  - field guide visible after opening;
  - preview generated a row;
  - save button remained disabled without confirmation;
  - no visible sensitive-material terms after preview.
- Bilibili panel:
  - empty textarea by default;
  - content-level import guide visible after opening;
  - account metrics boundary still says preview-only;
  - preview generated a row;
  - save button remained disabled without confirmation;
  - no visible sensitive-material terms after preview.

## Verification

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 152 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- `NEXT_DIST_DIR=.next-build-121-main npm run build`: PASS after using PowerShell syntax `$env:NEXT_DIST_DIR='.next-build-121-main'; npm run build`.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: initial fail because 3200 was not listening; started local dev server; second attempt briefly timed out while `/dashboard` compiled; final PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS with status `warn`.

Daily gate warning details:

- `health staleCount=14`; stale is warning-only under the current 72h threshold.
- `health realCaptureStaleCount=1`; next real collection should refresh old raw capture evidence.
- Trusted dashboard audit passed with no mismatches.

Build/gate side effects:

- Next.js temporarily rewrote `next-env.d.ts` and `tsconfig.json` to `.next-build-*` / `.next-platform-operations-e2e-*` paths during build/smoke. These were restored before commit.

## Sensitive Materials Boundary

- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, or trace was saved.
- Live browser preview used only local textarea values and preview endpoints.
- No external platform login or platform backend window was opened in this task.

## Remaining Risks

- Video Account still depends on user-provided manual table quality; if no stable video ID/link is copied, rows must remain fail-closed or require confirmation.
- Bilibili content-level import is clear, but current operating freshness is stale until the user imports a current Bilibili content-level table.
- Daily gate still warns on old smoke/raw freshness evidence; warning is non-blocking and truthful.

## Remaining Dirty Files

Unrelated dirty/untracked files were left untouched and must not be staged by this task:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
- `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`
