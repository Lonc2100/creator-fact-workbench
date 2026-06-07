# IMPORT-REAL-011 Worker Handoff

## Task ID

IMPORT-REAL-011

## Role And Scope

Backend Worker, provider-level import preview implementation.

Goal: implement real platform import preview upgrades for CSV/XLSX and platform-native metric preview, without UI redesign and without durable `nativeMetrics/rawFields` Types/Repo persistence expansion.

## Required Reading Completed

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/product-specs/import-real-011.md`
- `docs/handoffs/BACKEND-SPEC-011-orchestrator-review.md`

Additional context read:

- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/spec-governance.md`

## Completed Work

Implemented provider-level real import preview upgrades:

- Added platform alias registry in `CsvPresetProvider` for:
  - Douyin
  - Xiaohongshu
  - WeChat Official Account
  - Video Account
  - Bilibili
- Added mapping confidence flags:
  - `confirmed_official`
  - `mature_reference`
  - `draft_realistic`
  - `confirmed_sampled`
- Added native/raw preview rows through provider-owned preview metadata:
  - `normalized`
  - `nativeMetrics`
  - `rawFields`
  - `mappingConfidence`
  - `warnings`
  - `previewDedupeKey`
  - `canConfirmSave`
- Kept confirmed import payload compatible with existing `ProviderImportPayload`:
  - only existing `contents` and `metrics` are persisted;
  - no durable `nativeMetrics/rawFields` fields were added.
- Added CSV and XLSX parsing path:
  - CSV pasted/file content continues to parse as text.
  - XLSX preview accepts base64 file content and parses the first worksheet.
  - XLSX support is implemented without adding a new dependency; it reads minimal OOXML ZIP entries, shared strings, and first worksheet cell values.
- Updated import preview API to support multipart file upload for preview:
  - `file`
  - `preset`
- Kept dashboard/reviews/calendar UI untouched.

## Important Behavior

Rows are only confirm-saveable when they have:

- a title or title/description alias;
- a native id or identifiable URL.

Rows missing either are still visible in preview metadata with warnings, but they are not converted into content/metric payload rows.

Draft-realistic presets:

- Xiaohongshu preview rows include `preset:xiaohongshu:draft_realistic_headers_need_real_export_confirmation`.
- Video Account preview rows include `preset:video_account:draft_realistic_headers_need_real_export_confirmation`.

WeChat date behavior:

- `发布时间` / `群发时间` maps to `publishedAt`.
- `ref_date` / `统计日期` maps to `capturedAt`.

Native metric behavior:

- Douyin preserves `forward_count` / `下载数` as native preview data.
- WeChat preserves user-count fields such as `int_page_read_user`.
- Bilibili preserves `danmaku` / `coin`.
- Xiaohongshu preserves exposure/source fields.
- Video Account preserves forwarding/conversion fields.

## Changed Files

Task-specific edits:

- `src/domain/self-media/providers/csv-preset-provider.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/app/api/self-media/import/preview/route.ts`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/IMPORT-REAL-011-worker-handoff.md`

Scope note:

- `src/domain/self-media/runtime/self-media-runtime.ts`, `src/domain/self-media/service/self-media-service.ts`, and `tests/self-media-contract.test.ts` were already dirty before this Worker started. This Worker did not edit Runtime. It only added import-real-specific Service/test changes where needed.
- Existing unrelated dirty/untracked files were not reverted or cleaned.

## Verification Commands And Results

```text
npm run test:self-media
PASS
```

Result summary:

- 27 tests passed.
- Added coverage for five real platform preview presets.
- Added XLSX preview coverage.
- Added invalid preview row coverage.

```text
npm run typecheck
PASS
```

```text
npm run verify:harness
PASS
```

Result summary:

- context-check PASS
- lint:arch PASS
- test:structure PASS
- test:references PASS
- test:ui-harness PASS
- test:self-media PASS
- test:entropy PASS
- test:agent-trajectory PASS
- template:doctor PASS

```text
git diff --check
PASS
```

## Known Issues / Limits

- XLSX parser is intentionally narrow: first worksheet, common inline/shared string cells, numeric/text values, ZIP store/deflate entries. It is enough for current provider preview fixtures and common simple exports, but not a full Excel library.
- No UI table was added for `realPreviewRows`; API/runtime returns the metadata for the existing preview flow to consume later.
- No durable `nativeMetrics/rawFields` storage was added. The open storage decision remains with Orchestrator.
- Xiaohongshu and Video Account headers remain `draft_realistic` until the user provides real exports.
- Multipart upload support was added only to preview API, not confirm import API.

## Next Recommendation

Orchestrator should review this implementation and then decide one of:

1. Start a small UI/import-preview Worker to display `realPreviewRows`, mapping confidence, and warnings.
2. Start `CONTENT-WORKFLOW-011` backend work if import preview is enough for now.
3. Ask the user for real Xiaohongshu and Video Account export files to graduate those presets to `confirmed_sampled`.

## Orchestrator Decision Required

No for this implementation to proceed as provider-level preview.

Yes before any future work that persists native/raw platform fields into Types/Repo or expands confirm import file upload behavior.
