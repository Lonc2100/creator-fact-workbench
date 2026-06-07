# SMOKE-ISOLATION-REGRESSION-032 Worker Handoff

## Task

把“smoke 不能污染真实运营库”写成强回归测试，防止以后再把真实抖音/小红书标成 fixture。

## Completed Work

- Hardened `scripts/platform-personal-save-smoke.mjs` so the unified save smoke forces its own smoke database by default instead of inheriting `SELF_MEDIA_DB_PATH`.
- Added the save smoke database path to the unified smoke report:
  - `.local/platform-personal-save-smoke/self-media-smoke.sqlite`
- Hardened `scripts/platform-operations-e2e-smoke.mjs` so default E2E smoke starts an isolated server and isolated DB; it only reuses `127.0.0.1:3200` when `SMOKE_BASE_URL` is explicitly supplied.
- Added a pure E2E smoke plan function for regression tests.
- Added smoke DB path reporting to platform-ops-with-health and daily-platform-ops reports:
  - save smoke: `.local/platform-personal-save-smoke/self-media-smoke.sqlite`
  - E2E smoke: `.local/platform-operations-e2e/self-media-smoke.sqlite`
- Extended daily gate trusted audit summary to include `platformDistribution` and `trustedPlatformCount`.
- Added self-media contract regressions for:
  - `smoke:platforms-save` using the isolated smoke DB even when parent env points at a main operating DB.
  - `platform-operations-e2e` defaulting to an isolated server instead of reusing 3200.
  - daily gate audit remaining at four trusted platforms after save smoke.

## Changed Files

- `scripts/platform-personal-save-smoke.mjs`
- `scripts/platform-operations-e2e-smoke.mjs`
- `scripts/platform-ops-with-health-smoke.mjs`
- `scripts/daily-platform-ops-gate.mjs`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/SMOKE-ISOLATION-REGRESSION-032-worker-handoff.md`

## Verification

- `npm run test:self-media`: PASS, 90/90.
- `npm run typecheck`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
  - Gate report: `.local/daily-platform-ops/report.json`
  - Smoke DB paths recorded in report:
    - `.local/platform-personal-save-smoke/self-media-smoke.sqlite`
    - `.local/platform-operations-e2e/self-media-smoke.sqlite`
  - Trusted audit status: `pass`.
  - Trusted audit counts: 19 trusted contents, 19 trusted metric snapshots, 344412 views, 4259 engagement.
  - Trusted platform count: 4.
  - Trusted platform distribution keys: `bilibili`, `douyin`, `video_account`, `xiaohongshu`.
- `git diff --check`: PASS.

## Operational Notes

- No DB files were deleted.
- During verification, the existing `127.0.0.1:3200` Next process for this repo returned HTTP 500. It was restarted to run the required daily gate against the requested 3200 dashboard URL.
- The repository already had a large dirty/untracked worktree before this task; unrelated changes were not reverted.

## Known Issues

- None found in the requested regression scope.

## Next Recommendation

- Orchestrator should review the diff and decide whether the new forced smoke DB behavior should allow any future explicit override. Current implementation intentionally treats smoke isolation as the default safety contract.

## Orchestrator Decision Required

Yes.
