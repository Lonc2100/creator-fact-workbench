# AUTHED-BROWSER-PERSISTENT-PROFILE-086 Worker Handoff

## Summary

Implemented a four-platform local browser profile/session layer and connected the Douyin browser-capture MVP to a persistent Playwright profile.

The active model is now:

- Douyin: `.local/browser-profiles/douyin`
- Xiaohongshu: `.local/browser-profiles/xiaohongshu`
- Video Account: `.local/browser-profiles/video_account`
- Bilibili: `.local/browser-profiles/bilibili`

The UI exposes states for `未打开`, `等待登录`, `已登录可能可用`, `会话过期`, and `抓取失败`.

Important dirty-worktree note: while this pass was running, the same files also contained local Xiaohongshu browser-capture MVP changes. The current working tree may show Xiaohongshu as capture-enabled because those dirty changes are interleaved in `ImportPage.tsx`, `self-media-types.ts`, tests, and an untracked Xiaohongshu route. This handoff is for the 086 common persistent-profile layer and Douyin persistent-profile wiring; do not commit unrelated Xiaohongshu/browser-discovery changes unless the main session explicitly accepts them.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - Added shared authed-browser profile config/status/action types.
- `src/domain/self-media/config/self-media-config.ts`
  - Added four-platform `authedBrowserProfileConfigs`.
- `src/domain/self-media/providers/authed-browser-profile-provider.ts`
  - Added local-only profile manager.
  - Writes only safe session metadata under `.local/browser-profiles/<platform>/session-meta.json`.
  - Does not export storage state and does not write cookie/token/header/password material to business DB, docs, tests, or Git.
- `src/domain/self-media/providers/index.ts`
  - Exported the new provider.
- `src/app/api/self-media/browser-capture/route.ts`
  - Added local-only status/open/confirm-login API for browser profiles.
  - Rejects sensitive input keys.
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
  - Switched Douyin from a temporary browser context to `chromium.launchPersistentContext(authedBrowserProfileDir("douyin"), ...)`.
  - Close now closes the window while preserving the local profile.
  - Records safe open/confirm/failure metadata.
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Added a four-platform "本机登录会话" status panel on `/import`.
  - Keeps local export folded as fallback.
  - Updates Douyin browser-flow copy to persistent local profile semantics.
- `tests/self-media-contract.test.ts`
  - Added contract coverage for four profile directories, WeChat pause, Bilibili preview-only boundary, and Douyin-only capture MVP.
- `tests/ui-harness.test.mjs`
  - Added UI/API/provider harness coverage for profile states and persistent Douyin context.

## Safety Boundaries

- Profiles only live under `.local/browser-profiles/*`; `.local/` is already gitignored.
- No cookie/token/header/password/storage state is accepted from UI or API request bodies.
- No storage state export is used.
- Safe session metadata stores timestamps and sanitized failure text only.
- WeChat remains paused.
- Bilibili account metrics remain preview-only.
- No real publish API is called.

## Verification

- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS
- `npm run test:ui-harness`: PASS
- `npm run build`: initial default `.next` build compiled, then failed during page-data collection with stale `/_document` cache state; rerun with `NEXT_DIST_DIR=.next-build-086` PASS. The temporary `tsconfig.json` include added by Next was removed.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS after warming/restarting the local 3200 operator dev server.
- `git diff --check`: PASS

Live review:

- `http://localhost:3200/dashboard`: PASS, page returned 200 and dashboard shell loaded.
- `http://localhost:3200/import`: PASS, browser profile manager rendered with four platform profile rows, five state labels, and `.local/browser-profiles/*` paths.
- `GET /api/self-media/browser-capture`: PASS, returned four profile statuses.

## Notes

The worktree contains unrelated dirty files from other local tasks. Do not use `git add .`; stage only the 086 files or a scoped patch.

No commit was created in this pass. Reason: a precise commit could not be formed safely without also staging unrelated/interleaved dirty changes, especially Xiaohongshu browser-capture MVP changes in the same UI/types/test files.
