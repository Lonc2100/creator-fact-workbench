# VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017 Worker Handoff

## Task ID

VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017

## Completed Work

- Implemented Video Account assistant / creator backend V1 mapper from sanitized V0 captures into internal import payloads.
- Added `video_account_creator_center` as an `ImportSource`.
- Added `VideoAccountPersonalProvider`.
- Added Service/Runtime entrypoints for previewing or importing Video Account personal captures.
- Added local preview/import script.
- Added product spec for `VIDEO-ACCOUNT-PERSONAL-V1`.
- Added contract tests for mapping and import-to-metric-snapshot behavior.
- Ran the mapper against the real sanitized `.local/video-account-personal-v0/raw/` captures.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - Added `video_account_creator_center` to `ImportSource`.
- `src/domain/self-media/providers/video-account-personal-provider.ts`
  - New provider.
  - Maps personal post identity and stable metrics from `/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list`.
  - Merges `/micro/interaction/cgi-bin/mmfinderassistant-bin/post/post_list` and `/micro/interaction/cgi-bin/mmfinderassistant-bin/bullet-chat/feed-list` only when rows match a known content post id.
  - Skips private-message endpoints.
  - Skips rows with missing or redacted `objectId`.
  - Stores only local raw references and query-stripped cover references in `ContentItem.notes`.
- `src/domain/self-media/providers/index.ts`
  - Exports the new provider.
- `src/domain/self-media/service/self-media-service.ts`
  - Added `parseVideoAccountPersonalCaptures`.
  - Added `importVideoAccountPersonalCaptures`, reusing the existing `importPayload` path to create content, platform versions, and metric snapshots.
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added `previewVideoAccountPersonalCaptures`.
  - Added `importVideoAccountPersonalCaptures`.
- `scripts/video-account-personal-import.mjs`
  - Reads sanitized captures from `.local/video-account-personal-v0/raw/`.
  - Writes preview output to `.local/video-account-personal-v1/mapping-preview.json`.
  - Defaults to preview-only.
  - Requires explicit `--save` before writing through Runtime import.
- `package.json`
  - Added `import:video-account`.
- `docs/product-specs/video-account-personal-v1.md`
  - Documents V1 scope, mapping rules, command, output, and acceptance.
- `docs/product-specs/index.md`
  - Added Video Account V0/V1 spec links.
- `tests/self-media-contract.test.ts`
  - Added provider mapping test.
  - Added service import/metric snapshot test.
- `docs/generated/template-doctor-report.md`
  - Refreshed by `npm run verify:harness`; this file was already dirty before this task.

## Real Local Mapping Result

Command:

```text
npm run import:video-account
```

Result from sanitized local captures:

- source: `video_account_creator_center`
- contentCount: `3`
- metricCount: `3`
- saved: `false`
- output: `.local/video-account-personal-v1/mapping-preview.json`
- warning: skipped `2` private message endpoints.
- warning: skipped `4` rows with redacted or missing `objectId`.
- warning: merged `3` interaction post rows with content post ids.
- warning: merged `4` bullet-chat feed rows with content post ids; comment text remains out of scope.

Mapped preview metrics:

- content `video-account-911534ec`: views `257455`, likes `450`, comments `59`, saves `1749`, shares `594`, followersDelta `180`.
- content `video-account-8f3d9a9e`: views `1471`, likes `3`, comments `0`, saves `7`, shares `1`, followersDelta `0`.
- content `video-account-982677fe`: views `780`, likes `4`, comments `0`, saves `9`, shares `0`, followersDelta `0`.

## Field Mapping

Mapped:

- `contentId`: stable internal hash id from `data.list[].objectId`; raw platform object id is not used directly as the internal primary key.
- `title`: `data.list[].desc.shortTitle` when present; fallback to `data.list[].desc.description`; fallback to stable generated title.
- `platform`: `video_account`.
- `format`: `short_video`.
- `publishedAt`: `data.list[].createTime`.
- `views`: `data.list[].readCount`.
- `likes`: `data.list[].likeCount`.
- `comments`: `data.list[].commentCount`.
- `saves`: `data.list[].favCount`.
- `shares`: `data.list[].forwardCount`; fallback to `forwardAggregationCount`.
- `followersDelta`: `data.list[].followCount`.
- `source`: `video_account_creator_center`.
- `rawPayload`: not persisted as full raw; only local raw file references are stored in notes.
- cover reference: stored as a query-stripped reference in notes when available.

Not mapped into durable records in this round:

- private messages and private session data.
- comment content and bullet-chat text.
- notification/helper/report/auth utility endpoints.
- account aggregate charts such as `new_post_total_data` and `fans_trend`; these are useful later but current internal import path is content/metric-snapshot oriented.
- official-account referral/click fields; V0 confirmed candidate paths, but this round did not identify a stable content-level referral count in the post list.

## Verification

- `node --check scripts/video-account-personal-import.mjs`: PASS.
- `npm run import:video-account`: PASS.
- `npm run test:self-media -- --test-name-pattern "video account personal"`: PASS, 37 tests.
- `npm run test:self-media`: PASS, 37 tests.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Safety / Boundary Checks

- Used only sanitized `.local/video-account-personal-v0/raw/` captures and V0/V0-real-capture field-report evidence.
- Did not read or store cookies, tokens, auth headers, or request headers.
- Did not copy raw captures into docs/tests/Git.
- Did not bypass CAPTCHA, risk control, QR login, or login challenges.
- Did not batch crawl public content.
- Did not modify dashboard/reviews/calendar UI.
- Did not add API routes.
- Did not delete files.
- `.local/video-account-personal-v1/mapping-preview.json` is local-only and ignored by Git.

## Existing Worktree Notes

- The worktree already had many dirty/untracked files before this task. I did not revert or clean unrelated files.
- Several files touched in this task, especially `package.json`, `self-media-service.ts`, `self-media-runtime.ts`, `self-media-types.ts`, and `tests/self-media-contract.test.ts`, already contained unrelated local changes from earlier tasks. I added the narrow Video Account V1 changes on top.
- `npm run verify:harness` refreshed `docs/generated/template-doctor-report.md`, which was already dirty before this task.

## How To Use

Preview mapping only:

```text
npm run import:video-account
```

Save mapped content/metrics through the existing Runtime import path:

```text
npm run import:video-account -- --save
```

Use a different sanitized raw directory:

```text
npm run import:video-account -- --raw-dir=.local/video-account-personal-v0/raw
```

## Known Issues

- Current real mapping produces three content-level posts from the available V0 capture.
- URL/cover references still live in `ContentItem.notes` because first-class URL/cover fields do not exist yet.
- Account-level aggregate metrics need a future schema/task if they should be stored outside content-level snapshots.
- Official-account referral/click mapping remains unconfirmed at content-level precision.

## Next Recommendation

Run one controlled save smoke for Video Account, similar to `DOUYIN-PERSONAL-V1-SAVE-SMOKE-015`, to verify saved content, platform versions, metric snapshots, dashboard aggregation, and review aggregation.

## Orchestrator Decision Required

No.
