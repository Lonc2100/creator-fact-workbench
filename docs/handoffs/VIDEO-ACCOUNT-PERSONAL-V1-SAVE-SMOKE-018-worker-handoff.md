# VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018 Worker Handoff

## Task ID

VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018

## Completed Work

- Added a repeatable Video Account V1 save smoke script.
- Ran the explicit save command requested by the 017 orchestrator review:

```text
npm run import:video-account -- --save
```

- Ran the new save smoke:

```text
npm run smoke:video-account-save
```

- Verified the saved Video Account creator-center facts in the default local SQLite database.
- Verified dashboard-visible content, metrics, platform versions, metric snapshots, and review metric aggregation.
- Wrote local-only smoke evidence to `.local/video-account-personal-v1/save-smoke-report.json`.

## Changed Files

- `scripts/video-account-personal-save-smoke.mjs`
  - Loads sanitized `.local/video-account-personal-v0/raw/` captures.
  - Saves through the existing Runtime import path: `importVideoAccountPersonalCaptures`.
  - Writes `.local/video-account-personal-v1/mapping-preview.json` with `saved: true`.
  - Verifies import run, content, metrics, platform versions, metric snapshots, dashboard, and weekly/monthly review aggregation.
  - Checks mapping preview, saved notes, and intended report fields for sensitive/private patterns.
  - Writes `.local/video-account-personal-v1/save-smoke-report.json`.
- `package.json`
  - Added `smoke:video-account-save`.
- `docs/product-specs/video-account-personal-v1.md`
  - Added save-smoke command, output, and acceptance notes.
  - Note: this spec file was already untracked from the previous V1 mapping task; I only added the 018 save-smoke sections.
- `docs/generated/template-doctor-report.md`
  - Refreshed by `npm run verify:harness`; this file was already dirty before this task.

## Smoke Result

Command:

```text
npm run smoke:video-account-save
```

Result:

- passed: `true`
- source: `video_account_creator_center`
- contentCount: `3`
- metricCount: `3`
- importRunId: `import-video_account_creator_center-1780539819646`
- report: `.local/video-account-personal-v1/save-smoke-report.json`

Report checks:

- contents: `3`
- metrics: `3`
- platformVersions: `3`
- metricSnapshots: `3`
- dashboardContents: `3`
- dashboardMetrics: `3`
- dashboardMetricSnapshots: `3`
- dashboardPlatformVersions: `3`
- weeklyReviewTotalViews: `471414`
- monthlyReviewTotalViews: `471414`
- expectedVideoAccountViews: `259706`
- safetyChecks: all pass

Notes:

- The explicit `npm run import:video-account -- --save` command ran before the smoke and succeeded.
- The smoke script then performed one additional Runtime save, increasing `video_account_creator_center` import runs from `1` to `2`.
- Content, metrics, platform versions, and metric snapshots are upserted for the same three mapped posts; import runs are append-style records.

## Safety / Boundary Checks

- Used only sanitized `.local/video-account-personal-v0/raw/` captures through the existing V1 mapper.
- Did not copy raw captures into docs/tests/Git.
- Did not read or store cookies, request headers, auth headers, or tokens.
- Did not save private-message or comment-list content.
- Narrow sensitive/private scan over `.local/video-account-personal-v1` and the new smoke script found only scanner pattern definitions in the script, not sensitive output data.
- Local database write is limited to the ignored local SQLite store.
- Did not modify dashboard/reviews/calendar UI.
- Did not add API routes.
- Did not delete files.

## Verification

- `node --check scripts/video-account-personal-save-smoke.mjs`: PASS.
- `npm run import:video-account -- --save`: PASS.
- `npm run smoke:video-account-save`: PASS.
- `npm run test:self-media`: PASS, 37 tests.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Known Issues

- Re-running `smoke:video-account-save` creates another `video_account_creator_center` import run while upserting the same three content and metric snapshot records. This is expected for the current import-run audit trail.
- URL/cover references still live in `ContentItem.notes` as query-stripped refs until a future schema task adds first-class fields.
- Comment content, bullet-chat text, private messages, account-level aggregate charts, and official-account referral/click metrics remain out of scope.
- Existing worktree had many unrelated dirty/untracked files before this task; I did not revert or clean them.

## Next Recommendation

- Orchestrator can treat Video Account personal V1 as save-smoke accepted.
- If Video Account V1 is promoted into user-facing flows later, add a UI/API task separately rather than extending this smoke task.
- If referral/click metrics matter next, run a targeted discovery/schema task for account-level or referral-level facts before mapping them.

## Orchestrator Decision Required

No.
