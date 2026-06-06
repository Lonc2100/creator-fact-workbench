# DATA-CAPTURE-SCHEDULE-RELIABILITY-060 Worker Handoff

## Runtime

- Started: 2026-06-06
- Finished: 2026-06-06T11:41:14+08:00
- Workload class: focused reliability slice

## Context Read

- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAINLINE-DAILY-OPS-RELIABILITY-052-worker-handoff.md`
- `docs/handoffs/MAINLINE-PUBLISH-TO-METRICS-CLOSED-LOOP-059-worker-handoff.md`
- `scripts/daily-self-media-ops.mjs`
- `scripts/daily-platform-ops-gate.mjs`
- Existing UI/service/test surfaces for `/import`, `/dashboard`, platform health, daily gate, and daily self-media ops.

## External Reference Check

Per `AGENTS.md`, I checked mature scheduling patterns before implementing:

- Microsoft Task Scheduler / `schtasks` supports daily and startup triggers, but registering them is a system-side effect.
- Scheduled jobs can be delayed or missed, so the user-facing contract should expose last successful run, stale status, and failure state instead of implying magic background certainty.
- No third-party scheduler code was copied.

## Automation Audit Conclusion

Current repo state does **not** contain real hourly, background, or startup automatic data capture.

- `ops:daily-self-media`, `gate:daily-platform-ops`, `health:platform-data`, and `check:real-capture-freshness` are manual one-shot/reporting flows.
- `scripts/daily-self-media-ops.mjs` explicitly reports no collection, no browser opening, no platform login opening, no server start, no process kill, and no database deletion.
- `scripts/daily-platform-ops-gate.mjs` is a gate over existing health/audit evidence; it does not collect platform data.
- Existing `/import` "定时抓取设定" was a status/runbook note, not a daemon.
- No Windows Task Scheduler registration was found or created.

## Implemented

- Added `DashboardSnapshot.dataCaptureScheduleReliability`.
- Added `buildDataCaptureScheduleReliability(...)` in the self-media service.
- Default strategy is now explicit:
  - Mode: `manual_only`
  - Suggested frequency: every 24 hours
  - Stale threshold: platform health report value, falling back to 72 hours
  - Startup catch-up required when data is missing, stale, or the recent gate/ops state failed
  - Failure state is visible without leaking internal command/raw details
- `/import` now shows:
  - current mode
  - latest real capture
  - next suggested capture
  - recommended frequency
  - startup catch-up requirement
  - stale/failure status
  - clear boundary that there is no background daemon/hourly job/startup auto-capture
- `/dashboard` daily checklist now includes "抓取节奏" and links to `/import`.
- Tests lock the manual-only boundary, startup stale catch-up, no Task Scheduler registration, no sensitive login material, WeChat pause, and Bilibili account preview-only boundary.

## Windows Task Scheduler Drafts Only

Not registered automatically. If the user later confirms system-task creation, a human-reviewed draft could look like this:

```powershell
$repo = "D:\codex work\自媒体创作\Data Collection and Background Analysis"

# Daily reminder/gate draft only. Review before running.
schtasks /Create /TN "SelfMediaDailyOpsGate" /SC DAILY /ST 09:30 /TR "powershell -NoProfile -ExecutionPolicy Bypass -Command ""Set-Location -LiteralPath '$repo'; npm run ops:daily-self-media -- --preflight-health"""

# Startup catch-up prompt/gate draft only. Review before running.
schtasks /Create /TN "SelfMediaStartupCaptureCheck" /SC ONSTART /DELAY 0005:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -Command ""Set-Location -LiteralPath '$repo'; npm run ops:daily-self-media -- --preflight-health"""
```

These drafts only run the local reliability gate. They still do not store cookies, tokens, or sensitive login materials, and do not perform silent platform login.

## Boundaries Preserved

- Four active data platforms remain: 抖音 / 小红书 / 视频号 / B站.
- 公众号 remains paused and was not restored.
- B站账号指标 remain preview-only and are not saved into durable dashboard/review totals.
- No sensitive login material is stored.
- Diagnostics remain folded/hidden by default.

## Verification

PASS:

- `npm run typecheck`
- `npm run test:self-media`
  - 127 tests PASS.
- `npm run test:ui-harness`
  - 15 tests PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - 3200 PASS; API, safe weekly, trusted data, and dashboard page ready.
- `git diff --check`
  - PASS; only existing warning: `tsconfig.json` CRLF will be replaced by LF next time Git touches it.
- Live browser:
  - `http://localhost:3200/dashboard` loaded and showed "抓取节奏".
  - `http://localhost:3200/import` loaded and showed "下次建议抓取", no-background/startup-auto audit copy, and Task Scheduler draft boundary.

## Files Changed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/DATA-CAPTURE-SCHEDULE-RELIABILITY-060-worker-handoff.md`
