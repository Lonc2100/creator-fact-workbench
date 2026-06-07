# DAILY-IMPORT-OPERATING-GATE-031 Orchestrator Review

## Decision

Accepted with a critical follow-up fix applied by the main session.

The gate structure is accepted, but it must only be treated as a daily operating command after smoke execution is isolated from the real operating database.

## Issue Found During Main Review

Main review found that smoke runs had marked real Douyin and Xiaohongshu creator-center snapshots as `platform_save_smoke` fixtures in the dirty/history database. That removed Douyin and Xiaohongshu from the default trusted dashboard even though the audit itself still had no API mismatch.

The evidence was:

- trusted audit temporarily showed only 13 trusted contents and 260322 views;
- platform distribution only included Video Account and Bilibili;
- DB provenance summary showed Douyin/Xiaohongshu creator-center snapshots as smoke fixture/ineligible.

## Main Session Fix

Main session changed smoke isolation:

- `scripts/platform-personal-save-smoke.mjs` now defaults to `.local/platform-personal-save-smoke/self-media-smoke.sqlite` with `SELF_MEDIA_SEED_MODE=off`.
- `scripts/platform-operations-e2e-smoke.mjs` no longer reuses the default `127.0.0.1:3200` server unless `SMOKE_BASE_URL` is explicitly supplied; default E2E smoke starts an isolated server with `.local/platform-operations-e2e/self-media-smoke.sqlite` and seed off.
- Douyin and Xiaohongshu were restored through normal platform save provenance.

## Accepted Command

Use this only when a dashboard server is available:

```bash
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

Without `--dashboard-url` or `--dashboard-json`, the gate should fail clearly at the audit step.

## Main Session Verification

Reran after the fix:

- `npm run smoke:platforms-save`: PASS.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run test:self-media`: PASS, 85/85.
- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS, 19 trusted contents, 19 trusted snapshots, 344412 views, 4259 engagement.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not run daily gate or operation smoke against the real operating database unless the purpose is an explicit real platform save. Smoke should remain isolated.
