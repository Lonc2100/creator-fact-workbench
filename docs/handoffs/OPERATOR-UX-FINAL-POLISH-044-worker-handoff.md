# OPERATOR-UX-FINAL-POLISH-044 Worker Handoff

## Task

Light final product copy and visual polish across `/dashboard`, `/content`, `/calendar`, `/import`, and `/reviews`.

Boundaries kept:
- no data-logic changes;
- no trusted-scope widening;
- no WeChat reactivation;
- no real platform API calls;
- advanced diagnostics remain collapsed and can still contain internal details.

## Completed Work

- Converted remaining default-page English/operator-facing copy into Chinese operating-backoffice language:
  - `/dashboard`: `Data actions`, `Weekly summary`, `Post-import actions`, `Operating tasks`, `Source / Platform`, and dashboard/review wording are now Chinese.
  - `/content`: content format enums now render as `短视频` / `图文` etc.; trusted-scope empty copy uses `创作者中心`.
  - `/calendar`: `Today` now renders as `今天`; repeated publish API/evidence explanations were compressed.
  - `/import`: advanced panel eyebrows are Chinese; `native metrics` display copy is now `原生字段`; visible source wording uses `创作者中心`.
  - `/reviews`: evidence/history/window/action eyebrows are Chinese; best platform renders as platform label such as `抖音`; Bilibili `archives` wording renders as `稿件内容级指标`.
- Made `/content` trusted-scope exclusion action quieter:
  - "不计入看板" became "不进看板".
  - the active exclusion action now uses the ghost button variant instead of danger.
- Compressed repeated "not metric evidence / no platform API" helper text into lighter product copy:
  - content publish history and calendar ledger now say platform metrics still come from creator-center data.
  - publish confirmation strips now say they record human results for scheduling/review.
- Localized shared shell copy:
  - sidebar subtitle is now `自媒体运营后台`;
  - system nav label is now `界面规范`;
  - rail aria labels are Chinese.
- Fixed a typecheck break in `/calendar` route by passing the required content workbench snapshot to `CalendarPage`.
  - This only wires existing data already used by the calendar UI and does not alter trusted dashboard/review totals.
- Added UI harness coverage for this polish:
  - prevents old English eyebrows from returning;
  - prevents raw content format/platform ids from leaking into default UI;
  - verifies quiet `/content` trusted-scope button variant;
  - verifies compressed publish-history/ledger wording;
  - verifies sidebar copy is localized.

## Changed Files

Main files touched in this task:
- `src/app/calendar/page.tsx`
- `src/domain/self-media/ui/components/SidebarNav.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `tests/ui-harness.test.mjs`

The worktree already contains many prior modified/untracked files from earlier tasks; those were not cleaned or reverted.

## Screenshots

Saved screenshots with an isolated temporary dev server and sanitized local fixture DB:

- `.local/operator-ux-final-polish-044/dashboard.png`
- `.local/operator-ux-final-polish-044/content.png`
- `.local/operator-ux-final-polish-044/calendar.png`
- `.local/operator-ux-final-polish-044/import.png`
- `.local/operator-ux-final-polish-044/reviews.png`

Screenshot run details:
- temporary URL: `http://127.0.0.1:3320`
- isolated DB: `.local/operator-ux-final-polish-044/self-media-2026-06-05T06-34-27-111Z.sqlite`
- isolated `NEXT_DIST_DIR`: `.next-operator-ux-final-polish-044-2026-06-05T06-34-27-111Z`
- temporary server was stopped after capture.

## Verification

- `npm run typecheck` - PASS
- `npm run test:ui-harness` - PASS, 15 tests
- `npm run test:self-media` - PASS, 122 tests
- `npm run verify:harness` - PASS
  - includes typecheck, context check, architecture lint, structure/reference/UI/self-media/entropy/trajectory/template-doctor checks.
- `git diff --check` - PASS
  - emitted a warning that `tsconfig.json` CRLF will be replaced by LF when Git touches it; no whitespace errors were reported.

## Known Issues / Notes

- Screenshots are visual QA artifacts from an isolated sanitized fixture DB, not proof of live 3200 operating DB data.
- `UiLabPage` still uses `UI Lab` and other component-lab English copy inside the `/ui-lab` route itself; this task scope was `/dashboard`, `/content`, `/calendar`, `/import`, and `/reviews`. The shared sidebar label now shows `界面规范`.
- Collapsed advanced diagnostics can still contain commands, paths, source IDs, and other internal details by design.
- Existing service/config/test contract strings may still use internal source keys such as `dashboard/review`, `creator-center`, or `archives`; this task only changed user-facing UI display copy.

## Next Recommendation

Orchestrator should inspect the five screenshots and decide whether this closes the operator-facing copy polish, especially:
- whether `/content` "不进看板" as a ghost action is quiet enough;
- whether the remaining advanced diagnostics labels are acceptable when collapsed;
- whether `/ui-lab`, `/overview`, and `/leads` should get a separate polish task.

## Orchestrator Decision Required

Yes.
