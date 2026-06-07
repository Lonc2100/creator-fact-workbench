# TRUSTED-DASHBOARD-AUDIT-030 Orchestrator Review

## Decision

Accepted as the default trusted dashboard audit.

Use the audit with an explicit dashboard URL or dashboard JSON. A bare run intentionally fails with `dashboard.input` because it can compute expected DB totals but cannot compare the live dashboard/API output.

## Accepted Command

When the dev server is on port 3200:

```bash
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

## Main Session Verification

Reran against the active local server:

- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

Current trusted content-level baseline:

- trusted contents: `19`
- trusted metric snapshots: `19`
- trusted import runs: `4`
- views: `344412`
- engagement: `4259`
- mismatches: none

Platform distribution:

- Douyin: 5 contents, 5 snapshots, 73423 views, 1222 engagement.
- Xiaohongshu: 1 content, 1 snapshot, 10667 views, 133 engagement.
- Video Account: 3 contents, 3 snapshots, 259706 views, 2876 engagement.
- Bilibili: 10 contents, 10 snapshots, 616 views, 28 engagement.

## Boundary

This audit does not collect platform data, mutate the database, clean old rows, or validate account-level Bilibili metrics. It is a read-only comparison between trusted DB scope and dashboard/API output.
