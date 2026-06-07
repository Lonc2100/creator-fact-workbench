# PAUSED-PLATFORM-EVIDENCE-CLEANUP-047 Worker Handoff

Date: 2026-06-05

## Task ID

PAUSED-PLATFORM-EVIDENCE-CLEANUP-047

## Scope

Clean only default user-visible paused WeChat / Official Account evidence residue, focused on `/reviews`.

Target residue from `LIVE-SURFACE-REGRESSION-046`:

- `/reviews` default evidence table could show a row like `wechat 版本存在阻塞或失败，需要先处理发布 checklist。`

Boundaries kept:

- Did not delete database data.
- Did not restore or advance WeChat Official Account / backend work.
- Did not change real data.
- Did not promote Bilibili account metrics; Bilibili account metrics remain preview-only.
- Did not edit Service / Runtime / Types / Repo.
- Did not call real platform publish APIs.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md`
- `docs/handoffs/LIVE-SURFACE-REGRESSION-046-worker-handoff.md`

Additional context read because a user-facing UI file was changed:

- `docs/context/index.md`
- `docs/context/current-state.md`
- `docs/context/engineering-principles.md`
- `docs/context/decisions.md`
- `docs/context/llms.txt`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/architecture/current-stage.md`
- `docs/spec-governance.md`
- `docs/agent-playbook.md`
- `docs/task-board.md`
- `docs/handoffs/OPERATOR-VIEW-DATA-ONLY-041-orchestrator-decision.md`

## Completed Work

### `/reviews` default evidence cleanup

- Added UI-only paused evidence filtering in `EvidenceReviewReport.tsx`.
- New helper `isPausedWechatEvidenceInsight` detects evidence insights whose id, title, finding, or evidence ref ids contain `公众号`, `微信后台`, `wechat`, or `wechat_official`.
- Default review evidence rows now use `operatorEvidenceInsights` instead of raw `snapshot.evidenceInsights`.
- Evidence-row display, evidence gaps, and the visible evidence reference count all use the filtered default set.
- The service output and database rows are unchanged; the paused-platform records remain available to backend state and future diagnostics.

### UI harness coverage

- Updated `tests/ui-harness.test.mjs` to assert:
  - `EvidenceReviewReport` has paused-platform insight filtering;
  - default review evidence derives from `operatorEvidenceInsights`;
  - raw `snapshot.evidenceInsights` is not directly used as the default `evidenceWithRefs` source.

## Changed Files

- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/PAUSED-PLATFORM-EVIDENCE-CLEANUP-047-worker-handoff.md`

## Verification Commands And Results

- `npm run typecheck`: PASS.
- `npm run test:ui-harness`: PASS, 15/15 tests passed.
- `git diff --check`: PASS, with the existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.
- Read-only live DOM check for `http://localhost:3200/reviews`: PASS, HTTP 200 and visible body text no longer matched `wechat 版本存在阻塞或失败`, `wechat_official`, or import-action patterns for `公众号` / `微信后台`.

Live `/reviews` observation:

- Default visible evidence reference count changed from the previous 4 to 3 after filtering out the paused WeChat blocked-platform insight.

## Known Issues / Residual Risk

- The wider working tree already contains many unrelated modified and untracked files from previous work. This task did not review, accept, or revert them.
- This task intentionally leaves Service behavior unchanged. `buildEvidenceInsights` may still produce a paused WeChat insight internally if the first blocked/failed platform version is WeChat; the default `/reviews` UI now filters that out.
- Collapsed advanced review text still contains the raw report content when expanded by an operator. This task targeted default visible review evidence and did not redesign advanced diagnostics.

## Next Recommendation

- Treat paused-platform evidence filtering as part of the default UI data-only baseline for `/reviews`.
- If future requirements demand that advanced diagnostics also suppress paused platform strings, split that into a separate UI diagnostics-redaction task.
- Keep WeChat paused unless the user explicitly reopens that scope.

## Orchestrator Decision Required

No.
