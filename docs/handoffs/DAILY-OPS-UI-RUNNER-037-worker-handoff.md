# DAILY-OPS-UI-RUNNER-037 worker handoff

## Scope

- Added a read-only "每日运营闭环" panel on `/import`.
- The panel reads `.local/daily-self-media-ops/report.json` through Service, not from UI code.
- No UI command execution was added.
- No platform collection, platform login, DB deletion, WeChat restoration, or Bilibili account metric save was added.

## Files changed

- `src/domain/self-media/types/self-media-types.ts`
  - Added `DailySelfMediaOpsView` and step view types.
  - Added `dailySelfMediaOps` to `DashboardSnapshot`.
- `src/domain/self-media/service/self-media-service.ts`
  - Added `readDailySelfMediaOpsView()`.
  - Reads only the parent daily ops report.
  - Projects status, five step states, blocking reasons, warnings, next actions, safe weekly redacted paths, and dashboard-url guidance.
  - Redacts forbidden sensitive operating strings before UI display.
- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Added read-only "每日运营闭环" panel above the existing daily gate panel.
  - Displays missing-report guidance for `npm run ops:daily-self-media`.
  - Displays default 3200 dashboard URL and the healthy-port fallback command shape.
- `src/app/globals.css`
  - Added compact styles for the daily ops panel, five-step grid, reason/warning/action lists, and responsive stacking.
- `tests/self-media-contract.test.ts`
  - Added tests for missing report, pass report, fail report, stale child-report isolation, and sensitive text redaction.
- `docs/handoffs/DAILY-OPS-UI-RUNNER-037-worker-handoff.md`
  - This handoff.

## Evidence

- Screenshot saved:
  - `.local/daily-ops-ui-runner-037.png`
- Daily ops report generated:
  - `.local/daily-self-media-ops/report.json`
  - `.local/daily-self-media-ops/report.md`

## Verification

- `npm run ops:daily-self-media -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard` - pass
- `npm run test:self-media` - pass, 111 tests
- `npm run typecheck` - pass
- `npm run verify:harness` - pass
- Page visible-text sensitive scan on `/import` - pass
- `git diff --check` - pass

## Notes

- 3201 was already healthy during verification and returned the dashboard API successfully.
- The UI does not run the daily command. It only points operators to the command and fallback dashboard-url.
- The reader intentionally ignores old child reports when the parent `.local/daily-self-media-ops/report.json` is missing.
- The safe weekly path shown is redacted-only.

## Needs main-session judgment

是
