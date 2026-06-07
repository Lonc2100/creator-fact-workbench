# WORKTREE-ACCEPTANCE-MATRIX-048 Worker Handoff

Date: 2026-06-05

## Task ID

WORKTREE-ACCEPTANCE-MATRIX-048

## Scope

Build a read-only acceptance matrix from current accepted platform status and the dirty worktree audit.

Boundaries kept:

- Did not change code.
- Did not change data.
- Did not delete files or directories.
- Did not stage, commit, or roll back anything.
- Wrote only this handoff file.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md`

Additional context read because this is an acceptance/cleanup audit:

- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/quality-execution-system.md`
- `docs/golden-principles.md`

## Method

- Used `CURRENT-PLATFORM-STATUS.md` as the accepted-state index.
- Prioritized accepted 041-047 handoffs and the four-platform provider/import/save-smoke chain.
- Cross-checked dirty files from `DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md`, `git diff --name-only`, and `git ls-files --others --exclude-standard`.
- Extracted file and verification evidence from the relevant worker/auditor/orchestrator handoffs.

Important limitation: this matrix attributes files by accepted handoff lineage and path. It does not prove every line in a broad dirty diff belongs to the accepted task. Broad shared files still need bundle-level review before staging.

## Dirty Inventory Used

From the 048 dirty audit baseline:

- Tracked modified files: 48.
- Expanded untracked files: 402.
- Tracked diff shortstat: 48 files changed, 19158 insertions, 928 deletions.
- Core-layer dirty files exist across Types, Config, Repo, Providers, Service, and Runtime.

Current untracked inventory includes one additional handoff from later work:

- `docs/handoffs/NEXT-MAINLINE-CANDIDATES-048-worker-handoff.md`

That file is project-related but not part of this acceptance matrix because it is not referenced by `CURRENT-PLATFORM-STATUS.md`.

## 041-047 Accepted Task Matrix

| Task | Accepted status | Handoff evidence | Files attributed | Verification evidence |
| --- | --- | --- | --- | --- |
| CONTENT-PUBLISH-HISTORY-041 | Accepted as read-only `/content` capability; default UI needed later cleanup | `CONTENT-PUBLISH-HISTORY-041-worker-handoff.md`, `CONTENT-PUBLISH-HISTORY-041-orchestrator-review.md` | `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/ui/patterns/ContentManagement.tsx`, `src/domain/self-media/ui/screens/ContentPage.tsx`, `src/domain/self-media/ui/screens/CalendarPage.tsx`, `src/app/globals.css`, `tests/self-media-contract.test.ts`, `tests/ui-harness.test.mjs`, `scripts/draft-review-ui-e2e-039.mjs` | `npm run smoke:draft-review-ui-e2e` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| DAILY-OPS-REPORT-CONSOLIDATION-041 | Accepted as internal safe-report consolidation, not default dashboard UI | `DAILY-OPS-REPORT-CONSOLIDATION-041-worker-handoff.md`, `DAILY-OPS-REPORT-CONSOLIDATION-041-orchestrator-review.md` | `package.json`, `scripts/daily-ops-redacted-summary.mjs`, `tests/self-media-contract.test.ts`, `src/domain/self-media/ui/screens/DashboardPage.tsx` | `npm run report:daily-ops:safe` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| OPERATOR-HOME-041 | Not accepted as final default dashboard; accepted only as intermediate diagnostic prototype | `OPERATOR-HOME-041-worker-handoff.md`, `OPERATOR-HOME-041-orchestrator-review.md` | `src/domain/self-media/ui/screens/DashboardPage.tsx`, `tests/ui-harness.test.mjs` | Worker verification passed, but orchestrator review explicitly says not final product acceptance |
| DASHBOARD-DATA-ONLY-042 | Accepted default `/dashboard` data-first pattern | `DASHBOARD-DATA-ONLY-042-worker-handoff.md`, `DASHBOARD-DATA-ONLY-042-orchestrator-review.md` | `src/domain/self-media/ui/screens/DashboardPage.tsx`, `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`, `src/app/globals.css`, `tests/ui-harness.test.mjs`, `scripts/operating-e2e-dashboard-import.mjs` | `npm run test:ui-harness` PASS; `npm run smoke:operating-dashboard-import` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| CONTENT-CALENDAR-DATA-ONLY-042 | Accepted default `/content` and `/calendar` filtering | `CONTENT-CALENDAR-DATA-ONLY-042-worker-handoff.md`, `CONTENT-CALENDAR-DATA-ONLY-042-orchestrator-review.md` | `src/domain/self-media/ui/screens/ContentPage.tsx`, `src/domain/self-media/ui/patterns/ContentManagement.tsx`, `src/domain/self-media/ui/screens/CalendarPage.tsx`, `src/domain/self-media/ui/patterns/PublishCalendar.tsx`, `tests/ui-harness.test.mjs` | `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS; screenshot scan PASS |
| IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042 | Accepted gate repair and `/reviews` cleanup, with `/import` warning-copy follow-up | `IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042-worker-handoff.md`, `IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042-orchestrator-review.md` | `scripts/platform-operations-e2e-smoke.mjs`, `src/domain/self-media/ui/screens/ImportPage.tsx`, `src/domain/self-media/ui/screens/ReviewsPage.tsx`, `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`, `tests/ui-harness.test.mjs` | `npm run smoke:platform-operations-e2e` PASS; `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| IMPORT-WARNING-COPY-DATA-ONLY-043 | Accepted business-facing default `/import` warning copy | `IMPORT-WARNING-COPY-DATA-ONLY-043-worker-handoff.md`, `IMPORT-WARNING-COPY-DATA-ONLY-043-orchestrator-review.md` | `src/domain/self-media/ui/screens/ImportPage.tsx`, `tests/ui-harness.test.mjs`, `scripts/platform-operations-e2e-smoke.mjs` | `npm run smoke:platform-operations-e2e` PASS; `npm run gate:daily-platform-ops` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| DAILY-OPERATING-CLOSURE-043 | Accepted current green daily operating loop on fixed 3200 | `DAILY-OPERATING-CLOSURE-043-worker-handoff.md`, `DAILY-OPERATING-CLOSURE-043-orchestrator-review.md` | `scripts/daily-self-media-ops.mjs`, `src/domain/self-media/ui/screens/ImportPage.tsx`, `tests/self-media-contract.test.ts`, `tests/ui-harness.test.mjs` | `npm run ops:daily-self-media -- --preflight-health` PASS; `npm run typecheck` PASS; `npm run test:self-media` PASS; `npm run test:ui-harness` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| DASHBOARD-NUMBER-TRUST-AUDIT-043 | Accepted dashboard number-presentation regression gate | `DASHBOARD-NUMBER-TRUST-AUDIT-043-worker-handoff.md`, `DASHBOARD-NUMBER-TRUST-AUDIT-043-orchestrator-review.md` | `package.json`, `scripts/dashboard-number-trust-audit.mjs`, `src/domain/self-media/ui/primitives/Panel.tsx`, `src/domain/self-media/ui/screens/DashboardPage.tsx`, `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`, `tests/self-media-contract.test.ts`, `tests/ui-harness.test.mjs` | `npm run audit:dashboard-numbers` PASS; `npm run test:ui-harness` PASS; `npm run typecheck` PASS; `npm run test:self-media` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| DASHBOARD-LIVE-NUMBER-AUDIT-044 | Accepted live read-only dashboard number audit | `DASHBOARD-LIVE-NUMBER-AUDIT-044-worker-handoff.md`, `DASHBOARD-LIVE-NUMBER-AUDIT-044-orchestrator-review.md` | `scripts/dashboard-number-trust-audit.mjs`, `tests/ui-harness.test.mjs`, `src/domain/self-media/ui/patterns/ContentManagement.tsx`, `src/domain/self-media/ui/patterns/PublishCalendar.tsx`, `src/domain/self-media/ui/screens/CalendarPage.tsx` | `npm run audit:dashboard-numbers -- --live --base-url=http://127.0.0.1:3200` PASS; fixture audit PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| CALENDAR-REAL-SCHEDULING-WORKFLOW-044 | Accepted real scheduling workflow | `CALENDAR-REAL-SCHEDULING-WORKFLOW-044-worker-handoff.md`, `CALENDAR-REAL-SCHEDULING-WORKFLOW-044-orchestrator-review.md` | `package.json`, `src/app/calendar/page.tsx`, `src/domain/self-media/ui/screens/CalendarPage.tsx`, `src/domain/self-media/ui/patterns/PublishCalendar.tsx`, `src/app/globals.css`, `tests/ui-harness.test.mjs`, `scripts/calendar-real-scheduling-smoke-044.mjs` | `npm run typecheck` PASS; `npm run test:ui-harness` PASS; `npm run smoke:calendar-real-scheduling` PASS; `npm run test:self-media` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| OPERATOR-UX-FINAL-POLISH-044 | Accepted business-facing Chinese polish across main pages | `OPERATOR-UX-FINAL-POLISH-044-worker-handoff.md`, `OPERATOR-UX-FINAL-POLISH-044-orchestrator-review.md` | `src/app/calendar/page.tsx`, `src/domain/self-media/ui/components/SidebarNav.tsx`, `src/domain/self-media/ui/screens/DashboardPage.tsx`, `ContentPage.tsx`, `CalendarPage.tsx`, `ImportPage.tsx`, `ReviewsPage.tsx`, `MetricDashboardGrid.tsx`, `ContentManagement.tsx`, `PublishCalendar.tsx`, `EvidenceReviewReport.tsx`, `tests/ui-harness.test.mjs` | `npm run typecheck` PASS; `npm run test:ui-harness` PASS; `npm run test:self-media` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| MAINLINE-PRD-RECONCILIATION-045 | Accepted PRD gap matrix | `MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md`, `MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md` | Handoff-only; no code | `git diff --check` PASS; no trailing whitespace PASS |
| LIVE-OPERATOR-WALKTHROUGH-045 | Accepted read-only live walkthrough | `LIVE-OPERATOR-WALKTHROUGH-045-worker-handoff.md`, `MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md` | Handoff and `.local/live-operator-walkthrough-045/*` evidence only | Live 3200 walkthrough mostly PASS; no data mutation |
| REMAINING-SURFACE-POLISH-045 | Accepted UI-only default data-only gap fix | `REMAINING-SURFACE-POLISH-045-worker-handoff.md`, `MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md` | `src/domain/self-media/ui/components/SidebarNav.tsx`, `src/domain/self-media/ui/patterns/ContentManagement.tsx`, `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`, `src/domain/self-media/ui/screens/OverviewPage.tsx`, `tests/ui-harness.test.mjs` | `npm run typecheck` PASS; `npm run test:ui-harness` PASS; `git diff --check` PASS; live DOM check PASS |
| MAIN-SESSION-STATUS-CLOSURE-045 | Accepted status closure | `MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md` | `docs/handoffs/CURRENT-PLATFORM-STATUS.md`, `docs/task-board.md` | `git diff --check` PASS; trailing whitespace PASS |
| PAUSED-PLATFORM-EVIDENCE-CLEANUP-047 | Accepted default `/reviews` paused evidence cleanup | `PAUSED-PLATFORM-EVIDENCE-CLEANUP-047-worker-handoff.md`, `MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` | `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`, `tests/ui-harness.test.mjs` | `npm run typecheck` PASS; `npm run test:ui-harness` PASS; `git diff --check` PASS; live DOM check PASS |
| PAUSED-PLATFORM-EVIDENCE-AUDIT-047 | Accepted read-only audit | `PAUSED-PLATFORM-EVIDENCE-AUDIT-047-auditor-handoff.md`, `MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` | Handoff-only | `git diff --check` PASS; live DOM read-only check PASS |
| REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047 | Accepted screenshot regression | `REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047-worker-handoff.md`, `MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` | Handoff and `.local/screenshots/reviews-paused-evidence-047/*` evidence only | Live URL PASS; screenshot save PASS; visible evidence table PASS; `git diff --check` PASS |
| MAIN-SESSION-STATUS-CLOSURE-047 | Accepted status closure | `MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` | `docs/handoffs/CURRENT-PLATFORM-STATUS.md`, `docs/task-board.md`, `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md` | `git diff --check` PASS; trailing whitespace PASS |

## Four-Platform Provider / Script / API Matrix

| Area | Accepted handoff evidence | Attributed dirty files | Verification evidence |
| --- | --- | --- | --- |
| Douyin discovery and import | `DOUYIN-PERSONAL-V0-DISCOVERY-013-worker-handoff.md`, `DOUYIN-PERSONAL-V1-METRICS-014-worker-handoff.md`, `DOUYIN-PERSONAL-V1-SAVE-SMOKE-015-worker-handoff.md` | `scripts/douyin-personal-discovery.mjs`, `scripts/douyin-personal-import.mjs`, `scripts/douyin-personal-save-smoke.mjs`, `src/domain/self-media/providers/douyin-personal-provider.ts`, `src/domain/self-media/providers/index.ts`, `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/runtime/self-media-runtime.ts`, `package.json`, `tests/self-media-contract.test.ts`, `docs/product-specs/douyin-personal-v0.md` | `npm run discover:douyin` PASS; `npm run import:douyin` PASS; `npm run smoke:douyin-save` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| Xiaohongshu discovery and import | `XIAOHONGSHU-PERSONAL-V0-DISCOVERY-016-worker-handoff.md`, `XIAOHONGSHU-PERSONAL-V1-METRICS-017-worker-handoff.md`, `XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md` | `scripts/xiaohongshu-personal-discovery.mjs`, `scripts/xiaohongshu-personal-import.mjs`, `scripts/xiaohongshu-personal-save-smoke.mjs`, `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`, `src/domain/self-media/providers/index.ts`, `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/runtime/self-media-runtime.ts`, `package.json`, `tests/self-media-contract.test.ts`, `docs/product-specs/xiaohongshu-personal-v0.md`, `docs/product-specs/xiaohongshu-personal-v1.md` | `npm run import:xiaohongshu` PASS; `npm run import:xiaohongshu -- --save` PASS; `npm run smoke:xiaohongshu-save` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| Video Account discovery and import | `VIDEO-ACCOUNT-PERSONAL-V0-DISCOVERY-016-worker-handoff.md`, `VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017-worker-handoff.md`, `VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md` | `scripts/video-account-personal-discovery.mjs`, `scripts/video-account-personal-import.mjs`, `scripts/video-account-personal-save-smoke.mjs`, `src/domain/self-media/providers/video-account-personal-provider.ts`, `src/domain/self-media/providers/index.ts`, `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/runtime/self-media-runtime.ts`, `package.json`, `tests/self-media-contract.test.ts`, `docs/product-specs/video-account-personal-v0.md`, `docs/product-specs/video-account-personal-v1.md` | `npm run import:video-account` PASS; `npm run import:video-account -- --save` PASS; `npm run smoke:video-account-save` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| Bilibili content-level archives import | `BILIBILI-PERSONAL-V0-DISCOVERY-019-worker-handoff.md`, `BILIBILI-PERSONAL-V0-REAL-CAPTURE-020-worker-handoff.md`, `BILIBILI-PERSONAL-V1-METRICS-021-worker-handoff.md`, `BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-worker-handoff.md`, `BILIBILI-PUBLIC-ONLY-029-worker-handoff.md`, `BILIBILI-PUBLIC-ONLY-029-orchestrator-review.md` | `scripts/bilibili-personal-discovery.mjs`, `scripts/bilibili-personal-import.mjs`, `scripts/bilibili-personal-save-smoke.mjs`, `src/domain/self-media/providers/bilibili-personal-provider.ts`, `src/domain/self-media/providers/index.ts`, `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/runtime/self-media-runtime.ts`, `src/domain/self-media/config/self-media-config.ts`, `package.json`, `tests/self-media-contract.test.ts`, `docs/product-specs/bilibili-personal-v0.md` | `npm run discover:bilibili` PASS; `npm run import:bilibili` PASS; `npm run import:bilibili -- --save` PASS; `npm run smoke:bilibili-save` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| Bilibili account metrics preview boundary | `BILIBILI-ACCOUNT-METRICS-SPEC-022-worker-handoff.md`, `BILIBILI-ACCOUNT-METRICS-PREVIEW-024-worker-handoff.md`, `BILIBILI-ACCOUNT-METRICS-STABILITY-025-worker-handoff.md`, `BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-worker-handoff.md` | `scripts/bilibili-account-metrics-preview.mjs`, `src/domain/self-media/providers/bilibili-personal-provider.ts`, `src/domain/self-media/config/self-media-config.ts`, `tests/self-media-contract.test.ts`, `docs/product-specs/bilibili-account-metrics-022.md` | `npm run preview:bilibili-account-metrics` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS. Current rule: preview-only; no durable account snapshot save |
| Unified four-platform save smoke | `PLATFORM-OPS-FOUR-024-worker-handoff.md`, `PLATFORM-OPS-FOUR-024-orchestrator-review.md` | `scripts/platform-personal-save-smoke.mjs`, `tests/self-media-contract.test.ts` | `npm run smoke:platforms-save` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |
| Four-platform operation E2E and health gate | `PLATFORM-OPERATIONS-E2E-SMOKE-027-worker-handoff.md`, `PLATFORM-OPERATIONS-E2E-SMOKE-027-orchestrator-review.md`, `PLATFORM-HEALTH-GATE-028-worker-handoff.md`, `PLATFORM-HEALTH-GATE-028-orchestrator-review.md`, `IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042-worker-handoff.md` | `scripts/platform-operations-e2e-smoke.mjs`, `scripts/platform-ops-with-health-smoke.mjs`, `scripts/platform-data-health.mjs`, `src/domain/self-media/ui/screens/ImportPage.tsx`, `tests/self-media-contract.test.ts`, `tests/ui-harness.test.mjs` | `npm run smoke:platform-operations-e2e` PASS; `npm run smoke:platform-ops-with-health` PASS; `npm run gate:daily-platform-ops` PASS after 042; `git diff --check` PASS |
| Platform operations API | `PLATFORM-IMPORT-OPERATIONS-020-worker-handoff.md`, `PLATFORM-IMPORT-OPERATIONS-020-orchestrator-review.md`, `PLATFORM-IMPORT-UX-021-worker-handoff.md`, `PLATFORM-IMPORT-UX-021-orchestrator-review.md`, `PLATFORM-OPERATION-HISTORY-023-worker-handoff.md`, `PLATFORM-OPERATION-HISTORY-023-orchestrator-review.md` | `src/app/api/self-media/platform-imports/operations/route.ts`, `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/runtime/self-media-runtime.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/ui/screens/ImportPage.tsx`, `tests/self-media-contract.test.ts` | `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS. API rejects raw/sensitive payload keys |
| Provenance and trusted-scope filter | `IMPORT-PROVENANCE-METADATA-030-worker-handoff.md`, `IMPORT-PROVENANCE-METADATA-030-orchestrator-review.md`, `REAL-DATA-SCOPE-029-orchestrator-review.md`, `LOCAL-DATA-QUARANTINE-PLAN-029-orchestrator-review.md` | `scripts/platform-personal-save-smoke.mjs`, `scripts/local-data-quarantine-report.mjs`, `src/domain/self-media/types/self-media-types.ts`, `src/domain/self-media/service/self-media-service.ts`, `src/domain/self-media/runtime/self-media-runtime.ts`, `tests/self-media-contract.test.ts` | `npm run check:local-data-quarantine` PASS; `npm run audit:trusted-dashboard` PASS; `npm run test:self-media` PASS; `npm run typecheck` PASS; `npm run verify:harness` PASS; `git diff --check` PASS |

## Other Accepted API / Script Attribution

| Dirty file or group | Accepted evidence | Attribution status |
| --- | --- | --- |
| `src/app/api/self-media/action-items/content/route.ts` | `ACTION-TO-CONTENT-WORKFLOW-037-worker-handoff.md`, `ACTION-TO-CONTENT-WORKFLOW-037-orchestrator-review.md` | Attributable; user-triggered action-to-content workflow; no real platform API |
| `src/app/api/self-media/content-versions/route.ts` | `CONTENT-DRAFT-REVIEW-038-worker-handoff.md`, `CONTENT-DRAFT-REVIEW-038-orchestrator-review.md` | Attributable; manual draft review; no real platform publish API |
| `src/app/api/self-media/content-workbench/route.ts` | `CONTENT-LIBRARY-ALL-DRAFTS-039-worker-handoff.md`, `CONTENT-LIBRARY-ALL-DRAFTS-039-orchestrator-review.md` | Attributable; `/content` workbench boundary |
| `src/app/api/self-media/contents/trust-scope/route.ts` | `CONTENT-TRUST-CURATION-031-worker-handoff.md`, `CONTENT-TRUST-CURATION-031-orchestrator-review.md` | Attributable; non-destructive trusted-scope curation |
| `src/app/api/self-media/reports/trusted-weekly-safe/route.ts` | `SAFE-WEEKLY-REPORT-UI-EXPORT-036-worker-handoff.md`, `SAFE-WEEKLY-REPORT-UI-EXPORT-036-orchestrator-review.md` | Attributable; safe redacted weekly API |
| `src/app/api/self-media/action-items/route.ts` | `ACTION-TASKS-OPERATING-035-orchestrator-review.md` via current status accepted dashboard action-item panel | Likely attributable, but this pass did not extract its changed-file section. Needs one more handoff read before staging |
| `src/app/api/self-media/import/preview/route.ts` | Historical import preview tasks are Done in task board | Not covered by focused 041-047/four-platform evidence. Needs older import handoff attribution before staging |
| `scripts/trusted-weekly-report.mjs` | `TRUSTED-WEEKLY-REPORT-EXPORT-035-worker-handoff.md`, `TRUSTED-WEEKLY-REPORT-EXPORT-035-orchestrator-review.md` | Attributable; safe/full report command pair, full local report remains local |
| `scripts/draft-review-ui-e2e-039.mjs` | `DRAFT-REVIEW-UI-E2E-039`, `PUBLISH-LEDGER-OPERATIONS-040`, `CONTENT-PUBLISH-HISTORY-041` | Attributable; isolated browser E2E for draft review / publish ledger |
| `scripts/calendar-real-scheduling-smoke-044.mjs` | `CALENDAR-REAL-SCHEDULING-WORKFLOW-044` | Attributable |
| `scripts/dashboard-number-trust-audit.mjs` | `DASHBOARD-NUMBER-TRUST-AUDIT-043`, `DASHBOARD-LIVE-NUMBER-AUDIT-044` | Attributable |
| `scripts/daily-self-media-ops.mjs`, `scripts/daily-ops-redacted-summary.mjs`, `scripts/daily-platform-ops-gate.mjs`, `scripts/local-server-health.mjs`, `scripts/real-capture-freshness-check.mjs`, `scripts/start-operator-dev.mjs` | Accepted 033-043 ops/runbook/health/preflight handoffs in current status | Attributable as operating workflow scripts, but should be bundled with ops verification, not UI-only files |
| `scripts/sync-wechat-official.ts`, `scripts/wechat-backend-discovery.mjs`, `src/app/api/self-media/wechat/sync/route.ts` | `WECHAT-001-worker-handoff.md`, `WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md`; current status says WeChat Official Account/backend paused | Historical/paused attribution only. Do not include in active four-platform bundle except with explicit paused-WeChat policy notes |

## Dirty Files Already Attributable

These dirty files have direct accepted handoff evidence from the matrix above:

```text
docs/handoffs/CURRENT-PLATFORM-STATUS.md
docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md
docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md
docs/handoffs/PAUSED-PLATFORM-EVIDENCE-AUDIT-047-auditor-handoff.md
docs/handoffs/PAUSED-PLATFORM-EVIDENCE-CLEANUP-047-worker-handoff.md
docs/handoffs/REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047-worker-handoff.md
docs/task-board.md
package.json
scripts/bilibili-account-metrics-preview.mjs
scripts/bilibili-personal-discovery.mjs
scripts/bilibili-personal-import.mjs
scripts/bilibili-personal-save-smoke.mjs
scripts/calendar-real-scheduling-smoke-044.mjs
scripts/daily-ops-redacted-summary.mjs
scripts/daily-platform-ops-gate.mjs
scripts/daily-self-media-ops.mjs
scripts/dashboard-number-trust-audit.mjs
scripts/douyin-personal-discovery.mjs
scripts/douyin-personal-import.mjs
scripts/douyin-personal-save-smoke.mjs
scripts/draft-review-ui-e2e-039.mjs
scripts/local-data-quarantine-report.mjs
scripts/local-server-health.mjs
scripts/operating-e2e-dashboard-import.mjs
scripts/platform-data-health.mjs
scripts/platform-operations-e2e-smoke.mjs
scripts/platform-ops-with-health-smoke.mjs
scripts/platform-personal-save-smoke.mjs
scripts/real-capture-freshness-check.mjs
scripts/start-operator-dev.mjs
scripts/trusted-dashboard-audit.mjs
scripts/trusted-weekly-report.mjs
scripts/video-account-personal-discovery.mjs
scripts/video-account-personal-import.mjs
scripts/video-account-personal-save-smoke.mjs
scripts/xiaohongshu-personal-discovery.mjs
scripts/xiaohongshu-personal-import.mjs
scripts/xiaohongshu-personal-save-smoke.mjs
src/app/api/self-media/action-items/content/route.ts
src/app/api/self-media/content-versions/route.ts
src/app/api/self-media/content-workbench/route.ts
src/app/api/self-media/contents/trust-scope/route.ts
src/app/api/self-media/platform-imports/operations/route.ts
src/app/api/self-media/reports/trusted-weekly-safe/route.ts
src/app/calendar/page.tsx
src/app/content/page.tsx
src/app/globals.css
src/app/import/page.tsx
src/domain/self-media/config/self-media-config.ts
src/domain/self-media/providers/bilibili-personal-provider.ts
src/domain/self-media/providers/douyin-personal-provider.ts
src/domain/self-media/providers/index.ts
src/domain/self-media/providers/video-account-personal-provider.ts
src/domain/self-media/providers/xiaohongshu-personal-provider.ts
src/domain/self-media/runtime/self-media-runtime.ts
src/domain/self-media/service/self-media-service.ts
src/domain/self-media/types/self-media-types.ts
src/domain/self-media/ui/components/SidebarNav.tsx
src/domain/self-media/ui/patterns/ContentManagement.tsx
src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx
src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx
src/domain/self-media/ui/patterns/PublishCalendar.tsx
src/domain/self-media/ui/primitives/Panel.tsx
src/domain/self-media/ui/screens/CalendarPage.tsx
src/domain/self-media/ui/screens/ContentPage.tsx
src/domain/self-media/ui/screens/DashboardPage.tsx
src/domain/self-media/ui/screens/ImportPage.tsx
src/domain/self-media/ui/screens/OverviewPage.tsx
src/domain/self-media/ui/screens/ReviewsPage.tsx
tests/self-media-contract.test.ts
tests/ui-harness.test.mjs
```

Attribution caveat: shared files such as `package.json`, `self-media-types.ts`, `self-media-service.ts`, `self-media-runtime.ts`, and `tests/self-media-contract.test.ts` are attributable to accepted work families, but they are too broad to stage as a single task without bundle review and verification.

## Dirty Files With Partial Attribution

These files have plausible accepted lineage, but this pass did not collect enough exact changed-file evidence to recommend staging them directly:

```text
AGENTS.md
docs/cleanup-manifest.md
docs/context/current-state.md
docs/generated/template-doctor-report.md
docs/handoffs/README.md
docs/product-specs/index.md
src/app/api/self-media/action-items/route.ts
src/domain/self-media/providers/csv-preset-provider.ts
src/domain/self-media/repo/sqlite-self-media-repo.ts
src/domain/self-media/ui/components/PlatformBadge.tsx
src/domain/self-media/ui/foundations/tokens.css
src/domain/self-media/ui/screens/LeadsPage.tsx
src/domain/self-media/ui/screens/UiLabPage.tsx
tests/agent-trajectory.test.mjs
```

Recommended next attribution checks:

- Governance/docs bundle: compare `AGENTS.md`, `docs/handoffs/README.md`, `docs/cleanup-manifest.md`, and context docs against GOV/TRELLIS/045 handoffs.
- Generated report bundle: decide whether `docs/generated/template-doctor-report.md` should be tracked as generated evidence or regenerated during verification only.
- Older UI bundle: attribute `PlatformBadge.tsx`, tokens, LeadsPage, and UiLabPage to UI harness / polish handoffs before staging.
- Repo/provider fallback bundle: attribute `sqlite-self-media-repo.ts` and `csv-preset-provider.ts` to trusted-scope/provenance/import handoffs before staging.

## Dirty Files Missing Evidence In This Focused Matrix

These files remain insufficiently attributed after the requested focused pass:

```text
.gitignore
next-env.d.ts
next.config.mjs
package-lock.json
scripts/smoke-self-media.mjs
src/app/api/self-media/import/preview/route.ts
tsconfig.json
```

Notes:

- `package-lock.json` is especially important: many accepted tasks mention `package.json`, but this pass found no direct handoff evidence for `package-lock.json`.
- `next-env.d.ts`, `next.config.mjs`, `tsconfig.json`, and `scripts/smoke-self-media.mjs` need a tooling/config acceptance bundle, not platform/UI staging by implication.
- `.gitignore` may be related to local evidence/workflow hygiene, but it needs explicit policy evidence.
- `src/app/api/self-media/import/preview/route.ts` likely belongs to older import preview work, but it was not covered by the focused 041-047/four-platform read set.

## Untracked Directories / Policy Buckets

| Bucket | Current attribution | Recommendation |
| --- | --- | --- |
| `docs/handoffs/` | Many files are directly named in `CURRENT-PLATFORM-STATUS.md`; others are historical but project-related | Track accepted current source-of-truth handoffs first; decide archival/index policy for historical unindexed handoffs separately |
| `docs/product-specs/` | Many map to accepted platform/UI tasks | Track specs that correspond to accepted task-board/current-status entries; defer unrelated historical specs until docs retention decision |
| `docs/runbooks/self-media-daily-ops.md` | Current status names it as daily operator checklist | Attributable to accepted runbook/ops work |
| `docs/trellis-parallel-workflow.md` | Task-board `TRELLIS-001` accepted | Project-related, but should be bundled with `.trellis` policy decision |
| `.agents/`, `.codex/`, `.trellis/` | Workflow metadata, not product runtime | Requires explicit policy: track as intentional local workflow tooling or ignore/move. Do not delete from this task |
| `.local/*` evidence | Accepted handoffs reference some screenshots/reports | Local evidence only by default; do not track unless explicitly redacted/approved |
| `src/app/api/self-media/wechat/sync/route.ts`, WeChat scripts/specs | Historical WeChat work exists, but current status says WeChat paused | Keep out of active four-platform bundle unless packaged as paused/historical docs with explicit boundary |

## Recommended Acceptance Bundles

1. `048-status-docs`: accepted 045/047 status files and this matrix handoff. Verification: `git diff --check` and trailing whitespace check.
2. `047-reviews-paused-evidence`: `EvidenceReviewReport.tsx`, `tests/ui-harness.test.mjs`, 047 handoffs/status docs. Verification: `npm run typecheck`, `npm run test:ui-harness`, live/read-only `/reviews` check if server is available, `git diff --check`.
3. `platform-core-four`: Types -> Config -> Providers -> Service -> Runtime plus four personal provider files and platform import/save scripts. Verification: `npm run smoke:platforms-save`, `npm run smoke:platform-operations-e2e`, `npm run test:self-media`, `npm run typecheck`, `git diff --check`.
4. `platform-ops-api`: platform operations API, operation history, import UI, platform health and gate scripts. Verification: `npm run smoke:platform-ops-with-health`, `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`, `git diff --check`.
5. `operator-ui-data-only`: Dashboard/content/calendar/import/reviews UI files and UI harness. Verification: `npm run test:ui-harness`, `npm run verify:harness`, targeted smoke commands from 042-044, `git diff --check`.
6. `operating-workflow-apis`: action-to-content, content versions, content workbench, trust scope, safe weekly API, daily ops scripts. Verification: `npm run test:self-media`, `npm run smoke:draft-review-ui-e2e`, `npm run smoke:operating-action-to-content`, `npm run report:trusted-weekly:safe`, `git diff --check`.
7. `tooling-config-policy`: `.gitignore`, Next/TypeScript config, package lock, smoke harness, Trellis/agent metadata. Verification must be decided by Orchestrator before staging.

## Verification Commands And Results

- `git diff --check`: PASS, with existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.

## Changed Files

This worker changed only:

```text
docs/handoffs/WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md
```

## Known Issues / Residual Risk

- This matrix is a source-attribution aid, not a staging plan.
- The dirty worktree is broad enough that line-level proof still requires feature-bundle review.
- `package-lock.json` and tooling/config files remain the clearest missing-evidence risks.
- WeChat-related files have historical evidence but are outside the active baseline because WeChat Official Account / backend remains paused.
- `.agents/`, `.codex/`, and `.trellis/` require explicit policy before tracking or ignoring.

## Next Recommendation

Use the recommended acceptance bundles above. Start with the smallest docs/status bundle, then the 047 `/reviews` bundle, then platform-core in fixed layer order: Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI.

## Orchestrator Decision Required

Yes.

Main session should decide the bundle order and policy for tooling/config, local workflow metadata, paused WeChat files, and historical unindexed handoffs.
