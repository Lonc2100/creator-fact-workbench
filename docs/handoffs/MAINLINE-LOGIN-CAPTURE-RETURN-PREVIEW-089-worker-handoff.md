# MAINLINE-LOGIN-CAPTURE-RETURN-PREVIEW-089

Started: 2026-06-07 21:45:00 +08:00
Finished: 2026-06-07 21:55:00 +08:00
Elapsed: about 10 minutes
Workload class: normal mainline implementation

## Goal

Make the login-capture import path closer to the user's real workflow: the app opens a platform backend, the user logs in or switches to the works page, then returns to `/import` and sees a fresh preview attempt plus a clear next step.

Plain-language note: this reduces the "I logged in, now why did nothing happen?" gap. The page now reacts when the user comes back.

## Completed

- Added `focus_return` as an explicit login-capture auto-refresh trigger.
- `/import` now retries login-capture preview when the user returns to the app window after an attempted/opened Douyin or Xiaohongshu capture still needs login, needs content page, or failed.
- Added a throttle so focus/visibility events do not loop aggressively.
- Added a first "下一步" card in the login-capture auto-refresh panel:
  - preview ready -> jump to the matching platform preview/confirm-save panel.
  - needs content page -> tell the user to switch to works/note management and retry.
  - needs login -> tell the user to finish login/verification in the opened platform window.
  - unsupported -> clearly preserve Video Account/Bilibili boundaries.
- Fixed the Douyin preview anchor so existing "进入抖音读取" / "查看预览并确认保存" links target the actual Douyin capture panel.
- Tightened default dashboard snapshot filtering: calendar items, platform versions, queue rows, and publish records now require `dataDomain=user_work`, so system-log/action-generated drafts stay in content workbench rather than polluting default calendar/dashboard surfaces.
- Fixed an acceptance-marker regex bug where bare `050`-`072` fragments inside generated IDs/timestamps could classify real user ideas as `acceptance_run`.
- Corrected project status references to the actual Obsidian vault path:
  `D:\codex work\codex-session-vault\20_Decisions\2026-06-07 PRD偏离复盘与防偏清单.md`

## PRD Boundaries

- Return retry is still preview-only.
- No route calls `save` from auto-refresh.
- No route sets `userConfirmedContentMetrics: true`.
- No password, cookie, token, header, storage state, raw request, raw response, screenshot, HAR, or trace material is accepted or saved.
- Test/acceptance/system-log records do not enter default dashboard calendar/publish surfaces.
- WeChat remains paused.
- Video Account remains discovery-only for authenticated browser capture.
- Bilibili browser capture remains unsupported and account metrics remain preview-only.

## Verification

- `git diff --check` PASS
- `npm run typecheck` PASS
- `npm run test:ui-harness` PASS, 19 tests
- targeted self-media regression for action-generated/default-calendar/idea conversion PASS
- `npm run test:self-media` PASS, 143 tests
- `NEXT_DIST_DIR=.next-build-089-main npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS

The isolated build temporarily touched `next-env.d.ts` and `tsconfig.json`; both were restored to stable repo state before handoff.
