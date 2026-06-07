# MAINLINE-LOGIN-CAPTURE-REFRESH-CLOSURE-087 orchestrator review

## Runtime

- Started: 2026-06-07 20:18 +08:00
- Finished: 2026-06-07 20:42 +08:00
- Elapsed: about 24 minutes
- Workload class: normal orchestrator review with validation and one test assertion correction

## Scope

Accepted the 087 login-capture refresh mainline:

- `POST /api/self-media/browser-capture/auto-refresh`
- `/import` first-screen login-capture action and auto-refresh panel
- platform reality hardening for Video Account content-level data
- live mouse-walkthrough fixes for content selection and calendar selectors

## Main-Session Decision

087 is accepted as a user-triggered preview loop, not silent collection.

The app may check local profile state and attempt preview for Douyin/Xiaohongshu after the user clicks refresh. It must not call save, silently persist metrics, restore WeChat, or promote Bilibili account metrics.

Video Account remains out of authenticated browser-save scope. The provider now rejects incomplete content-level rows unless title, publish time, views/play count, likes, comments, and shares are all explicitly present.

## Orchestrator Correction

`npm run test:self-media` first failed around a content-workbench publish-record assertion. I briefly tested the wrong interpretation, then restored the assertion after rerun proved dashboard publish records still include the manual confirmation while trusted totals remain unchanged.

The retained 087 test change is the date-drift fix: the publish confirmation timestamp uses the current test run time instead of a fixed future date. Product semantics are unchanged.

## Validation

- `git diff --check` PASS
- `npm run typecheck` PASS
- `npm run test:self-media` PASS, 143 tests
- `npm run test:ui-harness` PASS, 19 tests
- `NEXT_DIST_DIR=.next-build-087-main npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS

## Explicit Exclusions

- `.local/**` browser profiles and screenshot/DOM evidence
- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `scripts/check-browser-automation.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- WeChat backend routes or sync
- Bilibili account-metric durable save

## Residual Risks / 088 Start Point

- Auto-refresh previews only Douyin/Xiaohongshu. Bilibili browser capture and Video Account browser capture remain future work.
- Auto-refresh does not yet scroll/highlight the first actionable platform panel after the check.
- Content creation still needs scheduled-time validation before save.
- Calendar empty-slot creation should support in-place title/topic entry rather than routing the user away immediately.
