# IMPORT-PREVIEW-UI-012 Worker Handoff

## Task ID

IMPORT-PREVIEW-UI-012

## Role And Scope

UI/API typing Worker.

Goal: display `realPreviewRows` from `IMPORT-REAL-011` on the import preview page, with field mapping, mapping confidence, native metrics, row warnings, and `canConfirmSave` status.

This round did not change persistence, Repo, dashboard, reviews, calendar, review action dedupe/history, publish workflow, or live platform API behavior.

## Required Reading Completed

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/IMPORT-REAL-011-orchestrator-review.md`
- `docs/product-specs/import-real-011.md`

Additional context read:

- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/ui-harness/ARCHITECTURE.md`

Browser skill read:

- `C:\Users\Administrator\.codex\plugins\cache\openai-bundled\browser\26.527.31326\skills\control-in-app-browser\SKILL.md`

## Completed Work

### Preview Response Types

Updated `src/domain/self-media/types/self-media-types.ts`:

- Added `ImportMappingConfidence`.
- Added `RealImportPreviewRow`.
- Added optional `realPreviewRows?: RealImportPreviewRow[]` to `ImportPreviewResult`.

This is a preview response type only. No durable Types/Repo storage shape was added.

### Import Preview UI

Updated `src/domain/self-media/ui/screens/ImportPage.tsx`:

- Converted the import screen to a client component.
- Added real preview request flow to `/api/self-media/import/preview`.
- Kept CSV preview path and added file preview request support for uploaded CSV/XLSX through the existing preview API.
- Added a "真实字段识别" panel that displays:
  - row number;
  - platform;
  - mapped normalized fields;
  - mapping confidence;
  - native metrics;
  - raw field sample;
  - row warnings;
  - `canConfirmSave` state.
- Kept existing `ImportDiffTable` visible below the real preview panel.

Updated `src/app/globals.css`:

- Added import-preview-specific layout, chip, confidence, warning, and responsive styles.

Updated `src/app/import/page.tsx`:

- Changed the import screen import from the UI barrel to the direct screen path.
- Reason: after `ImportPage` became a client component, the local dev server returned 500 on `/import` through the barrel re-export path. Direct screen import fixed the route while still respecting app wiring boundaries.

## Screenshot Evidence

Saved browser screenshot:

```text
.local/import-preview-ui-012.png
```

Visual check:

- Screenshot shows `/import`.
- `真实字段识别` panel displays two rows.
- First row shows `官方字段`, native metrics, and `可确认保存`.
- Second row shows row warning and `暂不可保存`.
- Existing Diff preview remains visible.

## Changed Files

Task-specific changes:

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `src/app/import/page.tsx`
- `docs/handoffs/IMPORT-PREVIEW-UI-012-worker-handoff.md`

Evidence file:

- `.local/import-preview-ui-012.png`

Scope notes:

- `tests/self-media-contract.test.ts` was already dirty from prior import-real work; this Worker did not edit it.
- Existing unrelated dirty/untracked files were not reverted or cleaned.
- No files or directories were deleted.
- No batch deletion was performed.

## Verification Commands And Results

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
- test:self-media PASS, 27 tests
- test:entropy PASS
- test:agent-trajectory PASS
- template:doctor PASS

```text
git diff --check
PASS
```

Browser verification:

```text
http://localhost:3200/import
PASS after direct screen import fix
```

Screenshot:

```text
.local/import-preview-ui-012.png
PASS, file exists and was visually inspected
```

## Known Issues / Limits

- This UI task displays `realPreviewRows` but still does not confirm-save native/raw fields. That remains intentionally out of scope.
- The file upload UI sends uploaded files only to preview. Confirm import file upload behavior was not added.
- The `StatusBadge` in the real preview panel shows a red status when any row is not confirm-saveable; this is a conservative preview signal, not an import failure.
- `src/app/globals.css` already had broad dirty changes in the worktree, so diff stat includes pre-existing style churn outside this task. This Worker only added import-preview-specific selectors.

## Next Recommendation

Orchestrator can now proceed to:

1. Review the screenshot and import UI behavior.
2. Start `CONTENT-WORKFLOW-011` backend implementation if import preview UI is acceptable.
3. Ask the user for real Xiaohongshu and Video Account exports to graduate draft-realistic presets.

## Orchestrator Decision Required

No for this UI/API typing task.

Yes before any future task that persists native/raw platform fields or expands confirm import file upload behavior.
