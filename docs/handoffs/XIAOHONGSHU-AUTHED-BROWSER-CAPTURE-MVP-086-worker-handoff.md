# XIAOHONGSHU-AUTHED-BROWSER-CAPTURE-MVP-086

## Scope

Implemented the Xiaohongshu authenticated browser capture MVP using the same product shape as the Douyin login capture flow:

- User opens Xiaohongshu Creator Service Platform and manually completes login/risk checks.
- The app reads only visible DOM rows from `creator.xiaohongshu.com`.
- The user previews rows and must explicitly confirm they are own creator-center note/work content-level metrics.
- Confirmed rows save as trusted `xiaohongshu_creator_center` content metrics.
- Public recommendation/search/topic/non-owned/private-interaction content is excluded from the capture contract.

No real Xiaohongshu API call or real platform login was performed in this worker run.

## Official / Authority References

- Xiaohongshu Creator Service Platform entry: https://creator.xiaohongshu.com/
- Prior architecture handoff used for local authenticated browser boundaries: `docs/handoffs/AUTHED-BROWSER-CAPTURE-ARCHITECTURE-085-architect-handoff.md`

## Implemented

- Added Xiaohongshu browser capture types:
  - `XiaohongshuAuthedBrowserCaptureRequest`
  - `XiaohongshuAuthedBrowserCaptureResult`
  - `XiaohongshuBrowserVisibleRow`
- Added API route:
  - `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
- Route behavior:
  - local runtime only
  - persistent local profile via `.local/browser-profiles/xiaohongshu`
  - visible DOM extraction only
  - creator host guard for `creator.xiaohongshu.com`
  - wrong-page/public-page rejection
  - explicit save confirmation required
- Added provider/service save path:
  - `XiaohongshuPersonalProvider.fromBrowserVisibleRows`
  - `SelfMediaService.parseXiaohongshuBrowserVisibleRows`
  - `SelfMediaService.importXiaohongshuBrowserVisibleRows`
- Updated Import page:
  - Xiaohongshu login capture panel
  - open/status/read/save/close controls
  - login confirmation checkbox
  - content metrics confirmation checkbox
  - empty and populated preview table
  - local export remains folded fallback
- Enabled Xiaohongshu as a browser capture MVP platform in local profile config.

## Safety Boundaries

- Does not store account, password, browser request details, raw requests, raw responses, or platform secrets in business DB/docs/tests/Git.
- Does not call real Xiaohongshu APIs.
- Does not scrape public recommendation/search/topic pages into metrics.
- Does not save non-owned content or private interaction content.
- Dashboard trust path only receives rows after user preview and explicit confirmation.

## Validation

Passed:

- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- `git diff --check`

Browser verification:

- Opened current built app on temporary `http://127.0.0.1:3210/import`.
- Confirmed visible Xiaohongshu login capture panel, open/read/save controls, and empty preview anchor.
- Confirmed copy says Xiaohongshu uses a dedicated local browser profile and only saves confirmed content-level trusted metrics.
- Temporary 3210 server was stopped after verification.

Notes:

- One earlier `test:self-media` run hit a Windows temp-directory cleanup `EPERM`; immediate rerun passed 142/142.
- One earlier `build` run hit a transient `.next` route artifact miss; immediate rerun passed.
- A parallel `typecheck` during `build` saw `.next/types` race errors; sequential rerun passed.

## Worktree Note

This run did not stage or commit. The worktree already contains neighboring 086 changes and unrelated dirty files; stage precisely if committing.
