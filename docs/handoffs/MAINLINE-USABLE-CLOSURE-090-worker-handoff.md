# MAINLINE-USABLE-CLOSURE-090 Worker Handoff

## Task

Close the current CreatorFact self-media mainline into a usable local creator workflow on fixed `http://localhost:3200/dashboard`: login capture is understandable and preview-only, default dashboard/calendar/import pages are business-data-clean, and local/acceptance/system diagnostics do not masquerade as user work.

## Scope Completed

- Tightened default `/calendar` and `/content` isolation fold copy from acceptance/test wording to business-facing "隔离数据".
- Kept default `/calendar` on `dataDomain=user_work` operating schedules. Known seed/demo/acceptance titles remain in isolation logic and do not enter the default calendar.
- Removed visible `.local/browser-profiles`, profile, business DB, Git, and test wording from default `/import` browser-session copy.
- Tightened `/import` first-screen layout so the four-platform login status and next-step buttons appear at the top of the first viewport while fallback import and diagnostics remain below/folded.
- Updated UI harness assertions to lock the new business-facing default copy.
- Updated current platform status, task board, and product-spec index with the 090 baseline.

## Live Browser Evidence

Entry point was fixed at `http://localhost:3200/dashboard`, then checked `/dashboard`, `/calendar`, and `/import`.

DOM text scan result:

- `/dashboard`: no backend log/path/API/run/raw/evidence/test wording detected.
- `/calendar`: no backend log/path/API/run/raw/evidence/test wording detected; default schedule shows user-work rows only.
- `/import`: no backend log/path/API/run/raw/evidence/test wording detected; first screen shows four-platform login capture status and next actions.

Screenshot evidence was written locally and intentionally not committed:

- `.local/mainline-usable-closure-090/dashboard-default-clean.png`
- `.local/mainline-usable-closure-090/calendar-default-user-work.png`
- `.local/mainline-usable-closure-090/import-default-login-capture.png`

## Verification

- `git diff --check` passed.
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 143 tests.
- `npm run test:ui-harness` passed: 19 tests.
- `NEXT_DIST_DIR=.next-build-090-main npm run build` passed.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed on port 3200.

## Boundaries Preserved

- No WeChat/公众号 work was resumed.
- Douyin and Xiaohongshu remain persistent-profile browser capture flows; no temporary-session regression was introduced.
- Auto-open and return retry remain preview-only and never call save or set user confirmation.
- Video Account authenticated browser capture remains discovery-only until a stable content-level table is proven.
- Bilibili browser capture remains unsupported; Bilibili archive/work content metrics remain the accepted content-level path, while account metrics stay preview-only.
- No sensitive login material, raw request/response, storage state, screenshot, HAR, trace, cookie, token, password, or headers were saved into business data, docs, tests, or Git.
- No DB files or data files were deleted.

## Residual Risk

- Existing unrelated dirty files remain in the worktree and were not staged by this task: generated template report, smoke/trajectory changes, Leads/UI Lab screen edits, and `scripts/check-browser-automation.mjs`.
- `.local/mainline-usable-closure-090/` contains local screenshot evidence only and should stay untracked.
- The calendar currently has real `user_work` schedules in the operating DB, so the default calendar is not empty; this is expected under the 090 user-owned-work rule.
