# PLATFORM-CORE-STAGING-DRYRUN-049 Worker Handoff

Date: 2026-06-05

## Task ID

PLATFORM-CORE-STAGING-DRYRUN-049

## Scope

Final dry-run verification and pre-staging manifest check for `platform-core-four`.

Boundaries kept:

- Did not run `git add`.
- Did not stage.
- Did not commit.
- Did not delete files.
- Did not change business logic.
- Ran heavy verification commands serially; no browser/E2E/Next/sqlite/live 3200 gate was run in parallel.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/PLATFORM-CORE-STAGING-PLAN-048-worker-handoff.md`
- `docs/handoffs/PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`
- `docs/handoffs/BUNDLE-SCOPE-RESOLVE-049-auditor-handoff.md`

## Boundary Confirmation

The active platform-core boundary remains:

- Douyin: active content-level personal provider loop.
- Xiaohongshu: active content-level personal provider loop.
- Video Account: active content-level personal provider loop.
- Bilibili: active public/archive content-level personal provider loop.
- WeChat Official Account/backend: paused, not active platform-core.
- Bilibili account metrics: preview/diagnostics-only; no durable account snapshot save approval.

Dry-run evidence:

- `npm run test:self-media`: PASS, 122/122. Includes WeChat pause and Bilibili preview-only boundary tests.
- `npm run smoke:platforms-save`: PASS. Report listed `douyin`, `xiaohongshu`, `video-account`, and `bilibili`.
- `npm run smoke:platform-operations-e2e`: PASS. Operation history rows: 9.
- `npm run smoke:platform-ops-with-health`: PASS, status `ok`.

## Final Staging Manifest

### Include

Recommended `platform-core-four` include set without whole-file `package.json`:

| Group | Files |
| --- | --- |
| Core layer | `src/domain/self-media/types/self-media-types.ts`; `src/domain/self-media/config/self-media-config.ts`; `src/domain/self-media/repo/sqlite-self-media-repo.ts`; `src/domain/self-media/providers/index.ts`; `src/domain/self-media/service/self-media-service.ts`; `src/domain/self-media/service/review-service.ts`; `src/domain/self-media/runtime/self-media-runtime.ts` |
| Personal providers | `src/domain/self-media/providers/douyin-personal-provider.ts`; `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`; `src/domain/self-media/providers/video-account-personal-provider.ts`; `src/domain/self-media/providers/bilibili-personal-provider.ts` |
| Proof scripts | `scripts/douyin-personal-import.mjs`; `scripts/douyin-personal-save-smoke.mjs`; `scripts/xiaohongshu-personal-import.mjs`; `scripts/xiaohongshu-personal-save-smoke.mjs`; `scripts/video-account-personal-import.mjs`; `scripts/video-account-personal-save-smoke.mjs`; `scripts/bilibili-personal-import.mjs`; `scripts/bilibili-personal-save-smoke.mjs`; `scripts/platform-personal-save-smoke.mjs`; `scripts/platform-operations-e2e-smoke.mjs`; `scripts/platform-ops-with-health-smoke.mjs`; `scripts/platform-data-health.mjs` |
| API/tests | `src/app/api/self-media/platform-imports/operations/route.ts`; `tests/self-media-contract.test.ts`; `tests/ui-harness.test.mjs` |
| Minimal UI | `src/app/import/page.tsx`; `src/domain/self-media/ui/screens/ImportPage.tsx`; `src/domain/self-media/ui/screens/DashboardPage.tsx`; `src/domain/self-media/ui/screens/ReviewsPage.tsx`; `src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx`; `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx` |
| Supporting specs | `docs/product-specs/douyin-personal-v0.md`; `docs/product-specs/xiaohongshu-personal-v0.md`; `docs/product-specs/xiaohongshu-personal-v1.md`; `docs/product-specs/video-account-personal-v0.md`; `docs/product-specs/video-account-personal-v1.md`; `docs/product-specs/bilibili-personal-v0.md` |
| Supporting handoffs | `docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md`; `docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md`; `docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`; `docs/handoffs/PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md`; `docs/handoffs/PLATFORM-CORE-STAGING-PLAN-048-worker-handoff.md`; `docs/handoffs/BUNDLE-SCOPE-RESOLVE-049-auditor-handoff.md`; `docs/handoffs/PLATFORM-CORE-STAGING-DRYRUN-049-worker-handoff.md` |

### Exclude

Explicitly exclude from `platform-core-four`:

| Group | Files |
| --- | --- |
| Paused WeChat | `scripts/sync-wechat-official.ts`; `scripts/wechat-backend-discovery.mjs`; `src/app/api/self-media/wechat/sync/route.ts`; `docs/product-specs/wechat-001.md`; `docs/product-specs/wechat-backend-v0.md`; `docs/handoffs/WECHAT-001-worker-handoff.md`; `docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md` |
| Bilibili account diagnostics | `scripts/bilibili-account-metrics-preview.mjs`; `docs/product-specs/bilibili-account-metrics-022.md`; `docs/handoffs/BILIBILI-ACCOUNT-METRICS-SPEC-022-worker-handoff.md`; `docs/handoffs/BILIBILI-ACCOUNT-METRICS-PREVIEW-024-worker-handoff.md`; `docs/handoffs/BILIBILI-ACCOUNT-METRICS-STABILITY-025-worker-handoff.md`; `docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-worker-handoff.md`; `docs/handoffs/BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027-orchestrator-review.md` |
| CSV/import-preview | `src/domain/self-media/providers/csv-preset-provider.ts`; `src/app/api/self-media/import/preview/route.ts`; `docs/product-specs/import-real-011.md`; `docs/handoffs/IMPORT-REAL-011-worker-handoff.md`; `docs/handoffs/IMPORT-PREVIEW-UI-012-worker-handoff.md` |
| Next/tooling/config/dependency | `.gitignore`; `next-env.d.ts`; `next.config.mjs`; `package-lock.json`; `tsconfig.json`; `scripts/smoke-self-media.mjs`; `tests/agent-trajectory.test.mjs`; `docs/generated/template-doctor-report.md` |
| UI icon dependency | `src/domain/self-media/ui/components/PlatformBadge.tsx`; `package-lock.json`; `docs/product-specs/ui-calendar-metricool-005.md`; `docs/product-specs/ui-calendar-metricool-006.md`; `docs/handoffs/UI-CALENDAR-METRICOOL-005-worker-handoff.md`; `docs/handoffs/UI-CALENDAR-METRICOOL-006-worker-handoff.md` |
| Broad UI/workflow/reporting | `src/app/calendar/page.tsx`; `src/app/content/page.tsx`; `src/app/globals.css`; `src/app/api/self-media/action-items/route.ts`; `src/app/api/self-media/action-items/content/route.ts`; `src/app/api/self-media/content-versions/route.ts`; `src/app/api/self-media/content-workbench/route.ts`; `src/app/api/self-media/contents/trust-scope/route.ts`; `src/app/api/self-media/reports/trusted-weekly-safe/route.ts`; `src/domain/self-media/ui/components/SidebarNav.tsx`; `src/domain/self-media/ui/foundations/tokens.css`; `src/domain/self-media/ui/patterns/ContentManagement.tsx`; `src/domain/self-media/ui/patterns/PublishCalendar.tsx`; `src/domain/self-media/ui/primitives/Panel.tsx`; `src/domain/self-media/ui/screens/CalendarPage.tsx`; `src/domain/self-media/ui/screens/ContentPage.tsx`; `src/domain/self-media/ui/screens/LeadsPage.tsx`; `src/domain/self-media/ui/screens/OverviewPage.tsx`; `src/domain/self-media/ui/screens/UiLabPage.tsx` |
| Local workflow/state | `.local/**`; `.agents/**`; `.codex/**`; `.trellis/**` |

### Unresolved

| Item | Dry-run decision |
| --- | --- |
| `package.json` whole file | Unresolved for whole-file staging. It mixes platform-core scripts, paused WeChat scripts, Bilibili account diagnostics, next/operator tooling, daily/reporting workflows, UI E2E commands, and `simple-icons`. |
| Platform package script hunks | Acceptable only via hunk-level staging or a follow-up package cleanup task. |
| `PlatformBadge.tsx` | Not recommended for `platform-core-four`; belongs to `ui-icon-dependency` because it imports `simple-icons` and relies on `.platform-logo*` CSS from broad `globals.css`. |
| `src/app/globals.css` icon CSS | Needs later split/extraction or acceptance in a broader UI bundle. |
| Discovery scripts | Active-platform companions, but not required by the six-command dry-run sequence. Include only if main session accepts package-script widening or wants discovery commands in platform-core. |

## Package.json Variants

### Variant A: Without `package.json`

Recommended default for clean platform-core staging.

Include:

- All include files listed above.
- No `package.json`.
- No `package-lock.json`.

Pros:

- Avoids accidentally pulling paused WeChat, diagnostics, daily ops, UI E2E, next-dist tooling, and `simple-icons` into platform-core.
- Keeps the platform-core staged set aligned with the source/runtime/provider/API/test files actually proved by the dry-run.

Cons:

- Fresh checkout would not expose the npm script names unless package-script hunks are staged in a later package bundle.

### Variant B: With `package.json`

Only acceptable with hunk-level staging or prior package cleanup.

Acceptable platform-core hunks:

```text
discover:douyin
discover:xiaohongshu
discover:video-account
discover:bilibili
import:douyin
import:xiaohongshu
import:video-account
import:bilibili
health:platform-data
smoke:douyin-save
smoke:xiaohongshu-save
smoke:video-account-save
smoke:bilibili-save
smoke:platforms-save
smoke:platform-operations-e2e
smoke:platform-ops-with-health
```

Do not include these hunks in platform-core:

```text
sync:wechat
discover:wechat-backend
preview:bilibili-account-metrics
check:browser
check:real-capture-freshness
check:local-data-quarantine
check:local-server-health
audit:trusted-dashboard
audit:dashboard-numbers
check:clean-profile
report:trusted-weekly
report:trusted-weekly:safe
report:daily-ops:safe
e2e:content-curation
smoke:operating-dashboard-import
smoke:operating-action-to-content
smoke:draft-review-ui-e2e
smoke:calendar-real-scheduling
gate:daily-platform-ops
ops:daily-self-media
dev:operator
dev/start port 3200 changes
simple-icons dependency
```

Conclusion: do not stage current `package.json` whole file into `platform-core-four`.

## Verification Results

Commands were run serially in the requested order.

| Step | Command | Result | Notes |
| --- | --- | --- | --- |
| 1 | `git diff --check` | PASS | No whitespace errors. |
| 2 | `npm run typecheck` | PASS | `tsc --noEmit`. |
| 3 | `npm run test:self-media` | PASS | 122/122 tests passed. |
| 4 | `npm run smoke:platforms-save` | PASS | Report: `.local/platform-personal-save-smoke/report.json`; platforms: Douyin, Xiaohongshu, Video Account, Bilibili. |
| 5 | `npm run smoke:platform-operations-e2e` | PASS | Report: `.local/platform-operations-e2e/report.json`; screenshot: `.local/platform-operations-e2e/screenshot.png`; operation history rows: 9. |
| 6 | `npm run smoke:platform-ops-with-health` | PASS | Status `ok`; reports under `.local/platform-ops-with-health/`. |
| 7 | `npm run test:ui-harness` | PASS | 15/15 tests passed because the dry-run include set contains UI files/tests. |

No command failed. No blocker was found for `platform-core-four` dry-run under Variant A.

## Generated Config Pollution Note

During `smoke:platform-operations-e2e`, Next regenerated timestamped `.next-platform-operations-e2e-*` references into:

- `next-env.d.ts`
- `tsconfig.json`

Those generated paths were normalized back to the stable configuration from `GENERATED-NEXT-CONFIG-CLEANUP-048`:

- `./.next/types/routes.d.ts`
- `.next/types/**/*.ts`

After normalization, `git status --short -- next-env.d.ts tsconfig.json` is clean and no timestamped `.next-*` references remain in those files.

## Staging Recommendation

Proceed to staging planning for Variant A only:

- `platform-core-four` without whole-file `package.json`.
- Keep package-script hunks for a later package-specific staging pass or hunk-level main-session staging.
- Keep `PlatformBadge.tsx`, `simple-icons`, `package-lock.json`, `.gitignore`, and `next.config.mjs` in their separate 049 bundles.

Before actual staging, rerun at least:

```powershell
git diff --check
npm run typecheck
npm run test:self-media
npm run smoke:platforms-save
npm run smoke:platform-operations-e2e
npm run smoke:platform-ops-with-health
npm run test:ui-harness
```

## Changed Files

This task wrote:

```text
docs/handoffs/PLATFORM-CORE-STAGING-DRYRUN-049-worker-handoff.md
```

This task also normalized generated Next/TypeScript config pollution in:

```text
next-env.d.ts
tsconfig.json
```

Those two config files now match the stable baseline again and are not dirty.

## Orchestrator Decision Required

Yes.

Main session should decide whether to stage Variant A now, or first create a package-script cleanup/hunk-staging plan for `package.json`.
