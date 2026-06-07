# PLATFORM-IMPORT-UX-021 Worker Handoff

Status: completed
Date: 2026-06-04
Worker: Codex

## Scope

Goal was to improve the `/import` platform operation UX so the existing save/smoke entrypoints are operationally usable without adding browser collection, Bilibili save, WeChat backend, raw payload display, or automated login.

Required reading completed:

- `AGENTS.md`
- `docs/handoffs/PLATFORM-IMPORT-OPERATIONS-020-orchestrator-review.md`
- `docs/handoffs/IMPORT-STATUS-UI-019-orchestrator-review.md`
- `docs/handoffs/PLATFORM-OPS-019-orchestrator-review.md`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/api/self-media/platform-imports/operations/route.ts`

Also followed the repository context reading chain from `AGENTS.md`.

## Changes Made

### Import operation refresh

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Added local dashboard snapshot state for the import page.
  - Platform operation success now refreshes `/api/self-media/dashboard` and updates dashboard/import status data on the current page.
  - Partial operation responses with successful summaries also refresh dashboard data.
  - Import diff table and platform import status panel now render from the refreshed snapshot.

### Independent operation loading

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Replaced single shared operation loading key with per-operation running keys.
  - Each platform save button has independent loading/disabled state.
  - `save_smoke` disables related platform buttons during the three-platform smoke run.
  - No browser collection buttons were added.
  - No Bilibili, WeChat, or Official Account operation entrypoints were added.

### Clear raw capture errors

- `src/domain/self-media/types/self-media-types.ts`
  - Extended `PlatformImportOperationSummary` with safe display fields:
    - `label`
    - `errorMessage`
    - `rawDir`
    - `discoverCommand`

- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added platform display labels and discover command hints for:
    - `douyin_creator_center`
    - `xiaohongshu_creator_center`
    - `video_account_creator_center`
  - Added structured handling for missing/empty raw capture directories.
  - Missing/empty raw capture now returns a safe failed operation summary instead of surfacing an opaque generic failure.
  - Error summaries include platform, missing directory, and the discover command to run first.
  - Raw payloads are still not stored or returned.

### Readable warning summaries

- `src/domain/self-media/ui/screens/ImportPage.tsx`
  - Operation results now render as compact summaries with separated warning lines.
  - Missing raw capture guidance is rendered as explicit fields:
    - platform label
    - missing directory
    - discover command
  - Warnings no longer collapse into one dense paragraph.

### Layout tightening

- `src/app/globals.css`
  - Tightened platform operation layout spacing and padding.
  - Reduced large blank areas in the operation/status section.
  - Kept 009/019 standards: compact, low whitespace, no marketing page, no large nested cards, lighter typography.
  - Added compact styles for operation summaries, warning lists, and missing raw guidance.

### Contract tests

- `tests/self-media-contract.test.ts`
  - Updated platform operation contract expectation so missing raw capture produces a safe failed summary with label, raw directory, discover command, and clear error message.

## Files Touched In This Task

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/PLATFORM-IMPORT-UX-021-worker-handoff.md`

Note: the worktree already contained many unrelated modified/untracked files before this worker pass. Those were not reverted or normalized.

## Verification

- `npm run test:self-media` passed
  - 48 tests passed
- `npm run typecheck` passed
- `npm run verify:harness` passed
  - includes typecheck, context check, architecture lint, structure/reference/UI/self-media/entropy/agent trajectory tests, and template doctor
- `git diff --check` passed before handoff creation
- UI screenshot saved:
  - `.local/platform-import-ux-021.png`
  - Checked `/import` after triggering a platform operation.
  - Confirmed the new operation/status area renders without a large abnormal blank region.
  - Confirmed operation completion text and platform summary are visible.

## Boundary Checks

- No real browser capture button added.
- No automated login added.
- No raw payload accepted or displayed.
- No Bilibili save operation entrypoint added.
- No WeChat/Official Account backend entrypoint added.
- No batch deletion performed.

## Orchestrator Notes

- The UI now refreshes dashboard/import status after platform operations, but the exact freshness depends on the operation response and dashboard endpoint returning current persisted facts.
- Missing and empty raw capture states are treated as safe operation summaries, so operators can see what to run next without inspecting logs.
- Main session should review because this task intentionally touched Types, Runtime, UI, CSS, and tests, and the surrounding worktree is already very dirty.

Orchestrator decision required: yes
