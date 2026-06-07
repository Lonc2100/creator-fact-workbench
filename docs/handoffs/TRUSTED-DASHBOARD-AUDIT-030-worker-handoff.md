# TRUSTED-DASHBOARD-AUDIT-030 Worker Handoff

## Scope

- Verified `/dashboard`, `/reviews`, and `/import` default surfaces against `trusted_real_creator_center` scope.
- No DB deletion, cleanup, migration, or row mutation was performed for this task.
- No raw payload, private titles, cookies, tokens, headers, comment text, or danmu text were written to this handoff.

## Changes

- Added read-only audit command:
  - `scripts/trusted-dashboard-audit.mjs`
  - `npm run audit:trusted-dashboard`
- The audit script:
  - Opens SQLite with `DatabaseSync(dbPath, { readOnly: true })`.
  - Independently computes trusted creator-center content count, snapshot count, exposure, engagement, source distribution, and platform distribution.
  - Compares computed values with dashboard JSON/API totals.
  - Checks post-import suggestion evidence by trusted `metricSnapshotId`/source only.
  - Writes sanitized reports only:
    - `.local/trusted-dashboard-audit/report.json`
    - `.local/trusted-dashboard-audit/report.md`
- Added contract coverage in `tests/self-media-contract.test.ts`:
  - Trusted dashboard audit matches dashboard snapshot totals.
  - Post-import suggestions use only trusted snapshot evidence.
  - Bilibili public archive enters default scope.
  - Bilibili private/unknown-style skipped capture rows and legacy polluted rows do not enter default dashboard.

## Real Audit Result

Command:

```bash
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3214/api/self-media/dashboard
```

Result: `PASS`

Sanitized totals:

| Metric | Count |
| --- | ---: |
| Trusted contents | 19 |
| Trusted metric snapshots | 19 |
| Trusted import runs | 4 |
| Views | 344412 |
| Engagement | 4259 |
| Post-import suggestions | 4 |
| Suggestion evidence checked | 4 |
| Untrusted suggestion evidence | 0 |

Platform distribution:

| Platform | Contents | Snapshots | Views | Engagement |
| --- | ---: | ---: | ---: | ---: |
| douyin | 5 | 5 | 73423 | 1222 |
| xiaohongshu | 1 | 1 | 10667 | 133 |
| video_account | 3 | 3 | 259706 | 2876 |
| bilibili | 10 | 10 | 616 | 28 |

Dashboard/API checks:

- `contents.count`: PASS
- `metrics.count`: PASS
- `metricSnapshots.count`: PASS
- `weeklyReview.totalViews`: PASS
- `weeklyReview.totalEngagement`: PASS
- `weeklyReview.contentCount`: PASS
- `monthlyReview.totalViews`: PASS
- `monthlyReview.totalEngagement`: PASS
- `monthlyReview.contentCount`: PASS
- `realDataScope.defaultScope`: PASS
- `realDataScope.trustedSources`: PASS
- `realDataScope.isDefaultDashboardTrusted`: PASS
- `realDataScope.trustedContentCount`: PASS
- `realDataScope.trustedMetricCount`: PASS
- `realDataScope.trustedMetricSnapshotCount`: PASS
- `realDataScope.trustedImportRunCount`: PASS
- `metricPlatformGroups`: PASS
- `postImportActionSuggestions.trustedEvidenceOnly`: PASS
- `bilibili.defaultDashboard.snapshotCount`: PASS

Mismatches: none.

## Screenshots

- `.local/trusted-dashboard-audit-030-dashboard.png`
- `.local/trusted-dashboard-audit-030-reviews.png`
- `.local/trusted-dashboard-audit-030-import.png`

## Boundary Notes

- Default dashboard/reviews/import suggestions remain scoped to:
  - `douyin_creator_center`
  - `xiaohongshu_creator_center`
  - `video_account_creator_center`
  - `bilibili_creator_center`
- WeChat/manual/csv/mediacrawler/n8n/demo/smoke/test-style rows remain excluded from default review totals.
- Bilibili account metrics/date-key diagnostics remain outside content totals.
- Bilibili public-only behavior is covered by existing and new regression tests; non-public/unknown/review/down/offline rows are skipped before durable content metrics.

## Verification

```bash
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3214/api/self-media/dashboard
npm run test:self-media
npm run typecheck
npm run verify:harness
git diff --check
```

All commands passed.
