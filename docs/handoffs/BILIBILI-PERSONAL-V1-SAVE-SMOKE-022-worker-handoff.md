# BILIBILI-PERSONAL-V1-SAVE-SMOKE-022 Worker Handoff

## Task

Promote accepted Bilibili creator-center V1 preview mapping to durable save + smoke for reviewed archives content-level metrics only.

## Status

Completed.

## Scope Kept

- Saved only `/x/vupre/web/oversea/archives` content-level works and per-work metric fields.
- Kept `accountMetrics` and `dateKeyRows` as preview/report diagnostics only.
- Did not save comment body text or danmu text.
- Did not save raw payload, cookies, tokens, request headers, or credentials.
- Did not add public crawling, WeChat backend work, or Bilibili account-level durable metrics.

## Changed Files

- `src/domain/self-media/service/self-media-service.ts`
  - Added `BilibiliPersonalProvider` injection.
  - Added `parseBilibiliPersonalCaptures`.
  - Added `importBilibiliPersonalCaptures`.
  - Added Bilibili to platform import status summaries.
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added `previewBilibiliPersonalCaptures`.
  - Added `importBilibiliPersonalCaptures`.
  - Added Bilibili to platform import operation config.
- `src/domain/self-media/types/self-media-types.ts`
  - Extended platform import operation/status types for Bilibili.
- `src/domain/self-media/config/self-media-config.ts`
  - Updated Bilibili readiness to content-level closed loop for archives save-smoke.
- `scripts/bilibili-personal-import.mjs`
  - `--save` now writes durable records through runtime/service.
  - Default remains preview behavior when `--save` is omitted.
- `scripts/bilibili-personal-save-smoke.mjs`
  - New Bilibili save smoke runner.
- `package.json`
  - Added `npm run smoke:bilibili-save`.
- `tests/self-media-contract.test.ts`
  - Added Bilibili durable save, idempotency, dashboard/review readability, and safety coverage.
  - Updated platform status/readiness expectations for Bilibili.

## Durable Save Behavior

Command:

```text
npm run import:bilibili -- --save
```

Result:

- `source`: `bilibili_creator_center`
- `saved`: `true`
- `previewOnly`: `false`
- content count: `10`
- metric count: `10`
- saved entities:
  - `Content`
  - `PlatformMetric`
  - `ContentPlatformVersion`
  - `MetricSnapshot`

The saved payload uses the existing `SelfMediaService.importPayload` path, so content, platform versions, and metric snapshots use stable upsert IDs. Import runs remain append-style audit records.

## Smoke Result

Command:

```text
npm run smoke:bilibili-save
```

Report:

```text
.local/bilibili-personal-v1/save-smoke-report.json
```

Observed result:

- passed: `true`
- content count: `10`
- metric count: `10`
- platform versions: `10`
- metric snapshots: `10`
- dashboard contents: `10`
- dashboard metrics: `10`
- dashboard metric snapshots: `10`
- dashboard platform versions: `10`
- repeated save idempotency:
  - content entities stable: `true`
  - platform versions stable: `true`
  - metric snapshots stable: `true`
  - import runs append: `true`

## Diagnostics Kept Out Of Persistence

The Bilibili provider still computes diagnostics from accepted strong endpoints:

- `/c/data/oversea/web/index/stat`
- `/c/data/oversea/web/overview/stat/num`
- `/c/data/oversea/web/overview/compare`
- `/c/data/oversea/web/overview/stat/graph`
- `/c/data/oversea/web/survey`

These remain out of durable `Content`, `PlatformMetric`, `PlatformVersion`, and `MetricSnapshot` records in this task.

## Safety Notes

- Raw captures stay under `.local/bilibili-personal-v0/raw/`.
- Preview/report outputs contain summaries and IDs only.
- Smoke safety checks passed for mapping preview, command output, saved content notes, saved import runs, and intended report summary.
- No cookie, token, authorization header, request headers, comment body, or danmu text was persisted by the Bilibili save path.

## Verification

- `npm run import:bilibili -- --save`: PASS
- `npm run smoke:bilibili-save`: PASS
- `npm run test:self-media`: PASS, 49 tests
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS

## Orchestrator Decision Required

Yes.

Recommended review focus:

- Accept Bilibili as archives content-level durable save only.
- Keep account-level metrics and survey/date-key rows out of durable save until a separate account-metrics spec is accepted.
