# MAINLINE-AUTHED-BROWSER-CAPTURE-CLOSURE-086 orchestrator review

## Runtime

- Started: 2026-06-07 17:55 +08:00
- Finished: 2026-06-07 18:18 +08:00
- Elapsed: about 23 minutes
- Workload class: normal orchestrator review with code correction and full validation

## Scope

Accepted the 086 authenticated-browser-capture mainline as one coherent bundle:

- local persistent browser profiles for Douyin, Xiaohongshu, Video Account, and Bilibili;
- Douyin authenticated browser capture with persistent local profile;
- Xiaohongshu authenticated browser capture MVP;
- `/import` UX hardening around login capture as the default path;
- Video Account content-level discovery script and discovery-only decision.

## Main-Session Decision

The worker handoffs contained a conflict: one task correctly established persistent local profiles, while the import UX hardening handoff said Douyin had been switched back to a temporary `browser.newContext()` session.

That temporary-session direction is rejected as a PRD regression. The current accepted implementation uses `chromium.launchPersistentContext(authedBrowserProfileDir("douyin"), ...)` for Douyin and the same persistent-profile pattern for Xiaohongshu.

Reason: the user-assisted login flow only becomes usable if the user can log in once and the app can reuse the local browser profile. The business database still must not save password, cookie, token, header, storage state, raw request, or raw response material.

## Accepted Current Reality

- Douyin: content-level authenticated browser capture MVP is active.
- Xiaohongshu: content-level authenticated browser capture MVP is active.
- Video Account: content-level authenticated browser capture is not ready; 086 discovery did not prove a stable works table with title, publish time, views/play count, likes, comments, and shares together.
- Bilibili: browser profile state is tracked, but authenticated browser capture is not implemented; existing archives/work metric path remains active and account metrics remain preview-only.
- Local CSV/XLSX export remains fallback-only, not the default import path.
- Current capture is user-triggered; do not claim silent hourly automatic collection yet.

## Files Intended For Commit

- `src/app/api/self-media/browser-capture/route.ts`
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
- `src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts`
- `src/domain/self-media/providers/authed-browser-profile-provider.ts`
- `src/domain/self-media/config/self-media-config.ts`
- `src/domain/self-media/providers/index.ts`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `scripts/video-account-content-level-discovery-086.mjs`
- 086 handoffs and status/index/task-board docs.

## Explicit Exclusions

- `.local/**` browser profiles, screenshots, and discovery evidence.
- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `scripts/check-browser-automation.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- WeChat backend or sync routes.
- Bilibili account-metric durable save path.

## Validation

- `git diff --check` PASS
- `node --check scripts/video-account-content-level-discovery-086.mjs` PASS
- `npm run typecheck` PASS
- `npm run test:self-media` PASS, 142 tests
- `npm run test:ui-harness` PASS, 18 tests
- `NEXT_DIST_DIR=.next-build-086-main npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS

## Residual Risk

- Video Account still needs a future user-assisted run that reaches a real content/work list before any trusted save path can be implemented.
- Bilibili browser capture remains future work; do not confuse the browser profile status card with an implemented capture route.
- Automatic refresh is not complete. The next mainline should turn the user-triggered capture path into an approved startup/interval workflow only after local consent, session checks, and platform-specific guardrails are explicit.
