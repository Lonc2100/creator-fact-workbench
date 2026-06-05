# PLATFORM-CORE-BUNDLE-PLAN-048 worker handoff

Date: 2026-06-05
Mode: read-only planning handoff, no code/data edits, no staging, no commit.

## Context read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/CORE-LAYER-DIFF-ATTRIBUTION-048-auditor-handoff.md`
- `docs/handoffs/WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md`

## Bundle goal

Create a small, reviewable `platform-core` acceptance bundle for the current four active content-level platforms:

- Douyin
- Xiaohongshu
- Video Account
- Bilibili

This bundle should preserve the fixed layer order:

`Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI`

It must include the four currently untracked personal provider files, because `providers/index.ts` already exports them and a clean checkout would otherwise be broken.

## Active bundle file list

### 1. Types

- `src/domain/self-media/types/self-media-types.ts`

Notes:
- Accept only the shared four-platform content import/save contract, provenance fields, platform status/readiness types, operation history, and review/action types required by the current active surface.
- Treat WeChat-related type hunks as paused/historical compatibility only.
- Treat Bilibili account metric/date-key structures as preview/diagnostic boundary only; do not accept them as durable Bilibili account save approval.

### 2. Config

- `src/domain/self-media/config/self-media-config.ts`

Notes:
- Include four-platform readiness/status config needed by active import/save and health flows.
- Keep paused WeChat readiness/status entries out of the active acceptance narrative unless they are already required for compatibility.

### 3. Repo

- `src/domain/self-media/repo/sqlite-self-media-repo.ts`

Notes:
- Include repo changes needed for shared provenance, trusted real-data filtering, content metric persistence, clean profile cleanup, and account snapshot read/model support.
- Do not interpret `upsertAccountMetricSnapshot` or account snapshot rows as approval to save Bilibili account-level metrics. Current accepted Bilibili scope is archives/content-level save only.

### 4. Providers

Required untracked personal providers:

- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
- `src/domain/self-media/providers/video-account-personal-provider.ts`
- `src/domain/self-media/providers/bilibili-personal-provider.ts`

Tracked provider index:

- `src/domain/self-media/providers/index.ts`

Provider notes:
- These five files are the minimum active provider bundle.
- Bilibili provider can be accepted for archives/content-level import/save. Account/date-key preview helpers remain diagnostic only.
- `src/domain/self-media/providers/csv-preset-provider.ts` should stay outside this active platform-core bundle. It belongs to import preview/legacy CSV coverage, not current four-platform raw capture.

### 5. Service

- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/service/review-service.ts`

Notes:
- Include four-platform import/save orchestration, trusted scope filtering, platform operations, content library/workbench support, review evidence wording, and action-to-content flow only where tied to active platform data.
- Keep WeChat sync/service branches outside the active bundle; if they remain in shared files, mark them explicitly as paused compatibility rather than accepted active scope.

### 6. Runtime

- `src/domain/self-media/runtime/self-media-runtime.ts`

Notes:
- Include active four-platform runtime import/save/operations wiring.
- Exclude paused WeChat sync runtime behavior from the active bundle even if shared runtime file contains historical branches.

### 7. UI

Recommended active UI files to carry the four-platform core closure through the operator surface:

- `src/app/import/page.tsx`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/screens/ReviewsPage.tsx`
- `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`
- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `src/domain/self-media/ui/components/PlatformBadge.tsx`

UI notes:
- Include only data-backed, active-platform UI behavior: import entry, dashboard/review visibility, evidence wording, and platform labels.
- Do not pull broad secondary-surface polish or unrelated layout cleanup into this bundle.
- If `PlatformBadge.tsx` is included, confirm it is only supporting active platform labels/status and not widening scope.

## Supporting files for acceptance

These are not core layers, but should be reviewed with the bundle because they prove or exercise the active four-platform path:

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
- `scripts/daily-platform-ops-gate.mjs`
- `src/app/api/self-media/platform-imports/operations/route.ts`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `package.json`

Package note:
- Include `package.json` only for scripts needed by the acceptance commands.
- Keep `package-lock.json` in a tooling/config-policy lane unless a separate dependency-change reason is proven.

## Explicit exclusions from active platform-core

Paused WeChat files must not be included in the active bundle:

- `scripts/sync-wechat-official.ts`
- `scripts/wechat-backend-discovery.mjs`
- `src/app/api/self-media/wechat/sync/route.ts`
- `docs/product-specs/wechat-001.md`
- `docs/product-specs/wechat-backend-v0.md`
- `docs/handoffs/WECHAT-001-worker-handoff.md`
- `docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md`

Other exclusions:

- `src/domain/self-media/providers/csv-preset-provider.ts` - import preview/CSV preset path, not active platform raw capture.
- `scripts/bilibili-account-metrics-preview.mjs` - optional diagnostics only; account-level metrics are preview-only.
- `.local/**` - runtime evidence/data.
- `.agents/**`, `.codex/**`, `.trellis/**` - local tooling state.
- Broad UI polish or secondary-surface files not required to prove the active four-platform closed loop.

## Recommended acceptance command order

Run from repository root.

1. Inventory only:

   ```powershell
   git diff --name-only
   git ls-files --others --exclude-standard
   ```

2. Static check:

   ```powershell
   git diff --check
   npm run typecheck
   ```

3. Core contract:

   ```powershell
   npm run test:self-media
   ```

4. Four-platform save smoke:

   ```powershell
   npm run smoke:platforms-save
   ```

5. Platform operations smoke:

   ```powershell
   npm run smoke:platform-operations-e2e
   npm run smoke:platform-ops-with-health
   ```

6. Optional live operator gate, only when localhost 3200 is intentionally running and healthy:

   ```powershell
   npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
   ```

7. UI harness, if UI files are accepted in this bundle:

   ```powershell
   npm run verify:harness
   ```

8. Final whitespace check:

   ```powershell
   git diff --check
   ```

## Possible conflicts and guardrails

- Do not run `smoke:platform-operations-e2e`, curation E2E, and browser gates in parallel. They may contend for local server/database state.
- Do not run daily platform ops gate against a stale or unknown localhost 3200 server. First confirm the server is intentionally running and healthy.
- If a smoke command writes runtime evidence, confirm it uses isolated smoke data and does not mutate the operator's real `.local/self-media.sqlite`.
- The four untracked provider files must be accepted before clean-checkout validation; otherwise `providers/index.ts` exports missing modules.
- Shared files contain paused WeChat branches. Acceptance notes must separate active four-platform scope from paused WeChat compatibility.
- Bilibili account metric preview helpers must not become durable save scope by accident.
- `package-lock.json` and broad tooling config changes need separate attribution before entering any mainline bundle.

## Recommendation

Proceed with a narrow `platform-core-four` bundle first:

`Types -> Config -> Repo -> Providers -> Service -> Runtime`, plus the minimal UI files that demonstrate active four-platform data-only behavior.

Hold WeChat paused files, CSV/import-preview files, Bilibili account diagnostics, and unrelated tooling/UI polish for separate review lanes.
