# PLATFORM-CAPTURE-ADAPTER-REALITY-087 worker handoff

## Task

- Task ID: `PLATFORM-CAPTURE-ADAPTER-REALITY-087`
- Goal: assess and harden four-platform logged-in content-level capture reality for Douyin, Xiaohongshu, Bilibili, and Video Account.
- Core rule: do not present account summaries, backend logs, smoke/test rows, or unstable discovery output as the user's real works data.

## Reference Review

| Reference | Applicability | Timeliness | Authority | Popularity | Decision impact |
| --- | --- | --- | --- | --- | --- |
| Playwright official `launchPersistentContext` docs: https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context | High | Current official docs | High | High | Keep Douyin and Xiaohongshu on persistent local profiles; do not regress to temporary `browser.newContext()` for logged-in capture. |
| Douyin Open Platform: https://open.douyin.com/ | Medium | Current official platform | High | High | Official API is the clean future path when authorization/app scope is available; current MVP remains user-driven creator-backend visible-row capture. |
| Xiaohongshu creator platform: https://creator.xiaohongshu.com/ | Medium | Current official product surface | High | High | Browser capture must stay on the creator host and require user navigation to creator note/work rows; no public recommendation/search pages enter save. |
| WeChat Channels / Video Account Assistant: https://channels.weixin.qq.com/ | Low for API, medium for manual discovery | Current official product surface | High | High | Official surface exists, but 086 did not prove a stable content-level works table with all required fields; keep Video Account browser-save out of MVP. |
| Bilibili creator/open surfaces: https://member.bilibili.com/platform/home and https://open.bilibili.com/doc | Medium | Current official surfaces | High | High | Prefer content-level archives/works; keep account-level durable totals out of content metrics. |
| Postiz OSS snapshot: `docs/references/vendor/postiz/_meta.json`, repo https://github.com/gitroomhq/postiz-app | Medium | Local snapshot fetched 2026-06-01 | Medium | High | Mature social scheduling systems expose API/SDK boundaries and analytics surfaces; they do not justify saving raw login material or account summaries as content rows. |
| Mixpost OSS snapshot: `docs/references/vendor/mixpost/_meta.json`, repo https://github.com/inovector/mixpost | Medium | Local snapshot fetched 2026-06-01 | Medium | High | Reinforces API-integration and per-platform metric limits: analytics are only as reliable as data shared by each platform. |
| MediaCrawler-style open-source crawlers | Low for product default, medium for discovery | Active ecosystem but platform-fragile | Low/medium | High in scraper niche | Useful for endpoint/field discovery only. Not used as default product capture because this project requires user-owned, local, preview-before-save data with no sensitive login material. |

## Platform Matrix

| Platform | Current state | Default save eligibility | User action required | Official API path | Must not save | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| Douyin | 已可抓: authenticated browser capture MVP is active. | Visible creator content rows only, after preview and explicit save confirmation. Route uses `chromium.launchPersistentContext(authedBrowserProfileDir("douyin"), ...)`. | User logs in once with local profile and switches to works/data page. | 需官方 API for lower-risk production connector when app authorization is available. | Cookies, tokens, headers, storage state, raw response/request, account overview summaries. | DOM labels can change; user may stay on wrong page; platform risk checks can block capture. |
| Xiaohongshu | 已可抓: authenticated browser capture MVP is active. | Visible `creator.xiaohongshu.com` creator note/work rows only, after preview and explicit save confirmation. Route uses `chromium.launchPersistentContext(authedBrowserProfileDir("xiaohongshu"), ...)`. | User logs in with local profile and switches to creator note/data page. | 需官方 API if Xiaohongshu grants a stable creator-data interface. | Public recommendations/search pages, account-only summaries, login material, raw captures. | Creator page structure can change; wrong-page/public-page confusion remains the main product risk. |
| Bilibili | 已可抓 for content-level archives/import path; browser capture route not implemented. | Public/published archive/work rows only. Account overview metrics remain preview-only diagnostics and are not durable content totals. | For current path, use accepted archive/local capture/import flow; future browser MVP should target稿件/作品 rows, not账号总览. | 需官方 API or stable creator-center archive endpoint for a safer MVP. | Account durable totals, survey/date-key diagnostics, hidden/private/review/down/offline archives. | Public-state semantics can drift; account metrics are tempting but must remain outside content totals. |
| Video Account | 暂不可做 as authenticated browser-save MVP. 086 discovery did not prove stable works table coverage. | Only sanitized `post_list` rows with explicit title, publish time, views, likes, comments, and shares can produce durable content metrics. Missing any core field now skips the row. | User must manually reach a real works/per-video table and rerun discovery proving required-field coverage before browser save is enabled. | 需官方 API or platform export if available; otherwise stay discovery/local export only. | Account/daily totals, statistic frames, private messages, comment bodies, interaction-only rows, rows missing title/time/views/likes/comments/shares. | Highest risk of false positives; overview/statistic pages can look useful but are not content-level works data. |

## Code Changes

- Tightened `src/domain/self-media/providers/video-account-personal-provider.ts`.
  - `post_list` rows now require explicit title, publish time, views, likes, comments, and shares before creating a `ContentItem` or `PlatformMetric`.
  - Removed generated fallback titles for durable Video Account works.
  - Interaction and bullet-chat rows can only merge into already accepted content post ids; they cannot create works by themselves.
  - Interaction rows no longer overwrite the content-list title.
  - Added warnings for incomplete content-level rows.
- Updated `tests/self-media-contract.test.ts`.
  - Existing Video Account mapping test now keeps the content-list title as the trusted title.
  - Added regression coverage for missing title, missing publish time, missing shares, and interaction-only rows; all must stay out of durable works/metrics.

## Explicit Boundaries

- No DB files were deleted or migrated.
- No `.local/**` evidence or browser profile material was read into docs or staged.
- No WeChat Official Account/backend work was resumed.
- Douyin and Xiaohongshu remain persistent-profile browser capture; no temporary context regression was introduced.
- Bilibili account metrics remain preview-only; no account snapshot or account total save path was added.
- Video Account browser capture remains discovery-only until a future run proves a stable content-level works table.

## Validation

Commands run:

- `node --check scripts/douyin-personal-discovery.mjs`: PASS
- `node --check scripts/xiaohongshu-personal-discovery.mjs`: PASS
- `node --check scripts/video-account-personal-discovery.mjs`: PASS
- `node --check scripts/video-account-content-level-discovery-086.mjs`: PASS
- `node --check scripts/bilibili-personal-discovery.mjs`: PASS
- `npm run test:self-media`: PASS, 143 tests
- `npm run test:ui-harness`: PASS, 19 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS

Validation notes:

- The first `npm run test:self-media` rerun showed that an existing Video Account status fixture no longer met the new strict content-level requirement. The fixture was updated with `commentCount` and `forwardCount` so it represents a complete durable work row.
- Two date-drift test fixtures also surfaced on 2026-06-07:
  - one calendar assertion used a fixed past schedule, `2026-06-06T09:00:00.000Z`;
  - one publish-record assertion used a future manual publish timestamp, `2026-06-08T10:00:00.000Z`.
- Both were fixed in `tests/self-media-contract.test.ts` without changing product filtering logic.

## Dirty Worktree Note

Pre-existing dirty files are still present and were not reverted:

- `docs/generated/template-doctor-report.md`
- `docs/handoffs/MAINLINE-LOGIN-CAPTURE-AUTO-REFRESH-087-worker-handoff.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `tests/ui-harness.test.mjs`
- `scripts/check-browser-automation.mjs`
- `src/app/api/self-media/browser-capture/auto-refresh/`

Files changed for 087 are limited to this handoff, the Video Account provider, and self-media contract tests. The date-drift fixes are in the same self-media contract test file because they blocked the required validation on the current 2026-06-07 environment.

## Residual Risks

- Video Account cannot be treated as browser-capture MVP until the user reaches a stable works/data table and the discovery report proves all required fields together.
- Douyin/Xiaohongshu DOM capture remains page-structure-sensitive; official APIs are the production-grade path if platform authorization becomes available.
- Bilibili browser capture is not implemented yet; current content-level Bilibili import stays on the archives/work path.
