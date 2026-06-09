# MAINLINE-CONTENT-COMPOSER-LIBRARY-SPLIT-110 Worker Handoff

## Summary
- Goal: split `/content` into a default creator-first composer mode and an explicit content library mode.
- Result: implemented a page-local `创作` / `内容库` mode switch without changing repo/provider/service logic.
- Commit status: prepared for exact commit with message `refactor(self-media): split content composer and library`.

## Component Split
- Added `src/domain/self-media/ui/patterns/ContentComposerLibraryPanels.tsx`.
- New exported UI pieces:
  - `ContentModeSwitch`
  - `ContentComposerPanel`
  - `ContentLibraryPanel`
- `ContentPage.tsx` now owns a small `ContentPageMode` state.
- Existing `?contentId=` / `?versionId=` entry points open directly in `内容库` mode so existing deep links still land near the selected content.

## Composer Mode
Default `/content` first screen now keeps only the creation loop:
- Page title: `内容工作台`.
- Creator-facing summary: create first, manage versions and publishing in the library.
- Mode switch with `创作` selected.
- New content idea input and AI discussion through `CreatorVideoPanel`.
- Four-platform draft generation and save.
- Optional future publish time entry.
- Human confirmation boundary remains visible.

Composer first screen no longer shows:
- content table filters,
- content detail/editor,
- dashboard inclusion / trusted-scope curation,
- manual publish assistant,
- acceptance isolation pool,
- operation message diagnostics.

## Library Mode
`内容库` mode keeps the management surface:
- current task panel,
- workbench summary,
- content list filters with recent-priority operating defaults,
- `ContentTable`,
- `ContentDetail`,
- `PlatformVersionEditor`,
- manual publish assistant,
- trusted-scope / dashboard inclusion curation,
- local acceptance isolation pool.

## Manual Publish Assistant
- Moved out of the default composer first screen.
- Kept inside `内容库`, after selected content detail/version editing context.
- Still manual-only; no real publish API call was introduced.

## Preserved Business Abilities
- Idea -> AI discussion -> four-platform title/body/tags -> save remains intact.
- Saved creator draft switches the user into `内容库` with the saved content selected.
- Future schedule entry remains available in the composer flow.
- Existing content library management remains available after switching modes.
- No import capture, dashboard metric, calendar persistence, provider, or repository logic changed.
- WeChat remains paused.
- Bilibili account metrics remain preview-only.

## 3200 Live Acceptance
- Fixed entry used: `http://localhost:3200/dashboard`, then `/content`.
- Default `/content` state:
  - `content-composer-mode`: visible.
  - `content-library-mode`: hidden.
  - idea entry visible.
  - AI discussion action visible.
  - four-platform save action visible.
  - future publish time entry visible.
  - content table / filters hidden.
  - manual publish assistant hidden.
  - trusted-scope curation hidden.
  - no `run id`, `raw`, `evidence`, `/api`, `.local`, `storageState`, `password`, `cookie`, `token`, or `header` text found in the default page text.
- After clicking `内容库`:
  - `content-library-mode`: visible.
  - composer mode hidden.
  - content filters/list/detail/version editor visible.
  - manual publish assistant visible.
  - trusted-scope curation visible.
  - no external platform tab opened; browser stayed on the same local `/content` tab.

## Verification
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 150 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- PowerShell equivalent of `NEXT_DIST_DIR=.next-build-110-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS on port 3200.

## Remaining Risks
- This is a low-risk UI consolidation; it does not yet split `/content` into separate routes.
- CSS is reused from the existing workbench patterns; future polish can tighten spacing after more visual review.
- The manual publish assistant is still a dense library-mode module and may deserve a later selected-content drawer/panel split.

## Timing
- Started: 2026-06-09 17:19:00 +08:00
- Finished: 2026-06-09 17:33:00 +08:00
- Elapsed: about 14 minutes
- Workload class: M

## Main Session Decision Needed
- 需主会话判断：否
