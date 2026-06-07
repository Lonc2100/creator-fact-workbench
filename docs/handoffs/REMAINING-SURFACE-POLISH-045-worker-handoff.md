# REMAINING-SURFACE-POLISH-045 Worker Handoff

Date: 2026-06-05

## Task ID

REMAINING-SURFACE-POLISH-045

## Scope

Fix only the default UI data-only issues found by `LIVE-OPERATOR-WALKTHROUGH-045`:

1. `/content` default editor must not visibly expose raw/source/provenance strings such as `raw=...` or `douyin_creator_center`.
2. `/reviews` default action items must not ask the operator to import WeChat Official Account / 公众号 / 微信后台 data while that platform is paused.
3. `/ui-lab` must not appear as an operator top-level navigation entry. Direct route access can remain.
4. `/` must replace implementation-flavored copy such as `内部指标快照驱动` with business-facing Chinese copy.

Boundaries kept:

- Did not resume or advance WeChat Official Account / backend work.
- Did not promote Bilibili account metrics beyond preview-only.
- Did not change real data, clear databases, delete directories, or call real platform publish APIs.
- Changed UI layer and UI harness test files only.
- Did not edit Service / Runtime / Types / Repo.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAIN-SESSION-HANDOFF-044-next-main-chat.md`
- `docs/handoffs/LIVE-OPERATOR-WALKTHROUGH-045-worker-handoff.md`
- `docs/handoffs/MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md`

Additional context read because user-facing UI was touched:

- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/handoffs/OPERATOR-VIEW-DATA-ONLY-041-orchestrator-decision.md`

## Completed Work

### `/content`

- Added default-display sanitization in `ContentManagement.tsx` for content notes, dashboard/review reasons, version card text, publish history notes, queue next actions, action next actions, and platform-version editor fields.
- If text contains internal provenance markers such as creator-center source ids, `raw`, `source`, `provenance`, `runId`, or `rawDir`, the default UI now shows a business-facing label like:
  - `抖音创作者中心采集内容，来源细节已隐藏。`
- This is UI display behavior only. No database rows were changed.

### `/reviews`

- Added paused-WeChat action filtering in the default review action list.
- Action items whose title/next action/evidence linkage contains `公众号`, `微信后台`, `wechat`, or `wechat_official` no longer appear in the default `下轮行动项` panel.
- The records remain in the database; this only changes default UI visibility.

### `/`

- Added the same paused-WeChat action filtering to the operator home action list so the root page does not surface the same paused-platform import action.
- Replaced `内部指标快照驱动，先看曝光、互动和平台差异。` with `基于已回收的内容数据，先看曝光、互动和平台差异。`
- Replaced `Status` / `Focus` panel eyebrow copy with `内容状态` / `行动重点`.

### Navigation / `/ui-lab`

- Removed `/ui-lab` from the sidebar section navigation.
- Removed the rail bottom shortcut to `/ui-lab`.
- Kept `src/app/ui-lab/page.tsx` and direct route access intact.

### Tests

- Updated `tests/ui-harness.test.mjs` to assert:
  - sidebar navigation no longer includes `/ui-lab`, `界面规范`, or `UI Lab`;
  - root page uses business-facing copy and filters paused-WeChat actions;
  - content UI includes provenance hiding behavior;
  - reviews UI filters paused-WeChat action items.

## Changed Files

- `src/domain/self-media/ui/components/SidebarNav.tsx`
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/domain/self-media/ui/screens/OverviewPage.tsx`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/REMAINING-SURFACE-POLISH-045-worker-handoff.md`

## Verification Commands And Results

- `npm run typecheck`: PASS
- `npm run test:ui-harness`: PASS, 15/15 tests passed
- `git diff --check`: PASS for tracked diffs, with the existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it
- `Invoke-WebRequest http://localhost:3200/dashboard`: PASS, HTTP 200
- `Invoke-WebRequest http://localhost:3200/api/self-media/dashboard`: PASS, HTTP 200
- Read-only visible DOM check with `playwright-core` against live 3200: PASS

Visible DOM check results:

| Page | `/ui-lab` nav hidden | old root copy absent | raw/source provenance absent | WeChat import action absent | Expected business copy present |
| --- | --- | --- | --- | --- | --- |
| `/` | PASS | PASS | PASS | PASS | `基于已回收的内容数据` present |
| `/content` | PASS | PASS | PASS | PASS | `来源细节已隐藏` present |
| `/reviews` | PASS | PASS | PASS | PASS | N/A |
| `/ui-lab` direct route | PASS in nav | PASS | PASS | PASS | Direct internal page still reachable |

## Known Issues / Residual Risk

- The visible DOM check did not capture screenshots; it read live page text and sidebar links only.
- The wider working tree already contains many unrelated modified and untracked files. This worker did not revert or touch unrelated changes.
- `/ui-lab` direct page still says `UI Lab` and `内部组件实验室`, which is acceptable because the route is intentionally internal and no longer appears in the operator navigation.

## Next Recommendation

- Let the Orchestrator review this handoff and, if desired, rerun a screenshot walkthrough for `/`, `/content`, `/reviews`, and `/ui-lab`.
- Keep WeChat paused and Bilibili account metrics preview-only.
- Continue any future polish as UI-only unless the Orchestrator explicitly approves deeper Service/Runtime/Types/Repo work.

## Orchestrator Decision Required

No.
