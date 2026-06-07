# DATA-FRESHNESS-NEXT-033 Worker Handoff

## Task

Plan and implement the minimum closed loop for judging data freshness after the next real collection.

## Completed Work

- Added explicit freshness timeline fields to platform health reports:
  - `latestRealCaptureAt`
  - `latestSmokeAt`
  - `latestAuditAt`
  - `realCaptureIsStale`
  - `smokeIsStale`
  - `staleAfterHours`
- Updated platform health so raw capture age is a real data freshness signal, separate from mapping preview and save smoke reports.
- Updated platform health warnings and summary with `realCaptureStaleCount`.
- Updated platform-ops-with-health report summary to carry health freshness forward.
- Updated trusted dashboard audit report to record its own `latestAuditAt` while reading only the latest health freshness summary for real capture/smoke times.
- Updated daily platform ops gate report to summarize real capture, smoke, and audit freshness separately.
- Updated `/import` UI health and daily gate panels to show summary freshness only.
- Added tests proving a fresh smoke report cannot make stale real capture evidence look fresh.

## Boundaries

- No new platform was added.
- WeChat Official Account / backend was not touched.
- No browser collection was opened or automated.
- UI remains read-only for this feature and does not trigger health, audit, smoke, save, login, or collection commands.
- Reports and UI show summary timestamps/status only; no raw payload bodies are displayed.

## Changed Files

- `scripts/platform-data-health.mjs`
- `scripts/platform-ops-with-health-smoke.mjs`
- `scripts/trusted-dashboard-audit.mjs`
- `scripts/daily-platform-ops-gate.mjs`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/DATA-FRESHNESS-NEXT-033-worker-handoff.md`

Note: the four script files above are currently untracked in the existing worktree state, so `git diff --name-only` will not list them even though the tests import and verify them.

## Verification

- `npm run test:self-media`: PASS, 92/92.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Key Test Evidence

- `platform data health does not let fresh smoke masquerade as fresh real capture`
  - Builds old raw capture evidence plus fresh smoke.
  - Asserts `latestRealCaptureAt` remains the old raw capture time.
  - Asserts `latestSmokeAt` is the fresh smoke time.
  - Asserts `realCaptureIsStale=true` while `smokeIsStale=false`.
- `daily platform ops gate summarizes real capture smoke and audit freshness separately`
  - Asserts daily gate report carries three separate timestamps.
- `trusted dashboard audit matches API snapshot totals and trusted post-import evidence`
  - Now also asserts audit freshness fields are populated without raw payload.

## Known Issues

- No implementation blocker found.
- The worktree was already heavily dirty/untracked before this task; unrelated existing changes were not reverted.
- `npm run verify:harness` regenerated `docs/generated/template-doctor-report.md` timestamp as part of the standard verification flow.

## Next Recommendation

- Orchestrator should decide whether stale real capture should remain warning-only or become a blocking condition once the next real collection cadence is fixed.

## Requires Orchestrator Decision

Yes.
