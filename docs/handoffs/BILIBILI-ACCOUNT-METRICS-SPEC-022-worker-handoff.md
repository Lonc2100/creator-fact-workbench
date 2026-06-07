# BILIBILI-ACCOUNT-METRICS-SPEC-022 Worker Handoff

## Task ID

BILIBILI-ACCOUNT-METRICS-SPEC-022

## Completed Work

- Added the docs-only product spec:
  - `docs/product-specs/bilibili-account-metrics-022.md`
- Analyzed `.local/bilibili-personal-v1/mapping-preview.json` without copying raw payload.
- Classified Bilibili preview data into:
  - content-level archive metrics;
  - candidate account-level daily metrics;
  - account aggregate/comparison/graph diagnostics;
  - untrusted date-key survey diagnostics.
- Recommended a future `AccountMetricSnapshot` model instead of forcing account trends into content-level `MetricSnapshot`.
- Documented dashboard/review usage rules to avoid double counting.
- Documented why a future 022-era Bilibili save can only persist archives content metrics.

## Preview Findings

Latest preview summary reviewed:

- `saved=false`
- `previewOnly=true`
- `source=bilibili_creator_center`
- `contentCount=10`
- `metricCount=10`
- `accountMetricCount=11`
- `dateKeyRows=1`

Account metric endpoint distribution:

- `index_stat=5`
- `overview_stat_num=4`
- `overview_compare=1`
- `overview_stat_graph=1`

Date-key diagnostic:

- `20260602` normalized to `2026-06-02`
- row kind: `arc_inc`
- row count: `3`

Content metric totals across mapped archive metrics:

- `views=616`
- `likes=20`
- `comments=1`
- `saves=2`
- `shares=5`
- `followersDelta=0`

## Decision Summary

Content-level metrics:

- The 10 archive-derived metrics are the only durable-ready Bilibili metric rows.
- They have legitimate content identity and match the existing content/platform-version/metric-snapshot path.

Account-level metrics:

- `overview_stat_num` is the best candidate for future account daily snapshots because it includes `snapshotDate`, but it still needs dedupe and endpoint semantics.
- `index_stat` appears cumulative/aggregate and should not become a daily account row without an explicit account overview model.
- `overview_compare` is not a daily row; it appears to be a comparison/range delta.
- `overview_stat_graph` is not trusted until graph series are mapped.

Date-key rows:

- `dateKeyRows` confirms date-key normalization works.
- `arc_inc` rows are not yet normalized metrics because the survey metric type and field semantics are not persisted in the preview.

## Model Recommendation

Add `AccountMetricSnapshot` in a later Orchestrator-approved implementation:

```ts
interface AccountMetricSnapshot {
  id: string;
  date: string;
  platform: PlatformId;
  source: ImportSource;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  rawEvidenceRef: string;
}
```

Do not:

- create fake `contentId` values for account rows;
- attach account metrics to the latest content item;
- divide account metrics across works;
- add account totals to content totals in dashboard or review.

## Dashboard And Review Guidance

- Dashboard content totals remain sourced from `MetricSnapshot`.
- Future account trend UI should read `AccountMetricSnapshot`.
- Weekly/monthly review content totals must not include account rows.
- Account metrics should appear as separate platform/account trend evidence.
- Review evidence should cite content metric snapshots and account metric snapshots as different evidence families.

## Why Current Save Must Stay Archives-Only

The current durable-ready path is:

```text
archives endpoint -> Bilibili work identity -> content/platform version -> content-level metric snapshot
```

Account-level preview diagnostics are not ready because:

- some rows are repeated cumulative account totals;
- some rows have the same date but conflicting zero/non-zero values;
- comparison rows may include negative values and unknown periods;
- graph rows lack mapped series semantics;
- survey date-key rows do not yet expose trusted normalized metric type;
- existing `MetricSnapshot` is content-oriented and requires content identity.

## Files Changed

- `docs/product-specs/bilibili-account-metrics-022.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-SPEC-022-worker-handoff.md`
- `docs/product-specs/index.md`

No business code was changed.

## Verification

- `git diff --check`: PASS.

## Orchestrator Decision Required

Yes. The main session should decide whether to open a separate implementation task for `AccountMetricSnapshot`, and separately whether to open a Bilibili save-smoke task that saves archives content metrics only.
