# XIAOHONGSHU-PERSONAL-V1-METRICS-017 Worker Handoff

## Task ID

XIAOHONGSHU-PERSONAL-V1-METRICS-017

## Completed Work

- Implemented Xiaohongshu Creator Center V1 mapper from sanitized V0 captures into internal import payloads.
- Added `xiaohongshu_creator_center` as an `ImportSource`.
- Added `XiaohongshuPersonalProvider`.
- Added Service/Runtime entrypoints for previewing or importing Xiaohongshu personal captures.
- Added local preview/import script.
- Added product spec for `XIAOHONGSHU-PERSONAL-V1`.
- Added contract tests for mapping and import-to-metric-snapshot behavior.
- Ran the mapper against the real sanitized `.local/xiaohongshu-personal-v0/raw/` captures.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - Added `xiaohongshu_creator_center` to `ImportSource`.
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
  - New provider.
  - Maps personal note identity from `/api/galaxy/creator/home/latest_note_data`.
  - Maps stable note metrics from `/api/galaxy/creator/datacenter/note/base`.
  - Merges `/api/galaxy/creator/data/note_detail_new` only when it can attach to a known personal note id.
  - Skips `/api/galaxy/creator/select/topic/detail` topic/recommendation captures to avoid importing public notes.
  - Stores only local raw references and query-stripped URL/cover references in `ContentItem.notes`.
- `src/domain/self-media/providers/index.ts`
  - Exports the new provider.
- `src/domain/self-media/service/self-media-service.ts`
  - Added `parseXiaohongshuPersonalCaptures`.
  - Added `importXiaohongshuPersonalCaptures`, reusing the existing `importPayload` path to create content, platform versions, and metric snapshots.
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added `previewXiaohongshuPersonalCaptures`.
  - Added `importXiaohongshuPersonalCaptures`.
- `scripts/xiaohongshu-personal-import.mjs`
  - Reads sanitized captures from `.local/xiaohongshu-personal-v0/raw/`.
  - Writes preview output to `.local/xiaohongshu-personal-v1/mapping-preview.json`.
  - Defaults to preview-only.
  - Requires explicit `--save` before writing through Runtime import.
- `package.json`
  - Added `import:xiaohongshu`.
- `docs/product-specs/xiaohongshu-personal-v1.md`
  - Documents V1 scope, mapping rules, command, output, and acceptance.
- `docs/product-specs/index.md`
  - Added the Xiaohongshu V1 spec link.
- `tests/self-media-contract.test.ts`
  - Added provider mapping test.
  - Added service import/metric snapshot test.

## Real Local Mapping Result

Command:

```text
npm run import:xiaohongshu
```

Result from sanitized local captures:

- source: `xiaohongshu_creator_center`
- contentCount: `1`
- metricCount: `1`
- saved: `false`
- output: `.local/xiaohongshu-personal-v1/mapping-preview.json`
- warning: skipped `1` topic/detail recommendation capture to avoid importing public notes.
- warning: merged `1` `note_detail_new` capture with the latest known personal note id.

Mapped local preview content:

- contentId: `6a1d7004000000003601d378`
- platform: `xiaohongshu`
- format: `short_video`
- views: `10667`
- likes: `85`
- comments: `3`
- saves: `38`
- shares: `7`
- followersDelta: `5`

## Field Mapping

Mapped:

- `contentId`: `data.noteInfo.id` from `/api/galaxy/creator/home/latest_note_data`; also supported from `note_id` query or `data.note_info.id` on `/api/galaxy/creator/datacenter/note/base`.
- `title`: `data.noteInfo.title`; fallback from `data.note_info.desc`.
- `platform`: `xiaohongshu`.
- `format`: video-like note type maps to `short_video`; otherwise `image_text`.
- `publishedAt`: `postTime`, `post_time`, `user_update_time`, or `update_time`.
- `views`: `data.view_count`, `data.seven.view_count`, or `data.note_info.view_count`.
- `likes`: `data.like_count`, `data.seven.like_count`, or `data.note_info.like_count`.
- `comments`: `data.comment_count`, `data.seven.comment_count`, or `data.note_info.comment_count`.
- `saves`: `data.collect_count` or `data.seven.collect_count`.
- `shares`: `data.share_count` or `data.seven.share_count`.
- `followersDelta`: `data.rise_fans_count`, `data.net_rise_fans_count`, or matching `seven` fields.
- `source`: `xiaohongshu_creator_center`.
- `rawPayload`: not persisted as full raw; only local raw file references are stored in notes.
- `笔记 URL/封面`: stored as query-stripped references in notes when available.

Not mapped into durable records in this round:

- comment content: V0 review marked it as weak; not stable enough for V1.
- public topic/recommendation notes: skipped to avoid public/bulk content contamination.
- account aggregate dashboards: useful for later account-level analysis, but current internal import path is content/metric snapshot oriented.
- APM, captcha, security, customer-service, and unrelated utility endpoints.

## Verification

- `node --check scripts/xiaohongshu-personal-import.mjs`: PASS.
- `npm run import:xiaohongshu`: PASS.
- `npm run test:self-media`: PASS, 35 tests.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Safety / Boundary Checks

- Used only sanitized `.local/xiaohongshu-personal-v0/raw/` captures and V0 field-report evidence.
- Did not read or store cookies, tokens, auth headers, or request headers.
- Did not copy raw captures into docs/tests/Git.
- Did not bypass CAPTCHA, risk control, or login challenges.
- Did not batch crawl public content.
- Did not modify dashboard/reviews/calendar UI.
- Did not delete files.
- Did not add API routes.
- `.local/xiaohongshu-personal-v1/mapping-preview.json` is local-only and ignored by Git.

## Existing Worktree Notes

- The worktree already had many dirty/untracked files before this task. I did not revert or clean unrelated files.
- `npm run verify:harness` refreshed `docs/generated/template-doctor-report.md`, which was already dirty before this task.

## How To Use

Preview mapping only:

```text
npm run import:xiaohongshu
```

Save mapped content/metrics through the existing Runtime import path:

```text
npm run import:xiaohongshu -- --save
```

Use a different sanitized raw directory:

```text
npm run import:xiaohongshu -- --raw-dir=.local/xiaohongshu-personal-v0/raw
```

## Known Issues

- The current real mapping produces one note because the available V0 real capture focused on the latest note/detail pages.
- URL and cover are stored in `ContentItem.notes` because first-class URL/cover fields do not exist yet.
- `note_detail_new` can be ambiguous when the response lacks a note id; the provider only merges it with the latest known personal note and records a warning.
- Account-level aggregate metrics need a future schema/task if they should be stored outside content-level snapshots.

## Next Recommendation

- Run one controlled save smoke for Xiaohongshu, similar to `DOUYIN-PERSONAL-V1-SAVE-SMOKE-015`, to verify saved content, platform version, metric snapshot, dashboard, and review aggregation.
- Capture another Xiaohongshu creator-center pass after opening more note list/detail pages if multiple-note import coverage is needed.

## Orchestrator Decision Required

No.
