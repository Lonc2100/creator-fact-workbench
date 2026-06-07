# REAL-DATA-SCOPE-029 Orchestrator Review

## Decision

Accepted.

Default dashboard, review, evidence insight, and post-import suggestion inputs should now be treated as trusted real creator-center scope unless a worker explicitly opens an all-data/debug view.

## Accepted Default Scope

Only these content-level creator-center sources enter the default operating view:

- `douyin_creator_center`
- `xiaohongshu_creator_center`
- `video_account_creator_center`
- `bilibili_creator_center`

Known smoke/demo/test fixture traces are excluded from the default operating view even when they reuse a creator-center source.

## What This Fixes

- Historical demo, smoke, manual, csv, mediacrawler, n8n, and paused WeChat rows remain in the repo but no longer define the default dashboard/review totals.
- Reviews and evidence insights no longer use the legacy mixed metric pool as the default business truth.
- Post-import suggestions now inherit filtered dashboard snapshots, which makes them suitable as real operating suggestions after this review.
- `/import` exposes the trusted scope summary so operators can see what was included and excluded.

## Caveat

The current smoke/demo exclusion includes text-pattern matching. This is acceptable as a local cleanup guard for the existing polluted database, but it is not a perfect long-term provenance model.

Future data writes should prefer explicit metadata flags for test/demo runs so real user content containing words such as `test` or `demo` is not accidentally excluded.

## Verification

Main session reran:

- `npm run test:self-media`: PASS, 75/75.
- `npm run typecheck`: PASS.
- `npm run check:local-data-quarantine`: PASS.
- `git diff --check`: PASS.
