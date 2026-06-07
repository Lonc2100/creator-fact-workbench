# IMPORT-PREVIEW-UI-012 Orchestrator Review

## Decision

Accepted.

The Worker made the real import preview visible on `/import` without changing persistence, dashboard, reviews, calendar, review action dedupe/history, publish workflow, or live platform API behavior.

## Files Reviewed

- `docs/handoffs/IMPORT-PREVIEW-UI-012-worker-handoff.md`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/import/page.tsx`
- `src/app/globals.css`
- `.local/import-preview-ui-012.png`

## Verification

- Worker reported `npm run typecheck`: PASS.
- Worker reported `npm run verify:harness`: PASS.
- Worker reported `git diff --check`: PASS.
- Orchestrator re-ran `git diff --check`: PASS.
- Orchestrator visually inspected `.local/import-preview-ui-012.png`.

## Accepted Behavior

- Import page now shows a `真实字段识别` panel.
- The panel exposes row number, platform, normalized field mapping, mapping confidence, native metrics, raw field samples, row warnings, and confirm-save eligibility.
- Existing diff preview remains visible below the real preview panel.
- Uploaded CSV/XLSX files are used for preview only; confirm import file upload was not added.
- `ImportPreviewResult.realPreviewRows` is now formalized as an optional preview response field.

## Review Notes

- `src/domain/self-media/types/self-media-types.ts` includes unrelated WeChat sync type changes from earlier dirty work. This review only accepts the import preview typing and UI behavior.
- The route import in `src/app/import/page.tsx` now points directly to `ImportPage` because the screen became a client component. This is acceptable as an app-wiring fix for this page.
- The page is now practically usable for previewing real platform exports, but it still does not persist native/raw fields.

## Current Stage

The import pipeline is now usable at the preview level:

1. Provider parses richer CSV/XLSX exports.
2. API returns normalized mappings plus native/raw preview metadata.
3. UI displays confidence, warnings, native metrics, and confirm eligibility.

The next backend phase can move to content/publish workflow.

## Next Recommended Task

Start exactly one backend implementation Worker:

- `CONTENT-WORKFLOW-011`

Do not start review action dedupe/history implementation yet. Review actions should wait until content/publish evidence contracts are stable.
