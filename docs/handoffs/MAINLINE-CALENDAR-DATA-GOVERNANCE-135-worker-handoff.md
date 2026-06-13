# MAINLINE-CALENDAR-DATA-GOVERNANCE-135

Started: 2026-06-14T00:34:56+08:00
Finished: 2026-06-14T00:49:00+08:00
Elapsed: about 14 minutes
Workload class: normal
<15min explanation or extra-depth pass>: Scope was narrow and followed the existing 092 calendar hygiene path. Extra-depth pass included prior handoff review, strict live 3200 `/calendar` text scan, and a read-only governance report over the local sqlite database.

## Goal

Prevent test, acceptance, backend log, historical import, raw/capture/evidence, and unrelated local drafts from entering the default publish calendar. The default calendar should only show user-owned works that are genuinely prepared for future publishing.

## External Reference Check

- FullCalendar `eventDataTransform` documents the mature calendar pattern of transforming source data and returning `false` to discard non-displayable events before they reach the calendar view: https://fullcalendar.io/docs/eventDataTransform
- GitHub Spec Kit reinforces spec-first implementation with explicit tasks and quality checks before coding: https://github.github.com/spec-kit/index.html

I used these as a reference pattern only. The implementation stayed inside the local PRD boundary: eligibility before display, non-destructive quarantine/reporting, and regression tests.

## Completed Work

- Tightened service-level default publish-calendar eligibility in `src/domain/self-media/service/self-media-service.ts`.
  - Existing gates still require `dataDomain=user_work`, `workOwnership=user_owned_work`, an explicit `scheduledAt`, and draft/needs_review/scheduled version status.
  - Added `calendarDataGovernanceTextPattern` and `isCalendarDataGovernancePollutionText` to exclude backend-log/system-log/test/acceptance/capture/import/run/raw/evidence markers even if a record is mistakenly labeled `user_work`.
- Tightened `CalendarPage` as a UI second line of defense.
  - Default visible calendar items and pending scheduling rows now reuse the governance marker check.
  - The isolation panel can derive excluded scheduled records from `content-workbench`, not only from already-default dashboard calendar items.
  - Isolation cards no longer render raw content titles; they show sanitized "已隔离排期" rows with platform, time, status, and local-report guidance.
- Added `scripts/calendar-data-governance-report.mjs`.
  - Read-only sqlite scan using `new DatabaseSync(dbPath, { readOnly: true })`.
  - Writes local reports to `.local/calendar-data-governance-135/report.json` and `.local/calendar-data-governance-135/report.md`.
  - Does not delete files, does not write database rows, and does not store content titles/bodies/scripts in the report.
- Added regression coverage.
  - `tests/self-media-contract.test.ts` now creates future scheduled records that are incorrectly stamped as `user_work` but contain system-log/test/capture/import/run/raw/evidence markers, and proves they do not enter `dashboard.calendarItems`.
  - `tests/ui-harness.test.mjs` verifies the new service/UI governance markers and the read-only/non-destructive report script boundary.

## Changed Files

- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `scripts/calendar-data-governance-report.mjs`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-CALENDAR-DATA-GOVERNANCE-135-worker-handoff.md`

## Verification

- `git diff --check` PASS.
- `node scripts/calendar-data-governance-report.mjs` PASS.
  - Report path: `.local/calendar-data-governance-135/report.json`
  - Summary: scheduledVersionCount=195, eligibleFutureCount=0, eligiblePastCount=4, quarantinedScheduledCount=191, quarantinedFutureCount=0.
- `npm run typecheck` PASS.
- `npm run test:self-media` PASS, 160 tests.
- `npm run test:ui-harness` PASS, 20 tests.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS, healthy port 3200.
- Strict 3200 `/calendar` read check PASS.
  - HTTP 200.
  - Primary calendar page text detected.
  - Script/style/tag-stripped rendered text had no `capture`, `import`, `run`, `raw`, `evidence`, `后台日志`, `系统日志`, `测试稿`, `验收稿`, `历史导入`, or `已发布指标数据`.
  - Live calendar card count was 0, matching the governance report's `eligibleFutureCount=0`.

## Boundaries Preserved

- No files or directories were deleted.
- No database rows were deleted, migrated, cleared, or modified by the governance report.
- No real platform save was performed.
- WeChat was not reopened.
- Bilibili account durable totals were not touched.
- No Repo/Runtime/API route expansion was needed beyond the allowed calendar eligibility and UI surface.
- Existing unrelated dirty baseline files were left untouched:
  - `docs/generated/template-doctor-report.md`
  - `scripts/smoke-self-media.mjs`
  - `src/domain/self-media/ui/screens/LeadsPage.tsx`
  - `src/domain/self-media/ui/screens/UiLabPage.tsx`
  - `tests/agent-trajectory.test.mjs`
  - existing untracked handoffs/scripts listed in NightOps state.

## Known Issues

- The live local DB currently has no eligible future default-calendar items. That is not a failure for this task; it means the default `/calendar` is empty rather than polluted.
- The report found 191 scheduled records that would be quarantined under the stricter rules. They were not removed or rewritten. Orchestrator can inspect the local report before deciding whether any future data curation task is needed.

## Next Recommendation

Orchestrator can review the scoped diff and accept task 135. A later task can decide whether to formalize `scripts/calendar-data-governance-report.mjs` into a package script, but this worker avoided `package.json` because it was outside the PRD's allowed file list.

Orchestrator decision required: No.
