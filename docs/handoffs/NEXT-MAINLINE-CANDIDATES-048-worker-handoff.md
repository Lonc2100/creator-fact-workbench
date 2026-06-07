# NEXT-MAINLINE-CANDIDATES-048 Worker Handoff

Date: 2026-06-05

## Task ID

NEXT-MAINLINE-CANDIDATES-048

## Scope

Read-only product review to propose the next small 048 mainline candidates after the accepted 045 PRD gap matrix and 046/047 UI closure.

Boundaries kept:

- Did not change business code.
- Did not change local data.
- Did not start a new planning loop.
- Did not resume WeChat Official Account / backend work.
- Did not promote Bilibili account metrics beyond preview-only.
- Did not call real platform APIs.
- Did not delete files or directories.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md`
- `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md`
- `docs/handoffs/MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md`

Additional context read to align the 046/047 UI closure and project baseline:

- `docs/handoffs/LIVE-SURFACE-REGRESSION-046-worker-handoff.md`
- `docs/handoffs/REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047-worker-handoff.md`
- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`

Note: no external solution research was performed. This was a no-code internal product-surface sequencing review based on accepted handoffs and PRD state, not a new medium/large implementation or design problem.

## Product Baseline Used

- Four active content-level platforms remain accepted: Douyin, Xiaohongshu, Video Account, and Bilibili archives.
- WeChat Official Account / backend remains paused.
- Bilibili account-level metrics remain preview-only.
- Default operator UI must remain data-only: real operating metrics, charts, tables, evidence summaries, drafts, schedule state, and next actions by default.
- Diagnostics, internal paths, run ids, commands, raw evidence, smoke/demo rows, and developer wording remain hidden, collapsed, or in explicit debug/all-local views.
- 046 confirmed the 045 surface polish held across `/dashboard`, `/`, `/content`, `/reviews`, and `/ui-lab` navigation.
- 047 confirmed default `/reviews` evidence tables no longer show paused WeChat/公众号/微信后台 blocking evidence.

## Candidate Ranking

Recommended next 048 tasks, in order:

1. `ACTION-QUEUE-ERGONOMICS-048`
2. `CALENDAR-ERGONOMICS-048`
3. `CONTENT-WORKBENCH-QUIET-ACTIONS-048`
4. `SECONDARY-SURFACE-POLISH-048`

All four are small product-polish tasks. None should reopen core platform/data modeling by default.

## Candidate Evaluation

### 1. ACTION-QUEUE-ERGONOMICS

Recommended task ID: `ACTION-QUEUE-ERGONOMICS-048`

User value:

- Turns accepted but dense action lists into a more manageable operator queue.
- Helps the user see the next few high-priority actions without being overwhelmed by historical duplicates or long grouped lists.
- Builds directly on accepted action-item workflow without changing trust boundaries or auto-converting tasks.

Suggested scope:

- UI-only refinement for `/dashboard` action panel and/or `/reviews` action section.
- Add tighter grouping, pagination, progressive disclosure, clearer status filters, or a "today / high priority / waiting" operating slice.
- Preserve user-triggered conversion only; no auto-conversion into drafts.

Risk:

- Medium-low. Main risk is hiding too much actionable information or breaking existing action status controls.
- Must avoid changing action generation, trusted evidence validation, or action-to-content service behavior.

Suitable for parallel work:

- Yes, if isolated to action queue UI/harness files and not run in parallel with browser E2E tasks that share dev servers.
- Can run separately from calendar/content polish if each worker owns one surface.

Needs core-layer changes:

- No by default. Keep to UI and UI harness assertions.
- Stop and ask Orchestrator if requirements need new action fields, new persistence, new queue semantics, or changed status transitions.

Recommended acceptance commands:

- `npm run typecheck`
- `npm run test:ui-harness`
- `npm run smoke:operating-action-to-content`
- `git diff --check`
- Optional live read-only check on `http://localhost:3200/dashboard` and `http://localhost:3200/reviews`.

### 2. CALENDAR-ERGONOMICS

Recommended task ID: `CALENDAR-ERGONOMICS-048`

User value:

- Makes real scheduling work easier to scan and operate after the accepted 044 calendar workflow.
- Improves date focus, pending draft discovery, drag target affordance, and scheduled/unscheduled separation.
- Helps the calendar feel like an operating surface rather than a visual proof.

Suggested scope:

- UI-only calendar polish for `/calendar`.
- Improve pending queue density, date selection affordance, empty-day treatment, and drag/drop copy.
- Preserve current rule: scheduling/rescheduling updates content/platform-version/queue state only and does not create publish ledger records.

Risk:

- Medium. Calendar interactions are easy to regress because drag scheduling and manual publish confirmation have existing behavioral boundaries.
- Must not call real publish APIs or treat publish ledger rows as trusted metric evidence.

Suitable for parallel work:

- Yes, but avoid running calendar E2E/smoke in parallel with other browser gates or dev-server tasks.
- Best assigned to one worker because calendar CSS/layout and interaction tests can overlap.

Needs core-layer changes:

- No for visual/interaction polish.
- Stop and ask Orchestrator if new schedule state, queue semantics, or publish-ledger behavior is requested.

Recommended acceptance commands:

- `npm run typecheck`
- `npm run test:ui-harness`
- `npm run smoke:draft-review-ui-e2e`
- `git diff --check`
- Optional live read-only check on `http://localhost:3200/calendar`.

### 3. CONTENT-WORKBENCH-QUIET-ACTIONS

Recommended task ID: `CONTENT-WORKBENCH-QUIET-ACTIONS-048`

User value:

- Reduces visual noise in `/content` while preserving trusted-scope controls and draft review utility.
- Makes exclusion/status actions feel like operator controls rather than alarming primary calls to action.
- Complements the accepted 045 cleanup that already hid raw/source/provenance text.

Suggested scope:

- UI-only refinement for `/content` action controls.
- Move heavy "不计入看板" / restore / status controls into quieter menu, segmented status, or compact row actions.
- Keep trusted-scope labels business-readable and keep all-local/debug rows behind explicit filters.

Risk:

- Low-medium. Main risk is making trusted-scope curation less discoverable or accidentally changing the default operating scope.
- Must not delete rows, migrate data, or alter dashboard/review trust totals.

Suitable for parallel work:

- Yes. This can run in parallel with action queue or secondary surface polish if scoped to `/content`.
- Do not run `e2e:content-curation` in parallel with platform operations E2E.

Needs core-layer changes:

- No by default. This should remain UI-only.
- Stop and ask Orchestrator if the requested quiet action model needs new curation state or repo/service behavior.

Recommended acceptance commands:

- `npm run typecheck`
- `npm run test:ui-harness`
- `npm run e2e:content-curation`
- `git diff --check`
- Optional live read-only check on `http://localhost:3200/content`.

### 4. SECONDARY-SURFACE-POLISH

Recommended task ID: `SECONDARY-SURFACE-POLISH-048`

User value:

- Keeps exposed secondary routes from undercutting the accepted data-only product feel.
- Good cleanup target for `/leads`, overview details, and any directly reachable but non-primary surfaces that still show old implementation wording or noisy internal terms.
- Protects the main operator experience from "one page still feels like a prototype" drift.

Suggested scope:

- Read visible navigation and secondary routes, then apply UI/copy-only polish where a page is already exposed to operators.
- Keep `/ui-lab` out of operator navigation; direct access may remain internal.
- Do not productize new modules or resurrect older PRD areas unless Orchestrator explicitly selects them.

Risk:

- Low if copy/layout-only.
- Medium if the task expands into productizing ideas/leads or adding new workflows; that would become a new PRD, not a small polish task.

Suitable for parallel work:

- Yes for read-only audit and copy/UI cleanup on routes that do not overlap with `/dashboard`, `/content`, `/calendar`, or `/reviews`.
- Not ideal in parallel if the worker starts changing shared navigation/components also used by other UI workers.

Needs core-layer changes:

- No by default.
- Stop and ask Orchestrator if a secondary surface needs new data, workflow state, persistence, or API behavior.

Recommended acceptance commands:

- `npm run typecheck`
- `npm run test:ui-harness`
- `git diff --check`
- Optional live read-only walkthrough on `/`, `/leads`, and direct `/ui-lab`.

## Recommended 048 Sequence

Use a small, non-looping sequence:

1. Start with `ACTION-QUEUE-ERGONOMICS-048` because it has the highest daily operator value and was already called out by the 045 gap matrix as density pain.
2. Run `CALENDAR-ERGONOMICS-048` as the next focused workflow polish because the calendar is accepted but still benefits from operating affordance work.
3. Run `CONTENT-WORKBENCH-QUIET-ACTIONS-048` if the user wants another low-risk UI pass around trusted-scope controls.
4. Keep `SECONDARY-SURFACE-POLISH-048` as a short audit/polish pass, especially if `/leads` or overview still appears in regular navigation.

## Not Recommended As 048 Mainline

- WeChat Official Account / backend work: explicitly paused.
- Durable Bilibili account snapshot save: not approved; account metrics remain preview-only.
- Live platform publish APIs: not implemented and outside the accepted local manual confirmation boundary.
- New observability stack, multi-user/cloud, Postgres, or third-party task manager integration: too broad for this 048 continuation.
- Diagnostics redaction beyond default visible UI: valid future work only if the Orchestrator explicitly wants collapsed advanced diagnostics cleaned too.

## Completed Work

- Evaluated the required candidate areas:
  - `ACTION-QUEUE-ERGONOMICS`
  - `CALENDAR-ERGONOMICS`
  - `CONTENT-WORKBENCH-QUIET-ACTIONS`
  - `SECONDARY-SURFACE-POLISH`
- Produced 4 small executable candidate task recommendations with user value, risk, parallel suitability, core-layer need, and acceptance commands.
- Wrote this durable handoff.

## Changed Files

- `docs/handoffs/NEXT-MAINLINE-CANDIDATES-048-worker-handoff.md`

## Verification Commands And Results

- `git diff --check`: PASS, with existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.

## Known Issues / Residual Risk

- This is a docs-only product sequencing review, not a live browser walkthrough.
- The wider working tree already contains unrelated modified and untracked files from previous work. This task did not review, accept, or revert them.
- Candidate acceptance commands may need adjustment if a future Worker narrows or expands a task's actual scope.

## Next Recommendation

- Have the Orchestrator pick one candidate, preferably `ACTION-QUEUE-ERGONOMICS-048`, and issue it as a scoped Worker task.
- Keep all 048 candidates UI-first unless the Orchestrator explicitly approves core-layer changes.

## Orchestrator Decision Required

No for this read-only candidate review.

Yes for selecting which candidate task to execute next.
