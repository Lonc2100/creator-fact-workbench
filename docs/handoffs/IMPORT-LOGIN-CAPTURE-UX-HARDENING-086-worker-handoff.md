# IMPORT-LOGIN-CAPTURE-UX-HARDENING-086 worker handoff

## Scope

- Hardened `/import` default path into a product-facing login capture flow.
- First viewport now shows only:
  - page title/copy,
  - `登录抓取四平台状态`,
  - Douyin / Xiaohongshu / Video Account / Bilibili status cards,
  - one `下一步` button.
- Local export remains a collapsed fallback.
- Browser profile/session management is no longer in the default page body; it is inside advanced diagnostics.
- Default visible UI no longer exposes `.local`, backend routes, `raw`, `capture`, cookie/token/header/storage wording, run ids, or command/path diagnostics.

## Implementation

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Simplified `ImportFirstViewportGuide` to status cards plus next button.
  - Changed main login flow anchors/test ids from `*-capture-*` to `*-login-*` where visible/default.
  - Moved `AuthedBrowserProfileManager` into `import-advanced-diagnostics`.
  - Replaced technical browser/profile wording with temporary-window and user-action wording.
  - Added human failure copy: `还没有连接好。请打开平台后台，登录后切到作品管理页，再点下一步。`
  - Normalized Douyin browser error messages into user-facing prompts such as `请切到作品管理页再抓。`
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
  - Worker pass temporarily switched Douyin logged-in browser helper to `browser.newContext()`.
  - Main-session review rejected that as a PRD regression: the accepted route uses `launchPersistentContext(...)` with a local browser profile so user-assisted login can be reused.
  - Closing the helper closes the browser window; login material is not written to business data, docs, tests, or git.
- `src/app/globals.css`
  - Added first-viewport sizing and status card styles.
  - Added `login-safety-box` styling without default DOM `capture` class names.
- `tests/ui-harness.test.mjs`
  - Locked first-screen contract.
  - Locked local export as folded fallback.
  - Locked profile/session manager behind advanced diagnostics.
  - Kept route contract blocking credential/raw material.

## Browser Acceptance

Evidence directory: `.local/import-login-capture-ux-hardening-086/`

- Screenshot: `.local/import-login-capture-ux-hardening-086/import-first-screen.png`
- Screenshot: `.local/import-login-capture-ux-hardening-086/import-after-next.png`
- DOM evidence: `.local/import-login-capture-ux-hardening-086/browser-acceptance.json`

Real browser path:

1. Opened `http://127.0.0.1:3200/dashboard`.
2. Clicked navigation into `/import`.
3. Verified first viewport only contains `登录抓取四平台状态` plus four platform cards and `下一步`.
4. Used mouse coordinates to click `下一步`.
5. Clicked `检查登录抓取状态`.
6. Verified human failure copy appears.
7. Verified local export fallback remains collapsed.
8. Verified default visible text does not include `raw`, `capture`, `.local`, cookie/token/header/storage wording, backend routes, commands, or run ids.

## Verification

- `npm run typecheck` PASS
- `npm run test:self-media` PASS, 142 tests
- `npm run test:ui-harness` PASS, 18 tests
- `npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS
- `git diff --check` PASS

## Notes / Residual Risk

- `.local/**` screenshots and logs are local evidence only and must not be committed.
- Existing unrelated dirty files remain in the working tree, including generated docs, smoke/trajectory files, Leads/UI Lab changes, and browser-capture/profile files from adjacent 085/086 work. They were not deleted.
- Video Account content-level logged-in capture remains discovery-only; this task only hardens the `/import` UX and default visibility contract.
