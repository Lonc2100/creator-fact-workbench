# PLATFORM-CORE-ACTIVE-MANIFEST-048 Worker Handoff

Date: 2026-06-05
Mode: docs-only / manifest-only. No business-code edits, no deletion, no staging, no commit.

## Task ID

PLATFORM-CORE-ACTIVE-MANIFEST-048

## Scope

Create the active manifest for the next `platform-core-four` acceptance bundle.

The active platform-core scope is the four content-level personal platform loops:

- Douyin
- Xiaohongshu
- Video Account
- Bilibili

WeChat Official Account / backend remains paused. Bilibili account-level metrics remain preview/diagnostics-only and are not approved for durable account snapshot save.

## Context Read

- `AGENTS.md`
- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/context/current-state.md`
- `docs/context/engineering-principles.md`
- `docs/context/decisions.md`
- `docs/context/llms.txt`
- `docs/architecture/current-stage.md`
- `docs/spec-governance.md`
- `docs/agent-playbook.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-048-orchestrator-review.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`
- `docs/handoffs/WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md`
- `docs/handoffs/CORE-LAYER-DIFF-ATTRIBUTION-048-auditor-handoff.md`
- `package.json`

## Active Manifest

This is the recommended active bundle in fixed order:

```text
Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI
```

### 1. Types

Must include:

- `src/domain/self-media/types/self-media-types.ts`

Active acceptance notes:

- Include shared four-platform content import/save contracts.
- Include provenance, trusted-scope, platform readiness/status, operation-history, review, and action types required by active four-platform surfaces.
- Keep WeChat-related type branches as paused/historical compatibility only.
- Keep `AccountMetricSnapshot`, `accountMetrics`, and `dateKeyRows` as model/preview boundaries only; this is not Bilibili durable account-save approval.

### 2. Config

Must include:

- `src/domain/self-media/config/self-media-config.ts`

Active acceptance notes:

- Include active four-platform status/readiness configuration and Bilibili content-level archive boundary.
- WeChat readiness/status entries, if retained in the shared file, must be described as paused compatibility rather than active scope.
- Bilibili account preview guidance must continue to say preview/diagnostics-only.

### 3. Repo

Must include:

- `src/domain/self-media/repo/sqlite-self-media-repo.ts`

Active acceptance notes:

- Include persistence required for content/platform versions/content metric snapshots/import runs/provenance/trusted filtering used by the active four-platform flow.
- Include generic account snapshot read/model support only as a separated model boundary.
- Do not treat `upsertAccountMetricSnapshot` as approval for Bilibili account metric persistence.

### 4. Providers

The four personal provider files are mandatory and platform-core critical:

- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
- `src/domain/self-media/providers/video-account-personal-provider.ts`
- `src/domain/self-media/providers/bilibili-personal-provider.ts`

Tracked provider index must also be included:

- `src/domain/self-media/providers/index.ts`

Active acceptance notes:

- `providers/index.ts` exports all four personal providers, so a clean checkout needs these provider files tracked with the bundle.
- Douyin, Xiaohongshu, and Video Account providers are active content-level creator-center import/save providers.
- Bilibili provider is active for public/archive content-level import/save only.
- Bilibili account preview helpers inside the provider remain diagnostics-only.

### 5. Service

Must include:

- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/service/review-service.ts`

Active acceptance notes:

- Include four-platform parse/import/save orchestration, trusted creator-center scope filtering, platform operation summaries, dashboard/review contribution behavior, and review wording tied to active four-platform data.
- Shared WeChat sync/service branches are paused/historical compatibility only.
- Account trend grouping must remain separate from content totals and saved review content snapshot ids.

### 6. Runtime

Must include:

- `src/domain/self-media/runtime/self-media-runtime.ts`

Active acceptance notes:

- Include runtime wiring for four-platform preview/save/operation flows.
- Exclude paused WeChat sync runtime behavior from active acceptance.
- Exclude Bilibili account metric preview script behavior from durable account-save acceptance.

### 7. UI

Must include only the minimal active platform-core UI surfaces:

- `src/app/import/page.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/domain/self-media/ui/components/PlatformBadge.tsx`

Active acceptance notes:

- Include `/import` four-platform preview/save/save-smoke controls and operation result surfaces.
- Include `/dashboard` active-platform content totals and separate account trend display.
- Include `/reviews` active-platform contribution and paused WeChat evidence exclusion behavior.
- Include platform labels/badges only where they support active platform visibility.
- Do not include broad secondary-surface polish as platform-core by implication.

## Supporting Acceptance Files

These files are not layer-core files, but should be reviewed with or immediately next to the active platform-core bundle because they prove the active four-platform path.

### Scripts

Must include for platform-core proof:

- `scripts/douyin-personal-import.mjs`
- `scripts/douyin-personal-save-smoke.mjs`
- `scripts/xiaohongshu-personal-import.mjs`
- `scripts/xiaohongshu-personal-save-smoke.mjs`
- `scripts/video-account-personal-import.mjs`
- `scripts/video-account-personal-save-smoke.mjs`
- `scripts/bilibili-personal-import.mjs`
- `scripts/bilibili-personal-save-smoke.mjs`
- `scripts/platform-personal-save-smoke.mjs`
- `scripts/platform-operations-e2e-smoke.mjs`
- `scripts/platform-ops-with-health-smoke.mjs`
- `scripts/platform-data-health.mjs`

Optional / adjacent for ops bundle, not required for the minimal core manifest:

- `scripts/daily-platform-ops-gate.mjs`
- `scripts/real-capture-freshness-check.mjs`
- `scripts/local-data-quarantine-report.mjs`

### API / Tests / Package

Should include or be reviewed with the active platform-core proof:

- `src/app/api/self-media/platform-imports/operations/route.ts`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `package.json`

Notes:

- `package.json` should be included only for scripts needed by the acceptance commands.
- `package-lock.json` remains outside this active manifest unless a separate dependency/tooling reason is proven.

### Active Product Specs And Handoffs

Should be tracked or cited with the bundle as source-of-truth lineage:

- `docs/product-specs/douyin-personal-v0.md`
- `docs/product-specs/xiaohongshu-personal-v0.md`
- `docs/product-specs/xiaohongshu-personal-v1.md`
- `docs/product-specs/video-account-personal-v0.md`
- `docs/product-specs/video-account-personal-v1.md`
- `docs/product-specs/bilibili-personal-v0.md`
- `docs/handoffs/DOUYIN-PERSONAL-V1-METRICS-014-worker-handoff.md`
- `docs/handoffs/DOUYIN-PERSONAL-V1-SAVE-SMOKE-015-worker-handoff.md`
- `docs/handoffs/XIAOHONGSHU-PERSONAL-V1-METRICS-017-worker-handoff.md`
- `docs/handoffs/XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md`
- `docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017-worker-handoff.md`
- `docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md`
- `docs/handoffs/BILIBILI-PERSONAL-V1-METRICS-021-worker-handoff.md`
- `docs/handoffs/BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-worker-handoff.md`
- `docs/handoffs/BILIBILI-PUBLIC-ONLY-029-worker-handoff.md`
- `docs/handoffs/BILIBILI-PUBLIC-ONLY-029-orchestrator-review.md`
- `docs/handoffs/PLATFORM-OPS-FOUR-024-worker-handoff.md`
- `docs/handoffs/PLATFORM-OPS-FOUR-024-orchestrator-review.md`
- `docs/handoffs/PLATFORM-OPERATIONS-E2E-SMOKE-027-worker-handoff.md`
- `docs/handoffs/PLATFORM-OPERATIONS-E2E-SMOKE-027-orchestrator-review.md`
- `docs/handoffs/PLATFORM-HEALTH-GATE-028-worker-handoff.md`
- `docs/handoffs/PLATFORM-HEALTH-GATE-028-orchestrator-review.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`

## Explicit Exclusions From Active Platform-Core

These files must not be included in the active `platform-core-four` manifest.

### Paused / Historical WeChat Files

- `scripts/sync-wechat-official.ts`
- `scripts/wechat-backend-discovery.mjs`
- `src/app/api/self-media/wechat/sync/route.ts`
- `docs/product-specs/wechat-001.md`
- `docs/product-specs/wechat-backend-v0.md`
- `docs/handoffs/WECHAT-001-worker-handoff.md`
- `docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md`

WeChat compatibility references inside shared Types/Config/Service/Runtime/UI/test files are historical compatibility only. They must not be narrated as reopened WeChat backend scope.

### Diagnostics-Only Bilibili Account Preview Files

- `scripts/bilibili-account-metrics-preview.mjs`
- `docs/product-specs/bilibili-account-metrics-022.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-SPEC-022-worker-handoff.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-PREVIEW-024-worker-handoff.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-STABILITY-025-worker-handoff.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-worker-handoff.md`
- `docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-orchestrator-review.md`

Bilibili account preview fields in provider/service/tests/scripts are allowed only as guardrails proving:

- `previewOnly: true`
- `saved: false`
- `accountMetricsSaved: false`
- `dateKeyRowsSaved: false`
- no `AccountMetricSnapshot` row increase during content save smoke
- no account metrics contribution to content dashboard/review totals

### CSV / Legacy Import Preview

- `src/domain/self-media/providers/csv-preset-provider.ts`
- `src/app/api/self-media/import/preview/route.ts`
- `docs/product-specs/import-real-011.md`
- `docs/handoffs/IMPORT-REAL-011-worker-handoff.md`
- `docs/handoffs/IMPORT-PREVIEW-UI-012-worker-handoff.md`

These belong to import preview / CSV / XLSX coverage, not the four personal raw-capture provider bundle.

### Local / Tooling / Generated / Broad Policy Buckets

- `.local/**`
- `.agents/**`
- `.codex/**`
- `.trellis/**`
- `.gitignore`
- `next-env.d.ts`
- `next.config.mjs`
- `package-lock.json`
- `tsconfig.json`
- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`

These require separate tooling/config/local workflow policy attribution before tracking, ignoring, staging, or committing.

### Broad UI Or Workflow Follow-Up Files

Exclude from the minimal active core manifest unless the main session intentionally widens the bundle:

- `src/app/calendar/page.tsx`
- `src/app/content/page.tsx`
- `src/app/globals.css`
- `src/app/api/self-media/action-items/route.ts`
- `src/app/api/self-media/action-items/content/route.ts`
- `src/app/api/self-media/content-versions/route.ts`
- `src/app/api/self-media/content-workbench/route.ts`
- `src/app/api/self-media/contents/trust-scope/route.ts`
- `src/app/api/self-media/reports/trusted-weekly-safe/route.ts`
- `src/domain/self-media/ui/components/SidebarNav.tsx`
- `src/domain/self-media/ui/foundations/tokens.css`
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/primitives/Panel.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/OverviewPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`

These are likely accepted or attributable elsewhere, but they belong to operator UI data-only, operating workflow, reporting, or tooling bundles rather than the minimal active core bundle.

## Needs Later Bundle

Recommended next bundles after `platform-core-four`:

1. `platform-ops-api`
   - `src/app/api/self-media/platform-imports/operations/route.ts`
   - `scripts/platform-ops-with-health-smoke.mjs`
   - `scripts/daily-platform-ops-gate.mjs`
   - `scripts/platform-data-health.mjs`
   - `src/domain/self-media/ui/screens/ImportPage.tsx`
   - Verification: `npm run smoke:platform-ops-with-health`, daily gate only when 3200 is intentionally healthy.

2. `operator-ui-data-only`
   - Dashboard/content/calendar/import/reviews UI files and UI harness tests.
   - Verification: `npm run test:ui-harness`, `npm run verify:harness`, targeted browser/live checks where available.

3. `operating-workflow-apis`
   - action items, action-to-content, content versions, content workbench, trust-scope, publish ledger, safe weekly API, and related scripts.
   - Verification: `npm run test:self-media`, `npm run smoke:operating-action-to-content`, `npm run smoke:draft-review-ui-e2e`, `npm run report:trusted-weekly:safe`.

4. `daily-reporting-and-health`
   - daily ops, local server health, dashboard number audit, real-capture freshness, trusted weekly/daily reports.
   - Verification: run serially; do not run daily ops in parallel with browser/E2E gates.

5. `paused-wechat-historical`
   - WeChat scripts/routes/specs/handoffs only if the main session wants to retain them as paused historical artifacts.
   - Verification should prove default dashboard/reviews/actions still exclude paused WeChat from active operating scope.

6. `bilibili-account-diagnostics`
   - Bilibili account preview script/spec/handoffs only as diagnostics.
   - Verification should prove no durable account snapshot save and no content total contribution.

7. `csv-import-preview`
   - CSV/XLSX preset provider and import preview route/spec/handoffs.
   - Verification should prove preview/import behavior without treating it as the four personal raw-capture path.

8. `tooling-config-policy`
   - `.gitignore`, Next/TypeScript config, `package-lock.json`, smoke harness, `.agents/`, `.codex/`, `.trellis/`.
   - Requires explicit Orchestrator policy before staging or ignoring.

## Verification Recommendation Before Any Future Staging

Run from repository root, serially:

```powershell
git diff --check
npm run typecheck
npm run test:self-media
npm run smoke:platforms-save
npm run smoke:platform-operations-e2e
npm run smoke:platform-ops-with-health
git diff --check
```

If the UI files are accepted in the same bundle, also run:

```powershell
npm run test:ui-harness
```

Use the live daily gate only when port 3200 is intentionally running and healthy:

```powershell
npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

Current caveat from `PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`: the required standalone six-command platform-core sequence passed, but the conditional live daily gate failed due to a nested `smoke:platform-operations-e2e` timeout. Treat that as a daily-gate rerun/local contention follow-up, not as a platform-core provider failure.

## Changed Files

This task changed only:

- `docs/handoffs/PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md`

## Verification Commands And Results

- `git diff --check`: PASS, with existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.
- Trailing whitespace check on this handoff: PASS.

## Known Issues / Residual Risk

- This manifest is a packaging guide, not a staging plan.
- Shared core files still contain multiple historical feature families. Staging requires future bundle review and verification.
- The worktree remains broad and dirty.
- No business code, tests, local data, generated reports, screenshots, Git staging, or commits were changed by this task.

## Orchestrator Decision Required

Yes for any future staging, commit, tracking, ignoring, deletion, or widening of the active manifest.

No for accepting this handoff as a docs-only active-manifest artifact.
