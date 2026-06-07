# MAINLINE-LOGIN-CAPTURE-AUTO-REFRESH-087 Worker Handoff

Started: 2026-06-07 18:20 +08:00
Finished: 2026-06-07 20:12 +08:00
Elapsed: 1h 52m
Workload class: L

## Scope

Implemented the PRD-first `/import` login-capture refresh path: local export is no longer treated as the default route, and the primary flow now says that after login the user can click one refresh button to let the system inspect platform profile state and attempt safe preview where the platform has an authenticated browser capture MVP.

Required docs were read before implementation:

- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/product-specs/authenticated-browser-capture-085.md`
- `docs/handoffs/MAINLINE-AUTHED-BROWSER-CAPTURE-CLOSURE-086-orchestrator-review.md`
- AGENTS instructions supplied in the task prompt were followed; no workspace `AGENTS.md` file was present in this project tree during this pass.

PRD precedence applied: 085/086 authenticated browser capture is the mainline; older handoffs were treated as evidence only.

## Implemented

- Added `POST /api/self-media/browser-capture/auto-refresh`.
- The route is local-only and user-triggered preview-only.
- The route rejects request payloads containing sensitive login/capture material key names: password, cookie, token, header, storage, raw request, raw response, screenshot, HAR, trace, and related variants.
- The route reads local browser profile status and attempts `capture_preview` only for capture-enabled profiles that look reusable.
- Douyin and Xiaohongshu are wired into auto-refresh preview.
- If a capture route reports that the platform browser window is not open, auto-refresh opens that platform backend once, then retries preview.
- Video Account remains discovery-only for content-level browser capture.
- Bilibili remains profile-status/unsupported for authenticated browser capture; Bilibili archive/work content metrics remain the usable path and account metrics remain preview-only.
- Auto-refresh never calls the save action and never sets metric confirmation on behalf of the user.
- Added `/import` primary panel:
  - `一键刷新登录抓取`
  - startup/restart status summary
  - one refresh button
  - per-platform result cards with status, next action, content count, and metric count
  - explicit copy that the system will not silently save
- Added typed result contracts for the auto-refresh flow.
- Added UI harness coverage proving the login-capture auto-refresh panel is present, wired to the new route, preview-only, and does not contain forbidden storage/cookie/header/screenshot/HAR/trace behavior.

## User Experience

On `/import`, the main route is now:

1. The user opens/logs into platform backends through the existing controlled local browser profile flow.
2. The startup summary shows whether reusable sessions appear available, whether login is needed, or whether prior capture failed.
3. The user clicks `刷新登录抓取数据`.
4. For Douyin/Xiaohongshu, the system attempts a visible-page preview if the session may be usable.
5. If preview succeeds, rows populate the existing platform preview areas and still require user confirmation before save.
6. If preview fails, the UI tells the user whether to log in or switch to the creator content/works management page.

Local CSV/XLSX export remains available only as fallback/collapsed support, not the default product path.

## Safety Boundaries

- No WeChat restoration.
- No real publish API call.
- No background or silent auto-capture claim.
- No password/cookie/token/header/storage state/raw request/raw response/screenshot/HAR/trace persisted into business DB, docs, tests, or Git.
- Persistent browser profiles remain local under `.local/browser-profiles/<platform>/`.
- Save remains explicitly user-confirmed after preview.
- Bilibili account metrics stay preview-only.

## Files Changed By This Pass

- `src/app/api/self-media/browser-capture/auto-refresh/route.ts`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/ui-harness.test.mjs`

## Verification

Passed:

- `git diff --check`
- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- Live HTTP checks:
  - `http://localhost:3200/dashboard` -> 200
  - `http://localhost:3200/import` -> 200

Health result:

- 3200 healthy
- API ready
- trusted data ready
- page ready
- no stale or old route ports reported

## Commit Status

No commit was created in this pass. The worktree contains pre-existing/interleaved dirty files from prior subtasks, including files outside this 087 scope, so this handoff avoids broad staging and does not use `git add .`.

Current 087-scoped implementation is ready for a precise commit only after the main thread decides how to separate it from the surrounding dirty worktree.
