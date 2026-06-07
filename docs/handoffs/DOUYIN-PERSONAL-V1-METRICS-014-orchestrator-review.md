# DOUYIN-PERSONAL-V1-METRICS-014 Orchestrator Review

## Decision

Accepted.

The Worker mapped sanitized Douyin creator-center V0 captures into internal content and metric import payloads, with preview-only behavior by default and explicit `--save` required for persistence.

## Files Reviewed

- `docs/handoffs/DOUYIN-PERSONAL-V1-METRICS-014-worker-handoff.md`
- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/providers/index.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `scripts/douyin-personal-import.mjs`
- `package.json`
- `tests/self-media-contract.test.ts`

## Verification Re-run By Orchestrator

- `npm run import:douyin`: PASS.
- `npm run test:self-media`: PASS, 33 tests.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

Local preview result:

```text
source = douyin_creator_center
contentCount = 5
metricCount = 5
saved = false
warning = skipped 200 hot_video/hot_topic rows that did not match personal item list ids
```

## Accepted Behavior

- Uses sanitized `.local/douyin-personal-v0/raw/` captures.
- Maps personal work-list rows into `ContentItem`.
- Maps stable views, likes, comments, saves, and shares into `PlatformMetric`.
- Reuses the existing `importPayload` path for optional save, so platform versions and metric snapshots are created through existing service rules.
- Skips unmatched hot video/topic rows to avoid importing public or discovery-only content as personal works.
- Keeps full raw payloads out of durable records; notes only carry local raw refs and query-stripped URL/cover references.

## Safety Review

- No cookie, token, auth header, or request header is intentionally read or persisted.
- Raw captures remain under `.local/`.
- Quick sensitive-string scan found no obvious token/cookie/auth strings in the V1 mapping preview or provider/script files; the only match was the handoff safety statement.
- `.local` raw payloads must remain uncommitted.

## Limits

- `followersDelta` remains `0`; current captures confirm follower count candidates but not a stable delta mapping.
- Comment content is still out of scope.
- URL and cover are stored in `ContentItem.notes` because first-class URL/cover fields do not exist yet.
- This review accepts the Douyin V1 mapping only; unrelated dirty changes in service/runtime from WeChat and content workflow are not re-reviewed here.

## Current Stage

Douyin personal creator-center data is now usable through this flow:

```text
logged-in discovery
-> sanitized local captures
-> V1 mapping preview
-> optional existing import path save
-> content/platform versions/metric snapshots
```

## Next Recommended Task

Before adding more platforms, run one controlled save and browser/UI verification:

- `DOUYIN-PERSONAL-V1-SAVE-SMOKE-015`

Goal:

- Run `npm run import:douyin -- --save`.
- Verify imported Douyin content appears in dashboard/import/review data.
- Confirm metric snapshots and platform versions are created.
- Ensure no raw payload or sensitive auth data enters tracked files.

After that, start Xiaohongshu V0 discovery using the same collector pattern.
