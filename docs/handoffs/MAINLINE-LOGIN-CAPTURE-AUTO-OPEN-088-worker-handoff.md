# MAINLINE-LOGIN-CAPTURE-AUTO-OPEN-088

Started: 2026-06-07 21:05:00 +08:00
Finished: 2026-06-07 21:40:00 +08:00
Elapsed: about 35 minutes
Workload class: normal mainline implementation

## Goal

Move the 087 login-capture refresh from "manual click preview" toward a real creator workflow: entering `/import` now starts a local startup check, can auto-open reusable Douyin/Xiaohongshu backend windows, and still keeps every captured row in preview until the user explicitly saves.

Plain-language note: this makes the import page behave closer to "I logged in, please help me check and show what can be captured" instead of making the user hunt for a hidden refresh button.

## Completed

- Added startup auto-refresh on `/import` with a one-time `useRef` guard.
- Added `autoOpen`, `trigger`, `openedWindow`, `autoOpenEnabled`, and `openedWindowCount` to the login-capture auto-refresh contract.
- Allowed auto-open only through existing Douyin/Xiaohongshu capture routes; Video Account remains discovery-only and Bilibili browser capture remains unsupported.
- When a reusable or retryable profile needs a window, the route opens the platform backend once and retries `capture_preview`.
- Result UI now shows whether the result came from startup check or manual refresh, how many windows were opened, and that save still requires user confirmation.
- Wrote PRD drift prevention note to Obsidian:
  `D:\Obsidian\Repository\LifeOS Pro\1. 项目\自媒体\PRD偏离复盘与防偏清单.md`
- Updated current platform status, product-spec index, task board, and UI harness regression tests.

## PRD Boundaries

- No silent save: the auto-refresh route does not call `save`.
- No automatic confirmation: it does not set `userConfirmedContentMetrics: true`.
- No sensitive material persisted or accepted: password, cookie, token, header, storage state, raw request, raw response, screenshot, HAR, and trace are blocked.
- Douyin and Xiaohongshu must stay on persistent browser profiles; do not regress to temporary browser contexts.
- WeChat remains paused.
- Bilibili account metrics remain preview-only.
- Video Account authenticated browser capture remains discovery-only until stable content-level works rows are proven.

## Verification

- `git diff --check` PASS
- `npm run typecheck` PASS
- `npm run test:self-media` PASS, 143 tests
- `npm run test:ui-harness` PASS, 19 tests
- `NEXT_DIST_DIR=.next-build-088-main npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS

The isolated build temporarily touched `next-env.d.ts` and `tsconfig.json`; both were restored to stable repo state before handoff.

## Residual / 089

- `/import` can auto-open and preview, but true unattended hourly collection is still not implemented and should not be claimed.
- Future improvement should add a user-approved local scheduler/startup catch-up model only if it preserves preview-first confirmation and sensitive-material boundaries.
- Calendar empty-slot creation, scheduled-time validation, and broader ease-of-use cleanup remain 089 scope unless explicitly reprioritized.
