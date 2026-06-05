# BUNDLE-SCOPE-RESOLVE-049 Auditor Handoff

Date: 2026-06-05

## Task ID

BUNDLE-SCOPE-RESOLVE-049

## Scope

Resolve the 048 bundle-scope leftovers for:

- `package.json`
- `package-lock.json`
- `src/domain/self-media/ui/components/PlatformBadge.tsx`
- `.gitignore`
- `next.config.mjs`
- package scripts
- `simple-icons`

Boundaries kept:

- Did not stage.
- Did not commit.
- Did not delete files.
- Did not modify business code.
- Wrote only this handoff.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/PLATFORM-CORE-STAGING-PLAN-048-worker-handoff.md`
- `docs/handoffs/TOOLING-CONFIG-ATTRIBUTION-048-auditor-handoff.md`
- `docs/handoffs/GENERATED-NEXT-CONFIG-CLEANUP-048-worker-handoff.md`
- `docs/handoffs/LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`

## Diff Reviewed

Target dirty files:

```text
 M .gitignore
 M next.config.mjs
 M package-lock.json
 M package.json
 M src/domain/self-media/ui/components/PlatformBadge.tsx
```

Confirmed `next-env.d.ts` and `tsconfig.json` are no longer dirty after `GENERATED-NEXT-CONFIG-CLEANUP-048`.

## Findings

### `.gitignore`

Observed change:

```text
+ .next-*/
```

Attribution:

- Belongs to `next-dist-tooling`.
- Evidence: `TOOLING-CONFIG-ATTRIBUTION-048` and accepted 039 `NEXT_DIST_DIR` hardening.
- Not platform-core business logic.

Decision:

- Do not include in `platform-core-four`.
- Include with `next.config.mjs` in `next-dist-tooling`.

### `next.config.mjs`

Observed change:

```js
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next"
};
```

Attribution:

- Belongs to `next-dist-tooling`.
- Purpose is isolated Next dist dirs for concurrent smoke/E2E/dev runs.
- Evidence: `DAILY-OPS-PREFLIGHT-039` and `DRAFT-REVIEW-UI-E2E-039` as summarized by `TOOLING-CONFIG-ATTRIBUTION-048`.

Decision:

- Do not include in `platform-core-four`.
- Include with `.gitignore` in `next-dist-tooling`.

### `package-lock.json`

Observed change:

- Adds `simple-icons@16.22.0`.
- Matches the `package.json` dependency addition.

Attribution:

- Belongs to `ui-icon-dependency`.
- Direct usage: `PlatformBadge.tsx` imports `siBilibili`, `siTiktok`, `siWechat`, and `siXiaohongshu` from `simple-icons`.
- Evidence: `UI-CALENDAR-METRICOOL-005` and `TOOLING-CONFIG-ATTRIBUTION-048`.

Decision:

- Do not include in `platform-core-four`.
- Must travel with the matching `package.json` dependency hunk and `PlatformBadge.tsx`.
- Do not stage `package-lock.json` alone.

### `PlatformBadge.tsx`

Observed change:

- Imports `simple-icons`.
- Adds `PlatformIcon`.
- Replaces text short-label dot with SVG platform icons.
- Uses WeChat icon path for both `wechat` and `video_account`.

Attribution:

- Primary attribution is `ui-icon-dependency`, not platform-core.
- It supports active platform display, but the actual diff is a visual/icon dependency change.
- It also touches paused/historical `wechat` rendering because `Platform` includes `wechat`.

Important dependency note:

- `PlatformBadge.tsx` relies on `.platform-logo*` CSS in `src/app/globals.css`.
- `src/app/globals.css` is a broad mixed UI diff, not a clean icon-only file.

Decision:

- Do not include current `PlatformBadge.tsx` in `platform-core-four` unless the main session explicitly widens platform-core to include the full UI icon dependency lane.
- Recommended: stage in `ui-icon-dependency` with `package.json`, `package-lock.json`, and the required CSS/supporting UI spec evidence.
- If a cleaner bundle is required, split/extract icon CSS first; do not stage broad `globals.css` only because `PlatformBadge.tsx` needs `.platform-logo*`.

### `package.json`

Observed changes:

1. Port/default dev tooling:
   - `dev` and `start` move from port 3001 to 3200.
   - Adds `dev:operator`.
2. Active platform-core scripts:
   - four active platform discovery/import scripts.
   - four active platform save smokes.
   - `smoke:platforms-save`.
   - `smoke:platform-operations-e2e`.
   - `smoke:platform-ops-with-health`.
   - `health:platform-data`.
3. Paused WeChat scripts:
   - `sync:wechat`.
   - `discover:wechat-backend`.
   - existing `check:wechat` remains.
4. Diagnostics/account preview:
   - `preview:bilibili-account-metrics`.
5. Operating workflow/daily/reporting/UI E2E scripts:
   - local server health, trusted audits, clean profile, weekly/daily reports, content curation, operating smokes, draft review, calendar scheduling, daily gate, daily ops.
6. Dependency:
   - adds `simple-icons`.

Attribution:

- Current `package.json` is a mixed file spanning at least four bundles:
  - `platform-core-four`
  - `ui-icon-dependency`
  - `next-dist-tooling` / local operator tooling
  - later ops/reporting/governance/paused historical bundles

Decision:

- Current `package.json` cannot be accepted wholesale with `platform-core-four`.
- It must be split, either through a future code/package cleanup task or through careful hunk-level staging by the main session.
- If staged wholesale, it would accidentally include paused WeChat entrypoints, Bilibili account preview diagnostics, daily ops/reporting scripts, UI E2E scripts, and `simple-icons` dependency into platform-core.

## Final Recommendation: `platform-core-four` Acceptable Files

Accept platform-core only after verification rerun. Recommended file set:

### Core layer

```text
src/domain/self-media/types/self-media-types.ts
src/domain/self-media/config/self-media-config.ts
src/domain/self-media/repo/sqlite-self-media-repo.ts
src/domain/self-media/providers/index.ts
src/domain/self-media/service/self-media-service.ts
src/domain/self-media/service/review-service.ts
src/domain/self-media/runtime/self-media-runtime.ts
```

### Personal providers

```text
src/domain/self-media/providers/douyin-personal-provider.ts
src/domain/self-media/providers/xiaohongshu-personal-provider.ts
src/domain/self-media/providers/video-account-personal-provider.ts
src/domain/self-media/providers/bilibili-personal-provider.ts
```

### Proof scripts/API/tests

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
src/app/api/self-media/platform-imports/operations/route.ts
tests/self-media-contract.test.ts
tests/ui-harness.test.mjs
```

### Minimal UI surfaces

Keep these platform-core UI files except `PlatformBadge.tsx`, which should move to `ui-icon-dependency` unless the bundle is widened:

```text
src/app/import/page.tsx
src/domain/self-media/ui/screens/ImportPage.tsx
src/domain/self-media/ui/screens/DashboardPage.tsx
src/domain/self-media/ui/screens/ReviewsPage.tsx
src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx
src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx
```

### Supporting specs/handoffs

```text
docs/product-specs/douyin-personal-v0.md
docs/product-specs/xiaohongshu-personal-v0.md
docs/product-specs/xiaohongshu-personal-v1.md
docs/product-specs/video-account-personal-v0.md
docs/product-specs/video-account-personal-v1.md
docs/product-specs/bilibili-personal-v0.md
docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md
docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md
docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md
docs/handoffs/PLATFORM-CORE-ACTIVE-MANIFEST-048-worker-handoff.md
docs/handoffs/PLATFORM-CORE-STAGING-PLAN-048-worker-handoff.md
docs/handoffs/BUNDLE-SCOPE-RESOLVE-049-auditor-handoff.md
```

### Package script handling for platform-core

Do not stage current `package.json` wholesale with this bundle.

Acceptable platform-core package script hunks, if the main session stages hunks rather than whole file:

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

Do not include these package script hunks in platform-core:

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

## Final Recommendation: `ui-icon-dependency` Bundle Files

Recommended clean bundle:

```text
src/domain/self-media/ui/components/PlatformBadge.tsx
package.json
package-lock.json
docs/product-specs/ui-calendar-metricool-005.md
docs/product-specs/ui-calendar-metricool-006.md
docs/handoffs/UI-CALENDAR-METRICOOL-005-worker-handoff.md
docs/handoffs/UI-CALENDAR-METRICOOL-006-worker-handoff.md
```

Required supporting CSS:

```text
src/app/globals.css
```

CSS caution:

- `globals.css` currently contains broad mixed UI changes, not just `.platform-logo*`.
- Either split/extract the icon CSS first, or stage `globals.css` only in a broader UI bundle that accepts the whole file.

Package caution:

- `package.json` must include only the `simple-icons` dependency hunk for this bundle if using hunk-level staging.
- Do not include platform scripts, paused WeChat scripts, next-dist tooling, or daily ops scripts in the UI icon dependency bundle.

Recommended verification before accepting:

```powershell
npm run typecheck
npm run test:ui-harness
git diff --check
```

If calendar icon behavior is included through current CSS/calendar files, also run the relevant calendar/UI smoke from its owning UI bundle.

## Final Recommendation: `next-dist-tooling` Bundle Files

Recommended bundle:

```text
.gitignore
next.config.mjs
docs/handoffs/TOOLING-CONFIG-ATTRIBUTION-048-auditor-handoff.md
docs/handoffs/GENERATED-NEXT-CONFIG-CLEANUP-048-worker-handoff.md
docs/handoffs/BUNDLE-SCOPE-RESOLVE-049-auditor-handoff.md
```

Optional if the main session wants operator port scripts in the same tooling lane:

```text
package.json
scripts/start-operator-dev.mjs
```

Package caution:

- Current `package.json` cannot be staged wholesale for next-dist-tooling either, because it includes platform scripts, paused WeChat, reporting, UI E2E, and `simple-icons`.
- If included here, stage only `dev`, `start`, and `dev:operator` hunks plus `scripts/start-operator-dev.mjs`.

Recommended verification before accepting:

```powershell
npm run typecheck
git diff --check
```

If validating isolated dist behavior, run one representative smoke/E2E with `NEXT_DIST_DIR` in a quiet session.

## Code Fix Recommendations Only

No code fixes were made. Recommended future fixes/splits:

1. Split `package.json` into bundle-specific hunks before staging:
   - platform scripts
   - `simple-icons` dependency
   - next/operator dev tooling
   - paused WeChat/diagnostics/later ops
2. Avoid staging current `PlatformBadge.tsx` without its `simple-icons` dependency and required `.platform-logo*` CSS.
3. Extract or isolate `.platform-logo*` CSS from the broad `globals.css` diff if the main session wants a small `ui-icon-dependency` bundle.
4. Keep `next-env.d.ts` and `tsconfig.json` out of these bundles; they are already normalized by `GENERATED-NEXT-CONFIG-CLEANUP-048`.

## Verification

- `git diff --check`: PASS.
- trailing-whitespace check on this handoff: PASS.

## Changed Files

This auditor changed only:

```text
docs/handoffs/BUNDLE-SCOPE-RESOLVE-049-auditor-handoff.md
```

## Orchestrator Decision Required

Yes.

Main session must decide whether to use hunk-level staging or a follow-up package cleanup task before staging. The current whole-file `package.json` is too mixed to belong to any one of the three bundles.
