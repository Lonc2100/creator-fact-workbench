# MAINLINE-VIDEO-ACCOUNT-LIVE-ASSISTED-SCAN-129 Worker Handoff

## Summary

- Task ID: `MAINLINE-VIDEO-ACCOUNT-LIVE-ASSISTED-SCAN-129`.
- Goal: run the Video Account Assistant assisted page-scan path from `/import`, scan the logged-in current works/data list page, preview candidates, and save only after explicit user confirmation.
- Result: partially completed. The controlled Video Account Assistant browser window was opened from the local 3200 flow, but the platform stayed on the login page and no user login confirmation was available in this worker turn, so no real works/data list could be scanned and no save was performed.
- Commit: yes, in this commit.
- Push: yes, pushed after validation.
- Need main-session/user action: yes, if the goal is to complete a real preview/save in this same task chain. The user must finish Video Account Assistant login in the opened controlled window and switch to a works/data list page.

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
