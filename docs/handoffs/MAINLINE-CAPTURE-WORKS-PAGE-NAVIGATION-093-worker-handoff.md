# MAINLINE-CAPTURE-WORKS-PAGE-NAVIGATION-093 Worker Handoff

## Task

Close the Douyin/Xiaohongshu login-capture navigation gap from 091: platform windows should open or guide the user toward content-level works/note pages instead of account overview pages, and `/import` should give concrete human next steps when a page still lacks visible content rows.

## Changes

- Kept Douyin's works target on `https://creator.douyin.com/creator-micro/content/manage` and added a reusable `works_page` target contract.
- Changed Xiaohongshu's authenticated browser start URL from the creator root to `https://creator.xiaohongshu.com/new/note-manager`.
- Added `target: "works_page"` support for:
  - `/api/self-media/browser-capture`
  - `/api/self-media/platform-imports/browser-capture/douyin`
  - `/api/self-media/platform-imports/browser-capture/xiaohongshu`
- Existing browser sessions now navigate to the works/note target when an open request asks for `works_page`.
- Auto-refresh opens Douyin/Xiaohongshu with `target: "works_page"` and can retry preview from `waiting_login`, `session_maybe_available`, or `capture_failed` states.
- If a route can infer that the current page is actually logged in and accessible, it marks the local profile as usable. This lets return-to-`/import` preview work even when the user did not separately click "确认已登录".
- `/import` now shows platform-specific guidance:
  - Douyin: enter `作品管理`, confirm a row has title plus play/like/comment metrics.
  - Xiaohongshu: enter `笔记管理`, confirm a row has title plus browse/like/comment/save metrics.
- The default buttons now say `打开抖音作品管理页` and `打开小红书笔记管理页`.
- `needs_content_page` no longer presents as only "切页面"; the visible status is `需要作品/笔记页` and the next action is platform-specific.

## Live Acceptance

Fixed entry and operation pages:

- Entry: `http://localhost:3200/dashboard`
- Operation page: `http://localhost:3200/import`

Live `/import` DOM checks confirmed:

- First screen contains `登录抓取四平台状态`.
- Douyin button text is `打开抖音作品管理页`.
- Xiaohongshu button text is `打开小红书笔记管理页`.
- The page states `系统只做预览，不会静默保存`.
- After live preview, `/import` showed `已抓到 2 个平台的预览，等待你确认保存`.

Live platform preview result:

| Platform | Open target | Actual preview page | Preview | Save |
| --- | --- | --- | --- | --- |
| Douyin | `https://creator.douyin.com/creator-micro/content/manage` | `https://creator.douyin.com/creator-micro/data-center/content` | `1` content row, `1` metric row | Not saved |
| Xiaohongshu | `https://creator.xiaohongshu.com/new/note-manager` | `https://creator.xiaohongshu.com/new/note-manager` | `1` content row, `1` metric row | Not saved |

Both previews returned `logged_in_or_accessible` and `preview_ready`.

The preview rows still used fallback ids from visible text, so saving remains correctly gated by user confirmation.

## No-Save Evidence

Dashboard counts before preview-only checks:

- trusted contents: `12`
- trusted metric snapshots: `12`
- import runs: `243`

Dashboard counts after preview-only checks:

- trusted contents: `12`
- trusted metric snapshots: `12`
- import runs: `243`

No data was saved because no `save` action was called and no user content-metrics confirmation was provided.

## Verification

- `git diff --check` passed.
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 144 tests.
- `npm run test:ui-harness` passed: 19 tests.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed on port 3200.
- Live browser check for `/import` passed.
- Live preview-only checks for Douyin and Xiaohongshu passed.

## Boundaries Preserved

- No WeChat/公众号 work was resumed.
- Video Account remains discovery-only.
- Bilibili browser capture remains unsupported; Bilibili account metrics remain preview-only.
- No password, cookie, token, header, storage state, raw request, raw response, screenshot, HAR, or trace material was saved.
- No local export path was used as the mainline.
- No save occurred without explicit user confirmation.
- No DB files or data files were deleted.
- Existing unrelated dirty worktree files were not staged by this task.

## Residual Risk / Next Step

Both platforms can now reach content-level preview, but the visible-DOM extraction still falls back to text-derived ids for the live rows. The next hardening step should improve stable id extraction from visible links/table metadata before allowing the user to confidently save those preview rows into trusted metrics.
