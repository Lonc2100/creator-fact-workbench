# BILIBILI-ACCOUNT-METRICS-PREVIEW-024 Worker Handoff

## Task ID

BILIBILI-ACCOUNT-METRICS-PREVIEW-024

## Completed Work

- Added preview-only Bilibili account metric candidate generation.
- Added npm script:
  - `npm run preview:bilibili-account-metrics`
- Added output artifact:
  - `.local/bilibili-account-metrics-v0/account-preview.json`
- Added pure provider helper:
  - `previewBilibiliAccountMetricSnapshots`
- Added tests for:
  - AccountMetricSnapshot candidate generation;
  - `overview_stat_num` date dedupe;
  - rejection of `index_stat`, `overview_compare`, and `overview_stat_graph`;
  - date-key diagnostics remaining diagnostics only;
  - preview not writing account snapshots or changing content dashboard/review totals.

## Preview Output

Latest command:

```text
npm run preview:bilibili-account-metrics
```

Latest output summary:

- `saved=false`
- `previewOnly=true`
- `source=bilibili_creator_center`
- `candidateCount=1`
- `rejectedCount=10`
- `dateKeyDiagnostics=1`
- candidate date: `2026-06-02`
- candidate views: `7`
- candidate followersDelta: `1`

## Candidate Rules

Accepted candidate source:

- `overview_stat_num` only.

Dedupe rule:

- group `overview_stat_num` rows by normalized `snapshotDate`;
- select the highest non-zero signal row per date;
- signal is `views + likes + comments + saves + shares + followersDelta`;
- ties use latest `capturedAt`;
- lower-signal duplicates become rejected diagnostics.

Rejected:

- `index_stat`: aggregate/cumulative overview without trusted daily date.
- `overview_compare`: comparison/range delta, not a direct daily account metric.
- `overview_stat_graph`: graph diagnostic without mapped series/axis semantics.
- zero-only `overview_stat_num` groups: rejected until a trusted non-zero daily row exists.

Date-key behavior:

- `dateKeyRows` are copied into diagnostics only.
- They are not converted into `AccountMetricSnapshot` candidates.

## Safety

- The preview writes only summary/candidate/diagnostic JSON.
- No Repo/SQLite write is performed by the preview script or pure helper.
- No raw payload, cookie, token, authorization header, request headers, `SESSDATA`, or `bili_jct` was added to the output.
- Sensitive scan over `.local/bilibili-account-metrics-v0/account-preview.json`: PASS.
- Dashboard/review content totals remain content-metric based and are unaffected by this preview.

## Files Changed By This Task

- `src/domain/self-media/providers/bilibili-personal-provider.ts`
- `scripts/bilibili-account-metrics-preview.mjs`
- `package.json`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-PREVIEW-024-worker-handoff.md`

Note: the worktree already had many unrelated modified/untracked files from earlier tasks. I did not revert or clean them.

## Verification

- `npm run preview:bilibili-account-metrics`: PASS.
- `npm run test:self-media`: PASS, 61 tests.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Orchestrator Decision Required

Yes. Main session should decide whether the single `overview_stat_num` candidate is trusted enough for a future account snapshot save task, or whether more raw capture/endpoint evidence is needed first.
