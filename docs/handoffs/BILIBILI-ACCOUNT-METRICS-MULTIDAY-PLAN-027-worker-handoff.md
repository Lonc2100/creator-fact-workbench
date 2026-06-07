# BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027 Worker Handoff

Task: `BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027`

Status: completed.

## What I Did

- Read the required Bilibili account metric context:
  - `BILIBILI-ACCOUNT-METRICS-STABILITY-025-orchestrator-review.md`
  - `BILIBILI-ACCOUNT-METRICS-PREVIEW-024-orchestrator-review.md`
  - `ACCOUNT-METRIC-SNAPSHOT-MODEL-023-orchestrator-review.md`
- Confirmed `npm run health:platform-data` exists.
- Wrote the multi-day collection plan:
  - `docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027.md`

## Plan Summary

The plan keeps Bilibili account metrics preview-only for 2-3 actual run days.

Daily commands:

- `npm run discover:bilibili -- --target=https://member.bilibili.com/platform/data-up/overview --duration=90000 --max-captures=160`
- `npm run import:bilibili`
- `npm run preview:bilibili-account-metrics`
- `npm run health:platform-data`

Daily local summaries are copied under:

```text
.local/bilibili-account-metrics-v0/multiday/YYYY-MM-DD/
```

Raw captures stay local under `.local/bilibili-personal-v0/raw/` and must not be committed or pasted.

## Acceptance Standard

Three-day acceptance requires:

- at least 2 different candidate dates;
- canonical candidates still come from `overview_stat_num`;
- dedupe stays stable;
- rejected rules for `index_stat`, `overview_compare`, `overview_stat_graph`, and `dateKeyRows` do not drift;
- dashboard/review content totals do not change because of account preview work;
- no raw payload, cookie, token, headers, credentials, comment body, or danmu text in reports.

If only the same candidate date repeats, the plan explicitly keeps Bilibili account metrics preview-only.

## Boundaries

- No business code changed.
- No `AccountMetricSnapshot` save was added.
- No dashboard/review total behavior changed.
- No browser collection button was added.
- WeChat remains paused.

## Validation

- `git diff --check`: PASS.

## Needs Main Session Judgment

No. This is an operator plan and does not require a product decision until the multi-day evidence exists.
