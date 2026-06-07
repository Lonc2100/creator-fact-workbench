# DOUYIN-PERSONAL-V1-METRICS-014 Worker Handoff

## Task ID

DOUYIN-PERSONAL-V1-METRICS-014

## Completed Work

- Implemented Douyin Creator Center V1 mapper from sanitized V0 captures into internal import payloads.
- Added `douyin_creator_center` as an `ImportSource`.
- Added `DouyinPersonalProvider`.
- Added Service/Runtime entrypoints for previewing or importing Douyin personal captures.
- Added local preview/import script.
- Added contract tests for mapping and import-to-metric-snapshot behavior.
- Ran the mapper against the real sanitized `.local/douyin-personal-v0/raw/` captures.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - Added `douyin_creator_center` to `ImportSource`.
- `src/domain/self-media/providers/douyin-personal-provider.ts`
  - New provider.
  - Maps personal work list rows from `/web/api/creator/item/list`.
  - Merges item performance rows from `/janus/douyin/creator/data/item_analysis/item_performance`.
  - Merges hot video/topic rows only when `ItemId` already matches a personal work-list item.
  - Skips unmatched hot video/topic rows to avoid treating public/bulk discovery data as personal content.
  - Persists only local raw references plus query-stripped URL/cover references in `ContentItem.notes`.
- `src/domain/self-media/providers/index.ts`
  - Exports the new provider.
- `src/domain/self-media/service/self-media-service.ts`
  - Added `parseDouyinPersonalCaptures`.
  - Added `importDouyinPersonalCaptures`, reusing the existing `importPayload` path to create content, platform versions, and metric snapshots.
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added `previewDouyinPersonalCaptures`.
  - Added `importDouyinPersonalCaptures`.
- `scripts/douyin-personal-import.mjs`
  - Reads sanitized captures from `.local/douyin-personal-v0/raw/`.
  - Writes preview output to `.local/douyin-personal-v1/mapping-preview.json`.
  - Defaults to preview-only.
  - Requires explicit `--save` before writing through Runtime import.
- `package.json`
  - Added `import:douyin`.
- `tests/self-media-contract.test.ts`
  - Added provider mapping test.
  - Added service import/metric snapshot test.

## Real Local Mapping Result

Command:

```text
npm run import:douyin
```

Result from sanitized local captures:

- source: `douyin_creator_center`
- contentCount: 5
- metricCount: 5
- saved: false
- output: `.local/douyin-personal-v1/mapping-preview.json`
- warning: 200 hot video/topic rows were skipped because they did not match personal work-list item ids.

## Field Mapping

Mapped:

- `contentId`: `items[].id` from `/web/api/creator/item/list`.
- `title`: `items[].description`; fallback from item performance `title` or hot video `ItemTitle` when matched.
- `platform`: `douyin`.
- `publishedAt`: `items[].create_time`; fallback from item performance `publish_time`.
- `views`: `items[].metrics.view_count`; fallback/merge from `items[].play_count` or matched `PlayCount`.
- `likes`: `items[].metrics.like_count`; fallback/merge from matched `LikeCount`.
- `comments`: `items[].metrics.comment_count`; fallback/merge from matched `CommentCount`.
- `shares`: `items[].metrics.share_count`; fallback/merge from matched `ShareCount`.
- `saves`: `items[].metrics.favorite_count` when present.
- `source`: `douyin_creator_center`.
- `rawPayload`: not persisted as full raw; only local raw file references are stored in notes.
- `作品 URL/封面`: stored as query-stripped URL/cover references in notes when available.

Not mapped into durable records in this round:

- comment content: V0 review marked it as weak/not stable enough.
- follower delta: current follower count candidates exist, but delta mapping was not stable enough.
- unmatched hot video/topic rows: skipped to avoid public/bulk content contamination.

## Verification

- `npm run import:douyin` PASS
  - Generated `.local/douyin-personal-v1/mapping-preview.json`.
  - Preview-only run; did not save by default.
- `npm run test:self-media` PASS
  - 33 tests passed.
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS

Note: one attempted parallel run of two tsx-based commands failed with `spawn UNKNOWN` from esbuild service startup. Sequential reruns passed. This appears to be a local concurrent tsx/esbuild startup issue, not a code failure.

## Safety / Boundary Checks

- Used only sanitized `.local/douyin-personal-v0/raw/` captures and field report evidence.
- Did not read or store cookies, tokens, auth headers, or request headers.
- Did not copy raw captures into docs/tests/Git.
- Did not bypass CAPTCHA, risk control, or login challenges.
- Did not batch crawl public content.
- Did not modify dashboard/reviews/calendar UI.
- Did not delete files.
- Did not add API routes.

## How To Use

Preview mapping only:

```text
npm run import:douyin
```

Save mapped content/metrics through the existing Runtime import path:

```text
npm run import:douyin -- --save
```

Use a different sanitized raw directory:

```text
npm run import:douyin -- --raw-dir=.local/douyin-personal-v0/raw
```

## Known Issues

- The mapper stores URL/cover only in `ContentItem.notes` because no durable `ContentItem.url` / `coverUrl` fields exist yet.
- `followersDelta` remains `0` until a stable delta endpoint is confirmed.
- Comment content is intentionally not imported in V1.
- Existing worktree had many dirty/untracked files before this task. I did not revert or clean unrelated files.

## Next Recommendation

- Orchestrator should decide whether to add first-class optional `url` / `coverUrl` fields to content/platform versions in a future schema task.
- After one or two more real capture runs, compare field stability for follower delta and decide whether to map it.

## Orchestrator Decision Required

No.
