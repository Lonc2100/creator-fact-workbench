# BILIBILI-PERSONAL-V0-REAL-CAPTURE-020 Orchestrator Review

## Decision

Accepted.

Bilibili V0 moved from collector scaffold to real logged-in field discovery.

## Reviewed Inputs

- Worker handoff: `docs/handoffs/BILIBILI-PERSONAL-V0-REAL-CAPTURE-020-worker-handoff.md`
- Capture summary: `.local/bilibili-personal-v0/capture-summary.json`
- Field report: `.local/bilibili-personal-v0/field-report.md`
- Collector script: `scripts/bilibili-personal-discovery.mjs`

## Evidence

Latest real capture summary:

- `loginState: logged_in_or_accessible`
- `jsonCaptures: 27`
- `endpointCount: 14`
- `rawDir: .local/bilibili-personal-v0/raw`
- `source: bilibili_creator_center_discovery_only`

Coverage:

- account overview: candidate paths found
- works/video list: candidate paths found
- views/play: candidate paths found
- likes: candidate paths found
- comments: candidate paths found
- favorites/saves: candidate paths found
- shares/forwards: candidate paths found
- follower changes: candidate paths found
- comment-related fields: candidate paths found, but not approved for text persistence

Strong future mapper endpoints include:

- `/x/vupre/web/oversea/archives`
- `/c/data/oversea/web/index/stat`
- `/c/data/oversea/web/overview/stat/num`
- `/c/data/oversea/web/overview/compare`
- `/c/data/oversea/web/overview/stat/graph`
- `/c/data/oversea/web/survey`

## Accepted Behavior

The collector:

- launched the isolated Bilibili profile;
- used the user's logged-in creator-center pages;
- saved raw captures only under `.local/bilibili-personal-v0/`;
- produced sanitized field and endpoint reports;
- did not write durable Repo/Service/MetricSnapshot records;
- did not do public batch crawling;
- did not continue WeChat Official Account backend work.

The script fixes for login/tab replacement handling and endpoint sample-value omission are accepted.

## Orchestrator Verification

The orchestrator reran:

- `npm run test:self-media`: PASS, 42 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS
- `npm run verify:harness`: PASS

## Follow-Up

Open Bilibili V1 as preview-only first.

The next task should map the strongest verified Bilibili Studio endpoints into internal preview payloads and a `mapping-preview.json`, but should not save durable `MetricSnapshot` records until the preview is reviewed.

Special mapping note:

- date-keyed paths such as `$.data.20260602.arc_inc[]` need date-key normalization before V1 semantics are trusted.

## Current Stage

Bilibili is ready for `BILIBILI-PERSONAL-V1-METRICS` preview mapping.
