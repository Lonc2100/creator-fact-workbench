# BILIBILI-ACCOUNT-METRICS-SPEC-022

## Problem

`BILIBILI-PERSONAL-V1-METRICS-021` accepted Bilibili creator-center mapping as preview-only. The preview already separates content-level archive metrics from account-level overview/stat diagnostics, but the durable model still only has content-oriented `MetricSnapshot`.

The 022 decision is to specify a future-safe account metric shape before any save implementation. Account trend metrics must not be forced into work-level `MetricSnapshot`, because that would mix one account/day fact with many content/version facts and cause dashboard/review double counting.

## Inputs Reviewed

- `docs/handoffs/BILIBILI-PERSONAL-V1-METRICS-021-orchestrator-review.md`
- `docs/handoffs/BILIBILI-PERSONAL-V0-REAL-CAPTURE-020-orchestrator-review.md`
- `.local/bilibili-personal-v1/mapping-preview.json`
- `src/domain/self-media/providers/bilibili-personal-provider.ts`

No raw payload is copied into this spec.

## External Reference Check

The spec follows a common analytics split seen in external tools and API wrappers:

- Meta/Instagram-oriented tooling exposes separate account-level insights and media/post-level insights, which supports keeping account trends out of per-post records: https://www.postman.com/meta/instagram/folder/w5jo9vk/insights and https://github.com/BilalTariq01/instagram-analytics-mcp
- Bilibili creator-center community API notes describe account/stat trend endpoints and survey date-key rows separately from individual manuscript rows, which matches the local preview boundary: https://lxb007981.github.io/bilibili-API-collect/creativecenter/statistics%26data.html
- Commercial analytics connector docs commonly split account, lifetime account, and media tables, which supports a separate `AccountMetricSnapshot` table instead of overloading post metrics: https://docs.supermetrics.com/docs/instagram-insights

These references are used only for model-shape inspiration. The source of truth for this task remains the local sanitized Bilibili creator-center capture preview.

Reference evaluation:

| Reference | Applicability | Timeliness | Authority | Popularity |
| --- | --- | --- | --- | --- |
| Meta/Postman Instagram Insights | High for the account-vs-media split; not Bilibili-specific. | Current enough as an API-network reference, but exact Meta fields can drift. | High because it is Meta-published API material. | High ecosystem adoption. |
| Bilibili API collect notes | High for endpoint naming and date-key shape; not an official contract. | Medium because creator-center endpoints can change without notice. | Medium-low because it is community maintained. | Useful community reference, but local captures remain authoritative. |
| Supermetrics Instagram connector docs | Medium for warehouse/table-shape inspiration. | Current enough for analytics connector modeling. | Medium-high as a mature commercial connector. | High among marketing analytics users. |
| Instagram analytics MCP GitHub repo | Medium as an open-source implementation pattern. | Recent crawl, but dependency on Meta API versions can drift. | Medium-low because it is unofficial. | Lower than official/commercial references; used only as implementation inspiration. |

## Mapping Preview Analysis

The latest preview has:

- `source`: `bilibili_creator_center`
- `contentCount`: `10`
- `metricCount`: `10`
- `accountMetricCount`: `11`
- `dateKeyRows`: `1`
- `saved`: `false`
- `previewOnly`: `true`

Content-level metrics:

- Source endpoint: `/x/vupre/web/oversea/archives`
- Shape: one metric row per mapped Bilibili work.
- Identity: `contentId`, `platformVersionId`, `platform`, `capturedAt`.
- Fields: `views`, `likes`, `comments`, `saves`, `shares`, `followersDelta`.
- Current total across the 10 preview metrics: `views=616`, `likes=20`, `comments=1`, `saves=2`, `shares=5`, `followersDelta=0`.
- Confidence: usable for the next Bilibili content save smoke, because rows are tied to archive identity and match the existing content/platform-version/metric-snapshot path.

Account-level preview diagnostics:

- `index_stat`: 5 repeated captures with the same values. These look like account aggregate counters, not daily rows. They are useful as account overview evidence, but not yet a `date`-keyed daily snapshot unless the product accepts capture-date cumulative snapshots.
- `overview_stat_num`: 4 captures with `snapshotDate=20260602`. These are the closest fit for account-level daily rows, but the preview contains duplicates and both zero and non-zero values for the same date. They need endpoint-level dedupe and field semantics before durable save.
- `overview_compare`: 1 capture with positive views/likes/followers delta and a negative comments value. This is likely a comparison/range delta, not a direct daily fact. It must not be saved as a daily snapshot until the comparison window is proven.
- `overview_stat_graph`: 1 capture with zero-filled normalized fields. This is not trustworthy as a metric row until graph axes and series names are mapped.

Date-key rows:

- One survey date key was normalized from `20260602` to `2026-06-02`.
- Row kind: `arc_inc`.
- Row count: `3`.
- These rows are date-keyed manuscript increment diagnostics, but they are not yet mapped to normalized metric fields. `arc_inc` only says there are dated work increment rows; it does not by itself prove whether the increment is views, likes, comments, shares, saves, or another requested survey type.

## Classification

| Preview area | Current classification | Save decision |
| --- | --- | --- |
| `payload.metrics[]` from archives | Work-level content metrics | Can be saved later into existing content metric path after a save-smoke task. |
| `accountMetrics[]` from `overview_stat_num` with `snapshotDate` | Candidate account-level daily metrics | Do not save yet; needs `AccountMetricSnapshot` and dedupe. |
| `accountMetrics[]` from `index_stat` | Account-level aggregate/cumulative overview | Do not save as daily metrics; may later become account overview snapshot or raw evidence. |
| `accountMetrics[]` from `overview_compare` | Account-level comparison/range delta | Not trusted as daily metric because period semantics are unknown and comments can be negative. |
| `accountMetrics[]` from `overview_stat_graph` | Graph diagnostic | Not trusted until graph series names and axes are explicitly mapped. |
| `dateKeyRows[]` from survey | Date-keyed diagnostic rows | Not trusted as normalized metrics until survey `type` and row-level metric semantics are captured. |
| Weak/auxiliary captures | Untrusted operational noise | Keep skipped. |

## Internal Model Recommendation

Add `AccountMetricSnapshot` in a later implementation task.

Recommended durable ownership:

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

Recommended identity:

```text
platform + source + date + rawEvidenceRef
```

If a future importer can prove a single canonical account/day row, it may use:

```text
platform + source + date
```

but only after endpoint dedupe is stable. For Bilibili 022, the safer identity keeps `rawEvidenceRef` because multiple overview endpoints can represent different periods for the same calendar day.

Recommended model semantics:

- `date`: normalized local reporting day, such as `2026-06-02`. Prefer endpoint-provided `snapshotDate` or date-key. Use capture date only for explicitly cumulative account overview snapshots, and label that variant separately before saving.
- `platform`: `bilibili`.
- `source`: `bilibili_creator_center`.
- `views`: account/day views or plays when the endpoint is proven daily.
- `likes`: account/day likes when proven daily.
- `comments`: account/day comments when proven daily. Negative values are only allowed for comparison deltas, not daily snapshots.
- `saves`: account/day favorites/collects when proven daily.
- `shares`: account/day shares when proven daily.
- `followersDelta`: net or new followers for the account/day. Do not write work-level `followersDelta` unless a work-specific follower attribution field is proven.
- `rawEvidenceRef`: sanitized local capture reference, never raw payload. It should be enough to trace the source file and endpoint family without storing cookies, headers, or body text in tracked files.

Rejected alternatives:

- Do not add account rows to `MetricSnapshot` with a fake `contentId`.
- Do not attach account rows to the most recent work.
- Do not divide account metrics across works.
- Do not roll account totals into content totals for dashboard/review.

## Dashboard And Review Usage

Dashboard usage:

- Keep work-level totals sourced from `MetricSnapshot` only.
- Add a separate account trend section/table later, sourced from `AccountMetricSnapshot`.
- Display account-level Bilibili values as platform/account trend facts, not as content performance.
- If both account and content metrics are shown on the same dashboard, label them separately and avoid summing them into one "total views" card.

Review usage:

- Weekly/monthly review content performance totals should continue to sum work-level `MetricSnapshot` rows.
- Account metrics should feed a separate "account trend" or "audience movement" section.
- `followersDelta` belongs naturally in account review. It should not be interpreted as a per-work growth result unless a platform endpoint proves work-level attribution.
- When account/day and content/day values overlap, review copy should compare them, not add them together. Example: "Bilibili account views increased while the 10 tracked works contributed X known archive views."

Double-count prevention:

- `MetricSnapshot` answers: "How did this content item perform?"
- `AccountMetricSnapshot` answers: "How did this platform account perform on this date?"
- Cross-platform dashboard cards must declare which family they aggregate.
- Any review evidence should cite either `contentMetricSnapshotIds` or `accountMetricSnapshotIds`, not a mixed ambiguous list.

## Why 022 Save Can Only Save Archives Content Metrics

The current Bilibili preview proves only one durable-ready path:

```text
archives endpoint -> Bilibili work identity -> content/platform version -> content-level metric snapshot
```

Archives rows have stable work identity (`bvid`/`aid`), titles, publish timestamps, and per-work stats. That matches the existing import path and downstream dashboard/review assumptions.

The account-level preview does not yet satisfy durable save requirements:

- `index_stat` repeats cumulative-looking account totals and has no explicit daily date.
- `overview_stat_num` has a date, but duplicate and conflicting rows exist for the same `snapshotDate`.
- `overview_compare` appears to be a comparison delta and may include negative values.
- `overview_stat_graph` was normalized to zeros without series semantics.
- `dateKeyRows` confirms a date-keyed survey shape, but not the metric type needed to map `arc_inc` into `views`, `likes`, `comments`, `saves`, or `shares`.
- Existing `MetricSnapshot` requires content identity, and account rows do not have a legitimate `contentId`.

Therefore the next Bilibili save task, if opened, should save only `payload.contents[]` and `payload.metrics[]` derived from archives. Account metrics remain preview diagnostics until `AccountMetricSnapshot` or an equivalent account-level model is added.

## Future Implementation Notes

Allowed later files, after Orchestrator approval:

- `src/domain/self-media/types/self-media-types.ts`: define `AccountMetricSnapshot`.
- `src/domain/self-media/repo/*`: add account snapshot list/upsert persistence.
- `src/domain/self-media/service/*`: validate account snapshot semantics and dedupe.
- `src/domain/self-media/providers/bilibili-personal-provider.ts`: emit account snapshot candidates only after endpoint semantics are proven.
- `src/domain/self-media/runtime/*`: expose controlled save/preview operations.
- Dashboard/review readers: add separate account trend aggregation.

Suggested Bilibili account-metric acceptance before saving:

- One canonical daily row per `platform + source + date`.
- Dedupe rules for repeated captures.
- Explicit rejection of comparison rows from daily snapshot save.
- Explicit rejection of zero graph rows unless graph series are mapped.
- `rawEvidenceRef` present and sanitized.
- Dashboard/review tests prove account metrics are not added to work-level totals.

## Acceptance

This 022 task is docs-only:

- Analyze `accountMetrics` and `dateKeyRows` in the latest preview.
- Specify which fields are account-level, work-level, or not trusted.
- Recommend an account-level durable model.
- Explain dashboard/review separation and double-count prevention.
- Explain why current save can only cover archives content metrics.
- Do not change business code.
- Do not paste raw payload.
- Run `git diff --check`.
