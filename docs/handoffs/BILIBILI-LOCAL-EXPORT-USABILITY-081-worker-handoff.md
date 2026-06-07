# BILIBILI-LOCAL-EXPORT-USABILITY-081 Worker Handoff

## Scope

- Polished the Bilibili local export recovery MVP on `/import`.
- Added first-class CSV/XLSX upload next to the paste-CSV fallback.
- Added preview reset on input changes, explicit save confirmation, and a dashboard link after save.
- Kept the safety boundary visible in user-facing Chinese copy: saves do not persist login credentials, request headers, or original requests.

## Files Changed

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Adds `bilibili-local-file-upload`, file-to-base64 handling for XLSX, CSV file text handling, preview reset, confirmation checkbox, and dashboard link.
- `src/app/globals.css`
  - Adds compact styling for the confirmation row.
- `tests/ui-harness.test.mjs`
  - Locks the upload, confirm, save, and dashboard-link affordances.
- `tests/self-media-contract.test.ts`
  - Adds Bilibili local XLSX preview/save coverage and verifies saved metric snapshots do not persist raw upload/request details.

## Verification

- `npm run test:ui-harness` passed.
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 136 tests.
- `npm run build` passed.
- `git diff --check` passed.
- Markdown trailing whitespace check over modified docs passed.

## Live 3200 Walk

- Rebuilt production assets and restarted `http://127.0.0.1:3200`.
- Used isolated sqlite for live validation to avoid polluting the operating DB:
  - `%TEMP%\self-media-bilibili-local-export-usability-081-live-fresh.sqlite`
- Browser flow:
  - Opened `/import`.
  - Uploaded `bilibili-creator-export-081d.csv` through `bilibili-local-file-upload`.
  - Preview returned `source=bilibili_creator_center`, `contentCount=1`, `realPreviewRows=1`, `canConfirmSave=true`.
  - Checked save confirmation.
  - Saved successfully with `run.status=success`, `run.source=bilibili_creator_center`, `importedCount=2`.
  - Clicked dashboard link to `/dashboard`.
  - Dashboard showed the imported title and trusted counts:
    - `trustedContentCount=1`
    - `trustedMetricSnapshotCount=1`
    - weekly trusted counts also `1 / 1`.

## Notes

- A first live attempt used a title containing `验收`; the system correctly classified it outside trusted dashboard scope. This confirms the existing anti-pollution rule is active.
- No files were deleted.
- No `.local` large files were staged or committed.
