# BILIBILI-ACCOUNT-METRICS-SPEC-022 Orchestrator Review

## Decision

Accepted.

The account-level Bilibili metrics spec correctly keeps account trends separate from content-level `MetricSnapshot` records.

## Reviewed Inputs

- Worker handoff: `docs/handoffs/BILIBILI-ACCOUNT-METRICS-SPEC-022-worker-handoff.md`
- Spec: `docs/product-specs/bilibili-account-metrics-022.md`
- Preview context: `.local/bilibili-personal-v1/mapping-preview.json`

## Accepted Decisions

- The 10 archive-derived Bilibili content metrics are durable-ready for the content metric path.
- Bilibili account-level diagnostics should not be forced into content-level `MetricSnapshot`.
- A future `AccountMetricSnapshot` model is the right direction.
- `index_stat`, `overview_stat_num`, `overview_compare`, `overview_stat_graph`, and survey date-key diagnostics need separate semantics and dedupe before any durable account trend save.
- Dashboard/review content totals must remain content-metric based.
- Account metrics should later appear as a separate account/platform trend evidence family.

## Orchestrator Verification

The orchestrator reran after this and `PLATFORM-BILIBILI-READY-022`:

- `npm run test:self-media`: PASS, 50 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS
- `npm run verify:harness`: PASS

## Current Stage

Accepted as the account-metric modeling guardrail for future Bilibili account trend work.
