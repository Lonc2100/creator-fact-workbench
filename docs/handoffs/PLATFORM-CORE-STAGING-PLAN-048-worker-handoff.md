# PLATFORM-CORE-STAGING-PLAN-048 Worker Handoff

Date: 2026-06-05

## Task ID

PLATFORM-CORE-STAGING-PLAN-048

## Scope

Create a read-only staging plan for the next `platform-core-four` bundle.

Boundaries kept:

- Did not run `git add`.
- Did not stage.
- Did not commit.
- Did not change business code.
- Did not delete files.
- Wrote only this handoff.

## Required Context Read

- `docs/handoffs/PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md`
- `docs/handoffs/DOCS-STATUS-BUNDLE-PREP-048-worker-handoff.md`

## Current Basis

Use `PLATFORM-CORE-ACTIVE-MANIFEST-048` as the active manifest. The active scope is:

- Douyin content-level personal loop
- Xiaohongshu content-level personal loop
- Video Account content-level personal loop
- Bilibili public/archive content-level personal loop

WeChat Official Account / backend remains paused. Bilibili account metrics remain preview/diagnostics-only, with no durable account snapshot save approval.

`PLATFORM-CORE-BUNDLE-VERIFY-048` already proved the required six-command platform-core sequence:

- `git diff --check`: PASS
- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS
- `npm run smoke:platforms-save`: PASS
- `npm run smoke:platform-operations-e2e`: PASS
- `npm run smoke:platform-ops-with-health`: PASS

The live conditional daily gate failed later due to a nested `smoke:platform-operations-e2e` timeout. Treat that as a daily-gate/local-contention follow-up, not as a blocker for the core provider bundle itself.

## Suggested Staged File List

Stage in one deliberate platform-core bundle only after rerunning the required gates below. Do not stage by broad directory.

### 1. Core Layer Files

Stage these tracked modified shared core files in the fixed order:

```text
src/domain/self-media/types/self-media-types.ts
src/domain/self-media/config/self-media-config.ts
src/domain/self-media/repo/sqlite-self-media-repo.ts
src/domain/self-media/providers/index.ts
src/domain/self-media/service/self-media-service.ts
src/domain/self-media/service/review-service.ts
src/domain/self-media/runtime/self-media-runtime.ts
```

Notes:

- Shared WeChat branches in these files are paused/historical compatibility only.
- Shared Bilibili account fields/methods are preview/model guardrails only.
- `upsertAccountMetricSnapshot` must not be narrated as Bilibili durable account-save approval.

### 2. Personal Providers

Stage all four untracked provider files together. Do not stage `providers/index.ts` without them.

```text
src/domain/self-media/providers/douyin-personal-provider.ts
src/domain/self-media/providers/xiaohongshu-personal-provider.ts
src/domain/self-media/providers/video-account-personal-provider.ts
src/domain/self-media/providers/bilibili-personal-provider.ts
```

Notes:

- These are platform-core critical because `providers/index.ts` exports them.
- Bilibili provider is active for public/archive content-level imports only.
- Bilibili account preview helpers inside the provider must remain diagnostics-only.

### 3. Proof Scripts / API / Tests / Package Scripts

Stage these active proof scripts:

```text
scripts/douyin-personal-import.mjs
scripts/douyin-personal-save-smoke.mjs
scripts/xiaohongshu-personal-import.mjs
scripts/xiaohongshu-personal-save-smoke.mjs
scripts/video-account-personal-import.mjs
scripts/video-account-personal-save-smoke.mjs
scripts/bilibili-personal-import.mjs
scripts/bilibili-personal-save-smoke.mjs
scripts/platform-personal-save-smoke.mjs
scripts/platform-operations-e2e-smoke.mjs
scripts/platform-ops-with-health-smoke.mjs
scripts/platform-data-health.mjs
```

Stage this active operations API:

```text
src/app/api/self-media/platform-imports/operations/route.ts
```

Stage these tests:

```text
tests/self-media-contract.test.ts
tests/ui-harness.test.mjs
```

Conditionally stage `package.json`:

```text
package.json
```

Package note:

- `package.json` is needed for the npm scripts used by the acceptance commands.
- Current `package.json` also contains broader script entries, including paused WeChat and diagnostics/ops commands. Before staging it as part of `platform-core-four`, the main session should explicitly accept this package-script widening or split package-script cleanup into a separate bundle.
- Do not stage `package-lock.json` in this bundle. Its `simple-icons` change belongs to the UI icon/dependency lane.

Optional package-script companions if the main session decides to stage current `package.json` as-is:

```text
scripts/douyin-personal-discovery.mjs
scripts/xiaohongshu-personal-discovery.mjs
scripts/video-account-personal-discovery.mjs
scripts/bilibili-personal-discovery.mjs
```

These discovery scripts are active-platform historical/operator companions, but they are not required by the six-command platform-core verification sequence.

### 4. Minimal Platform-Core UI Surfaces

Stage these tracked modified UI files only as the minimal active platform-core UI layer:

```text
src/app/import/page.tsx
src/domain/self-media/ui/screens/ImportPage.tsx
src/domain/self-media/ui/screens/DashboardPage.tsx
src/domain/self-media/ui/screens/ReviewsPage.tsx
src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx
src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx
src/domain/self-media/ui/components/PlatformBadge.tsx
```

Notes:

- `/import` is included for four-platform preview/save/save-smoke and operation results.
- `/dashboard` is included for four content-platform totals and account/content separation.
- `/reviews` is included for four-platform contribution plus default paused-WeChat evidence exclusion.
- `PlatformBadge.tsx` currently depends on `simple-icons`; the dependency/lockfile acceptance is a separate UI icon bundle risk unless main session widens this bundle.

### 5. Supporting Handoffs / Specs

Stage these current platform-core plan/proof handoffs:

```text
docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md
docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md
docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md
docs/handoffs/PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md
docs/handoffs/PLATFORM-CORE-STAGING-PLAN-048-worker-handoff.md
```

Stage these active platform specs:

```text
docs/product-specs/douyin-personal-v0.md
docs/product-specs/xiaohongshu-personal-v0.md
docs/product-specs/xiaohongshu-personal-v1.md
docs/product-specs/video-account-personal-v0.md
docs/product-specs/video-account-personal-v1.md
docs/product-specs/bilibili-personal-v0.md
```

Recommended lineage handoffs to stage with or immediately before the bundle if the main session wants full source-of-truth continuity:

```text
docs/handoffs/DOUYIN-PERSONAL-V1-METRICS-014-worker-handoff.md
docs/handoffs/DOUYIN-PERSONAL-V1-SAVE-SMOKE-015-worker-handoff.md
docs/handoffs/XIAOHONGSHU-PERSONAL-V1-METRICS-017-worker-handoff.md
docs/handoffs/XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md
docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017-worker-handoff.md
docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018-worker-handoff.md
docs/handoffs/BILIBILI-PERSONAL-V1-METRICS-021-worker-handoff.md
docs/handoffs/BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-worker-handoff.md
docs/handoffs/BILIBILI-PUBLIC-ONLY-029-worker-handoff.md
docs/handoffs/BILIBILI-PUBLIC-ONLY-029-orchestrator-review.md
docs/handoffs/PLATFORM-OPS-FOUR-024-worker-handoff.md
docs/handoffs/PLATFORM-OPS-FOUR-024-orchestrator-review.md
docs/handoffs/PLATFORM-OPERATIONS-E2E-SMOKE-027-worker-handoff.md
docs/handoffs/PLATFORM-OPERATIONS-E2E-SMOKE-027-orchestrator-review.md
docs/handoffs/PLATFORM-HEALTH-GATE-028-worker-handoff.md
docs/handoffs/PLATFORM-HEALTH-GATE-028-orchestrator-review.md
```

## Explicit Excluded File List

Do not stage these files in `platform-core-four`.

### Paused WeChat

```text
scripts/sync-wechat-official.ts
scripts/wechat-backend-discovery.mjs
src/app/api/self-media/wechat/sync/route.ts
docs/product-specs/wechat-001.md
docs/product-specs/wechat-backend-v0.md
docs/handoffs/WECHAT-001-worker-handoff.md
docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md
```

### Bilibili Account Diagnostics

```text
scripts/bilibili-account-metrics-preview.mjs
docs/product-specs/bilibili-account-metrics-022.md
docs/handoffs/BILIBILI-ACCOUNT-METRICS-SPEC-022-worker-handoff.md
docs/handoffs/BILIBILI-ACCOUNT-METRICS-PREVIEW-024-worker-handoff.md
docs/handoffs/BILIBILI-ACCOUNT-METRICS-STABILITY-025-worker-handoff.md
docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-worker-handoff.md
docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-orchestrator-review.md
```

### CSV / Legacy Import Preview

```text
src/domain/self-media/providers/csv-preset-provider.ts
src/app/api/self-media/import/preview/route.ts
docs/product-specs/import-real-011.md
docs/handoffs/IMPORT-REAL-011-worker-handoff.md
docs/handoffs/IMPORT-PREVIEW-UI-012-worker-handoff.md
```

### Tooling / Config / Dependency / Generated

```text
.gitignore
next-env.d.ts
next.config.mjs
package-lock.json
tsconfig.json
docs/generated/template-doctor-report.md
scripts/smoke-self-media.mjs
tests/agent-trajectory.test.mjs
```

Notes:

- `next-env.d.ts` and `tsconfig.json` were normalized by `GENERATED-NEXT-CONFIG-CLEANUP-048` and should remain out of this bundle.
- `package-lock.json` belongs to the `simple-icons` UI dependency lane.
- `tests/agent-trajectory.test.mjs` is governance/test evidence and includes historical paused WeChat evidence.

### Local Workflow / Runtime State

```text
.local/**
.agents/**
.codex/**
.trellis/**
```

### Broad UI / Workflow / Reporting Follow-Ups

```text
src/app/calendar/page.tsx
src/app/content/page.tsx
src/app/globals.css
src/app/api/self-media/action-items/route.ts
src/app/api/self-media/action-items/content/route.ts
src/app/api/self-media/content-versions/route.ts
src/app/api/self-media/content-workbench/route.ts
src/app/api/self-media/contents/trust-scope/route.ts
src/app/api/self-media/reports/trusted-weekly-safe/route.ts
src/domain/self-media/ui/components/SidebarNav.tsx
src/domain/self-media/ui/foundations/tokens.css
src/domain/self-media/ui/patterns/ContentManagement.tsx
src/domain/self-media/ui/patterns/PublishCalendar.tsx
src/domain/self-media/ui/primitives/Panel.tsx
src/domain/self-media/ui/screens/CalendarPage.tsx
src/domain/self-media/ui/screens/ContentPage.tsx
src/domain/self-media/ui/screens/LeadsPage.tsx
src/domain/self-media/ui/screens/OverviewPage.tsx
src/domain/self-media/ui/screens/UiLabPage.tsx
```

These likely belong to operator UI data-only, operating workflow APIs, reporting, or UI icon/dependency bundles.

## Required Commands Before Any Staging

Run serially from the repository root immediately before `git add`:

```powershell
git diff --check
npm run typecheck
npm run test:self-media
npm run smoke:platforms-save
npm run smoke:platform-operations-e2e
npm run smoke:platform-ops-with-health
git diff --check
```

If staging the minimal platform-core UI files in this same bundle, also run:

```powershell
npm run test:ui-harness
```

If the main session wants to rerun the live daily gate, do it only after confirming port 3200 is intentionally healthy and no overlapping browser/E2E smoke is active:

```powershell
npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

Do not make the live daily gate a prerequisite for `platform-core-four` staging unless the main session explicitly wants daily-gate closure in the same bundle.

## Suggested Staging Order

When the main session approves staging, add files in small reviewed groups:

1. Core layer files.
2. Four personal providers.
3. Proof scripts/API/tests.
4. Minimal UI files.
5. Supporting specs/handoffs.
6. `package.json` only after resolving the package-script widening note.

No `git add` was run by this task.

## Verification

- `git diff --check`: PASS.
- trailing-whitespace check on this handoff: PASS.

## Changed Files

This task changed only:

```text
docs/handoffs/PLATFORM-CORE-STAGING-PLAN-048-worker-handoff.md
```

## Orchestrator Decision Required

Yes.

Main session must approve the exact staging set, especially whether current `package.json` script widening is accepted in `platform-core-four` or split into a later tooling/package-script bundle.
