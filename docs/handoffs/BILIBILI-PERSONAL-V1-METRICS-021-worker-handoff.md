# BILIBILI-PERSONAL-V1-METRICS-021 Worker Handoff

## Task ID

BILIBILI-PERSONAL-V1-METRICS-021

## Completed Work

- Added preview-only Bilibili creator-center mapper.
- Added `BilibiliPersonalProvider`.
- Added `npm run import:bilibili`.
- Added `scripts/bilibili-personal-import.mjs`.
- Mapped sanitized `.local/bilibili-personal-v0/raw/*.json` captures into `.local/bilibili-personal-v1/mapping-preview.json`.
- Kept Bilibili V1 preview-only:
  - `saved: false`
  - `previewOnly: true`
  - `--save` is intentionally rejected.
- Did not add Repo / Service / Runtime durable save entrypoints.
- Did not write `MetricSnapshot`.
- Did not build a Bilibili save smoke.
- Did not import comment body text or danmu text.
- Did not continue WeChat Official Account / WeChat backend work.

## Changed Files

- `src/domain/self-media/providers/bilibili-personal-provider.ts`
  - New Bilibili preview mapper.
  - Strong endpoint whitelist:
    - `/x/vupre/web/oversea/archives`
    - `/c/data/oversea/web/index/stat`
    - `/c/data/oversea/web/overview/stat/num`
    - `/c/data/oversea/web/overview/compare`
    - `/c/data/oversea/web/overview/stat/graph`
    - `/c/data/oversea/web/survey`
  - Only archives create content-level `contents` and `metrics`.
  - Overview/stat endpoints create `accountMetrics` preview diagnostics only.
  - Survey date keys create normalized `dateKeyRows` diagnostics only.
  - Weak/generic endpoints are skipped.
- `scripts/bilibili-personal-import.mjs`
  - Loads `.local/bilibili-personal-v0/raw/*.json`.
  - Writes `.local/bilibili-personal-v1/mapping-preview.json`.
  - Refuses `--save` with a preview-only error.
- `src/domain/self-media/providers/index.ts`
  - Exports `BilibiliPersonalProvider`.
- `src/domain/self-media/types/self-media-types.ts`
  - Adds `bilibili_creator_center` to `ImportSource`.
- `package.json`
  - Adds `import:bilibili`.
- `tests/self-media-contract.test.ts`
  - Adds Bilibili provider contract coverage.
  - Aligns the existing platform import missing-raw assertion with current runtime behavior: failed summary instead of thrown error.

## Preview Output

Latest command:

```text
npm run import:bilibili
```

Latest local output:

- path: `.local/bilibili-personal-v1/mapping-preview.json`
- `saved`: `false`
- `previewOnly`: `true`
- `source`: `bilibili_creator_center`
- `contentCount`: `10`
- `metricCount`: `10`
- `accountMetricCount`: `11`
- `dateKeyRows`: `1`

Preview warnings:

- skipped `11` account-level overview/stat captures for content metrics preview;
- normalized `1` Bilibili survey date key;
- kept `3` dated survey rows out of content metrics until semantics are reviewed;
- skipped `186` weak or auxiliary captures such as nav, realname, web-show, white, grey, preupload, and generic config endpoints.

## Mapping Summary

Content-level source:

- `/x/vupre/web/oversea/archives`
  - maps `Archive.bvid` or `Archive.aid` into stable `contentId`;
  - maps stable `platformVersionId` in preview summaries;
  - maps `Archive.title`;
  - maps `Archive.ptime`, falling back to `ctime`, `dtime`, or `online_time`;
  - maps per-video metrics from `stat`.

Per-video fields:

- views: `stat.view`, fallback `stat.vv`
- likes: `stat.like`, fallback `stat.like_g`
- comments: `stat.reply`
- saves/favorites: `stat.favorite`, fallback `stat.fav_g`
- shares: `stat.share`
- followersDelta: `0` for per-video metrics until a stable work-level follower field is proven

Account-level preview diagnostics:

- `/c/data/oversea/web/index/stat`
- `/c/data/oversea/web/overview/stat/num`
- `/c/data/oversea/web/overview/compare`
- `/c/data/oversea/web/overview/stat/graph`

Date-key diagnostics:

- `20260602` normalized to `2026-06-02`
- date-key rows are not promoted into content metrics yet.

## Safety Notes

- No raw payload is written into the handoff.
- No raw payload is copied into `mapping-preview.json`.
- No cookies, tokens, auth headers, or full request headers are included in preview output.
- Comment body text and danmu text are not imported.
- `api.bilibili.com/x/web-show/res/locs`, `nav`, `realname`, `white`, `grey`, `preupload`, and other generic/auxiliary endpoints are skipped for content metrics.
- No public batch crawling was added.

## Verification

- `npm run import:bilibili`: PASS.
  - `contentCount=10`
  - `metricCount=10`
  - `saved=false`
  - `previewOnly=true`
- `npm run import:bilibili -- --save --out-dir=.local/bilibili-personal-v1-save-reject-check`: PASS as expected rejection.
  - Exits with code `1`.
  - Error: `bilibili_creator_center is preview-only in BILIBILI-PERSONAL-V1-METRICS-021; --save is intentionally rejected.`
- `npm run test:self-media`: PASS, 48 tests.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.
- Sensitive preview scan over `.local/bilibili-personal-v1/mapping-preview.json`: PASS for `cookie`, `token`, `authorization`, `headers`, `SESSDATA`, `bili_jct`, and synthetic comment/danmu secret strings.

## Known Issues

- This is preview-only. It is not accepted as durable ingestion.
- Account-level metrics are visible in preview diagnostics but are not saved and do not enter dashboard/review.
- Survey date-key rows are normalized but not yet mapped into content-level or account-level durable records.
- A future V1 review should decide whether Bilibili account-level metrics get their own internal shape or remain outside `MetricSnapshot`.

## Next Recommendation

Orchestrator should review `.local/bilibili-personal-v1/mapping-preview.json` and this handoff before opening any Bilibili durable-save task.

## Orchestrator Decision Required

Yes.
