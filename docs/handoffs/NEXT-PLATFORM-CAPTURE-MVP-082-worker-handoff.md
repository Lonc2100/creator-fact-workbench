# NEXT-PLATFORM-CAPTURE-MVP-082 Worker Handoff

## Decision

- Chose Douyin as the next platform after the Bilibili local export MVP.
- Rationale: official Douyin video-data APIs exist but require user authorization and permission application; local CSV/XLSX import is the most realistic immediate closed loop. Video Account remains deferred because the current project only has `draft_realistic` headers and no confirmed stable content-level creator metrics API.

## Implemented

- Extended `ImportRequest.platformLocalFile.platform` to support `douyin | bilibili`.
- Extended `SelfMediaService.parsePlatformLocalFilePayload()`:
  - `douyin` saves as `douyin_creator_center`;
  - `bilibili` keeps existing `bilibili_creator_center`;
  - both mark provenance as `platform_save`, `trustedScopeEligible=true`, `dataDomain=user_work`;
  - preview mode keeps invalid rows visible for field review, while save only persists confirmable rows.
- Added a first-class `/import` Douyin local file panel:
  - CSV/XLSX upload;
  - paste CSV fallback;
  - field preview;
  - explicit confirm checkbox before save;
  - dashboard link after save;
  - copy states that web login refresh does not auto-capture app data.
- Added `docs/product-specs/next-platform-capture-mvp-082.md`.

## Verification

- `npm run test:ui-harness` passed.
- `npm run test:self-media` passed: 138 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Modified Markdown trailing whitespace check passed.

## Live 3200 Walk

- Rebuilt production assets.
- Started `http://127.0.0.1:3200` against isolated sqlite:
  - `%TEMP%\self-media-next-platform-capture-mvp-082-live.sqlite`
- Browser flow:
  - opened `/import`;
  - uploaded `douyin-creator-export-082b.csv` through `douyin-local-file-upload`;
  - preview returned `source=douyin_creator_center`, `contentCount=1`, `realPreviewRows=1`, `canConfirmSave=true`;
  - checked save confirmation;
  - save returned `run.status=success`, `run.source=douyin_creator_center`, `importedCount=2`;
  - clicked dashboard link;
  - `/dashboard` showed title `AI短片三秒钩子复盘082B`;
  - trusted counts were `trustedContentCount=2`, `trustedMetricSnapshotCount=2` in the isolated DB because an earlier corrected-row attempt already saved one valid Douyin row.
- Restored 3200 to the default startup after validation.

## Notes

- No files were deleted.
- No `.local` large files were staged.
- No real operating DB was polluted by live acceptance data.
