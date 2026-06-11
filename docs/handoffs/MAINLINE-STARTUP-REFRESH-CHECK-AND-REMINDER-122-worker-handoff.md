# MAINLINE-STARTUP-REFRESH-CHECK-AND-REMINDER-122 Worker Handoff

- Started: 2026-06-11T11:25:00+08:00
- Finished: 2026-06-11T11:58:00+08:00
- Elapsed: about 33m
- Workload class: normal
- Need main-session judgment: no
- Submitted: yes
- Push: yes

## Scope

Improve the daily startup/opening refresh guidance without changing capture/save logic and without dashboard visual redesign.

External reference pass:

- Buffer treats expired channel access as normal and tells users to refresh/reconnect the channel.
- Mixpost/Postiz-style tools informed the user-facing flow shape: connected account status, user action, and clear analytics/import next steps.
- No new framework or platform connector was introduced.

## Startup / Page Entry Check Behavior

- `/dashboard` now shows a compact startup freshness notice near the top of the data-first page.
- The notice is read-only and based on existing `platformDataHealth.platforms`.
- The notice says local service startup plus first visit to Dashboard or Import checks freshness.
- It explicitly says the system does not open platform windows and does not silently save.
- `/import` keeps page-load behavior read-only:
  - it refreshes local browser profile status only;
  - it does not call startup/focus auto-open;
  - it does not save preview rows.

## Today Refresh Checklist Logic

The Import first screen now has a `今日建议刷新` checklist.

Rules:

- `< 24h`: data fresh; today can look at data first.
- `24-72h`: suggested refresh.
- `> 72h` or missing latest real capture: needs refresh.
- Evidence still comes from the existing safe freshness model:
  - trusted browser capture;
  - trusted manual update;
  - trusted content import;
  - existing raw real-capture evidence if present.
- No fake freshness rows were created.

## Four Platform Next Steps

Live 3200 state at acceptance time:

- Douyin: suggested refresh, latest `2026-06-09T14:42:35.213Z`, about 37h old. Next step: open Douyin update, log into creator center, return to Import and recheck/preview.
- Xiaohongshu: suggested refresh, latest `2026-06-09T14:34:57.489Z`, about 37h old. Next step: open Xiaohongshu update and switch to content analysis table.
- Video Account: suggested refresh, latest `2026-06-09T06:58:57.211Z`, about 45h old. Next step: prepare content-level data and manually paste/upload, preview before save.
- Bilibili: needs refresh, latest `2026-06-06T17:35:40.901Z`, about 106h old. Next step: import current manuscript-level table; account metrics remain preview-only.

## Business Data

- Added content: no.
- Deleted content: no.
- Added schedule: no.
- Added metric/import rows: no.
- Live trusted dashboard counts after acceptance:
  - trusted contents: 22.
  - trusted metric snapshots: 30.
  - default dashboard calendar items: 12.

## Live 3200 Acceptance

- Fixed entry used: `http://localhost:3200/dashboard`.
- Dashboard first screen showed:
  - `开场只读检查`;
  - `新鲜 0 个，建议刷新 3 个，需要刷新 1 个`;
  - local-service-first-visit check wording;
  - no platform-window/silent-save warning.
- Entered `/import`.
- Import first screen showed `今日建议刷新`.
- Four platforms showed concrete next steps.
- Default Import page did not open external platform windows.
- Browser tab list contained only the local `/import` tab during the check.
- Visible default text check found none of:
  - `raw`;
  - `API`;
  - `path`;
  - `run id` / `runId`;
  - `cookie`;
  - `token`;
  - `header`;
  - `storageState`.

## Verification

- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 152 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- `NEXT_DIST_DIR=.next-build-122-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: exit 0, passed true, status warn.

Daily gate warning:

- `health staleCount=14`; stale is warning-only under the current 72h threshold.
- `health realCaptureStaleCount=1`; next real collection should refresh old raw capture evidence.
- `blockingReasons`: none.
- Trusted real freshness remained within 72h:
  - latest real capture: `2026-06-09T14:42:35.213Z`;
  - real capture age: about 37.11h;
  - realCaptureIsStale: false;
  - evidence source: `trusted_browser_capture`;
  - trusted browser capture rows: 30.

Build/gate side effect:

- Next.js temporarily rewrote `next-env.d.ts` and `tsconfig.json` to isolated `.next-build-*` / `.next-platform-*` type paths.
- Both files were restored before staging.

## Sensitive Boundary Check

- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace, or real platform DOM was saved.
- No platform publishing API was called.
- No external platform window was opened by default.
- No preview was automatically saved.
- WeChat/Official Account remains paused.
- Video Account remains manual-update-first.
- Bilibili account metrics remain preview-only.

## Changed Files

- `src/domain/self-media/ui/patterns/ImportPlatformOverview.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-STARTUP-REFRESH-CHECK-AND-REMINDER-122-worker-handoff.md`

## Remaining Risks

- Daily gate still warns about old health/smoke/raw diagnostic evidence. This is truthful and non-blocking, but users may still see `warn` in internal reports.
- The startup guidance depends on the local service being started; it does not promise background platform scraping after reboot.
- Bilibili remains stale until the user imports a current content-level table.
