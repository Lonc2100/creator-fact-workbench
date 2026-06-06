# AUTO-CAPTURE-SCHEDULER-PLAN-075 Worker Handoff

## Scope

- Task: implement the first trustworthy auto-capture scheduler framework.
- Entry used for acceptance: `http://localhost:3200/dashboard` -> sidebar `/import`.
- Boundary kept: no real platform API calls, no OAuth implementation, no account/password/cookie/token/header/raw payload storage, no background task registration.
- Predecessor read: `docs/handoffs/PLATFORM-CAPTURE-REALITY-MATRIX-074-worker-handoff.md`.

## Implemented

### Data Model

Added typed scheduler structures in `src/domain/self-media/types/self-media-types.ts`:

- `captureConnectionStatus`
- `captureSchedule`
- `lastSuccessfulCaptureAt`
- `nextScheduledCaptureAt`
- `missedCaptureReason`
- `captureMode: manual | browser_assisted | official_api`
- `TrustedAutoCaptureSchedulerView`
- `PlatformCaptureSchedulerStatus`

Dashboard snapshots now include `trustedAutoCaptureScheduler`.

### Rules

Implemented `buildTrustedAutoCaptureScheduler` in `src/domain/self-media/service/self-media-service.ts`.

Rules covered:

- `official_api` can schedule only when `isAuthorized === true`.
- `browser_assisted` can schedule only when `browserSessionAvailable === true`.
- `manual` never schedules automatic capture and always returns manual-import guidance.
- If `captureScheduleEnabled` is requested without authorization/session, the schedule remains disabled.
- Restart/catch-up is computed from `lastSuccessfulCaptureAt`, platform freshness, and `nextScheduledCaptureAt`.
- Authorized/session-backed platforms can expose `canRunImmediateCapture`; current production dashboard has no connected authorization, so all four platforms remain manual/disabled.

### UI

Updated `/import` first-screen platform matrix:

- Current mode
- Authorization/session state
- Recent capture
- Next capture
- Manual action requirement
- Schedule status
- Missed capture reason
- `自动抓取：未启用` unless the scheduler state is explicitly enabled by a trusted connection.

The live production-like page currently shows all four platforms as manual/no automatic capture because no official API authorization or browser-assisted session is connected.

## Tests

Added state-machine tests in `tests/self-media-contract.test.ts`:

- Unauthenticated/manual platforms cannot schedule.
- Official API authorized mock can schedule hourly and detects restart catch-up.
- Browser-assisted scheduling requires an active browser session.

Updated `tests/ui-harness.test.mjs` to make the new scheduler fields part of the Import page contract.

## Validation

- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS, 134/134
- `npm run test:ui-harness`: PASS, 15/15
- `npm run build`: PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS, healthy port `3200`
- Browser acceptance: PASS
  - Started at `http://localhost:3200/dashboard`
  - Clicked `/import`
  - Verified all four platform cards contain current mode, authorization state, recent capture, next capture, and manual action fields.
  - Verified unauthorized cards do not claim `自动抓取：已启用`.
- `git diff --check`: PASS

Operational note:

- Port `3200` was running this project's older `next start` process after the build. I restarted that local process only, reran the strict health check, then repeated browser acceptance against the current build.

## Security Boundary

- No real platform APIs were called.
- No OAuth flow was implemented.
- No browser credentials, cookies, tokens, headers, raw payloads, or sensitive request details were requested or stored.
- No files or directories were deleted.
- Existing unrelated dirty files were not staged.
