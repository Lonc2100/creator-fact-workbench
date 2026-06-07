# TOOLING-CONFIG-ATTRIBUTION-048 Auditor Handoff

Date: 2026-06-05

## Task ID

TOOLING-CONFIG-ATTRIBUTION-048

## Scope

Read-only attribution audit for selected tooling/config dirty files:

- `.gitignore`
- `next-env.d.ts`
- `next.config.mjs`
- `package-lock.json`
- `scripts/smoke-self-media.mjs`
- `tsconfig.json`
- `tests/agent-trajectory.test.mjs`

No business code, data, tracked source files, package files, scripts, or Git staging state were modified. The only written file is this handoff.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md`
- `docs/handoffs/WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md`
- `docs/handoffs/LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md`

Additional attribution context read:

- `docs/handoffs/DAILY-OPS-PREFLIGHT-039-orchestrator-review.md`
- `docs/handoffs/DRAFT-REVIEW-UI-E2E-039-orchestrator-review.md`
- `docs/handoffs/CONTENT-DRAFT-REVIEW-038-orchestrator-review.md`
- `docs/handoffs/UI-CALENDAR-METRICOOL-005-worker-handoff.md`
- `docs/product-specs/ui-calendar-metricool-005.md`

## Dirty Snapshot

Target file status:

```text
 M .gitignore
 M next-env.d.ts
 M next.config.mjs
 M package-lock.json
 M scripts/smoke-self-media.mjs
 M tests/agent-trajectory.test.mjs
 M tsconfig.json
```

Adjacent package context observed:

```text
 M package.json
```

Target plus package diff stat:

```text
.gitignore                       1 insertion
next-env.d.ts                    1 insertion, 1 deletion
next.config.mjs                  3 insertions, 1 deletion
package-lock.json                21 insertions, 1 deletion
package.json                     41 insertions, 3 deletions
scripts/smoke-self-media.mjs     47 insertions, 25 deletions
tests/agent-trajectory.test.mjs  6 insertions, 2 deletions
tsconfig.json                    33 insertions, 1 deletion
```

## Attribution Matrix

| File | Observed dirty change | Existing handoff evidence | Needs supplemental acceptance | Leave to tooling-config-policy bundle | Package-lock risk |
| --- | --- | --- | --- | --- | --- |
| `.gitignore` | Adds `.next-*/` ignore for isolated Next build dirs. | Yes. `DAILY-OPS-PREFLIGHT-039-orchestrator-review.md` explicitly accepted `.gitignore` ignoring `.next-*/` after NEXT_DIST_DIR hardening. | Low. Re-run tooling bundle verification before staging. | Yes. Pair with `next.config.mjs`; do not mix into platform-core/UI-only bundles by implication. | No direct lockfile risk. |
| `next.config.mjs` | Adds `distDir: process.env.NEXT_DIST_DIR || ".next"`. | Yes. Accepted by `DAILY-OPS-PREFLIGHT-039-orchestrator-review.md` and `DRAFT-REVIEW-UI-E2E-039-orchestrator-review.md` to avoid shared `.next` collisions. | Low-to-medium. Verify with `npm run typecheck`, a representative isolated E2E/smoke using `NEXT_DIST_DIR`, and `git diff --check` before staging. | Yes. This is tooling/runtime-server config, not platform-core business logic. | No direct lockfile risk. |
| `next-env.d.ts` | Rewrites route types reference from `./.next/types/routes.d.ts` to one timestamped `.next-platform-operations-e2e-.../types/routes.d.ts`. | No accepted handoff evidence found for this exact change. It looks like generated Next type-path pollution from a temporary dist dir. | Yes. Do not accept as-is. Needs cleanup/normalization in a tooling-config cleanup task. | Yes, but as cleanup/normalization, not as an accepted feature change. | No lockfile risk, but high reproducibility risk if committed as-is. |
| `tsconfig.json` | Adds many timestamped `.next-*` type include paths and moves a timestamped include to the end. | No accepted handoff evidence for committing these generated paths. Many handoffs mention only the existing CRLF warning. `CONTENT-WORKBENCH-FILTERS-040-worker-handoff.md` says similar Next-generated `tsconfig` changes were restored before final verification. | Yes. Do not accept as-is. Needs tooling cleanup to restore stable includes and prevent temporary dist paths from persisting. | Yes, but as generated-config cleanup. | No lockfile risk, but high TypeScript config drift risk. |
| `package-lock.json` | Adds `simple-icons@16.22.0`, matching `package.json` dependency. | Yes, direct evidence exists in `UI-CALENDAR-METRICOOL-005-worker-handoff.md`; task board marks `UI-CALENDAR-METRICOOL-005` Done. `PlatformBadge.tsx` imports `simple-icons`. | Medium. Dependency changes must be staged with `package.json` and the UI/icon files that use the dependency, then verified. | Yes, or a dedicated UI dependency/icon bundle. Do not include in platform-core unless package script/dependency scope is explicitly approved. | Yes. Bounded but real: lockfile must not be omitted if `package.json` keeps `simple-icons`; also do not stage lockfile alone. |
| `scripts/smoke-self-media.mjs` | Legacy smoke starts from 3201, kills Windows process tree with `taskkill`, uses `confirm_publish`, preserves trusted totals after non-trusted smoke imports, softens editor/drag assumptions, and reports trusted-scope fields. | Partial. `CONTENT-DRAFT-REVIEW-038-orchestrator-review.md` explicitly accepted `confirm_publish`, trusted-scope smoke behavior, and Windows cleanup. Older UI/smoke handoffs also use `npm run test:smoke`, but not every current diff hunk has exact handoff evidence. | Yes. Needs a legacy smoke/tooling acceptance pass before staging, ideally `npm run test:smoke` plus harness checks in an isolated environment. | Yes. This is legacy smoke/tooling, not active platform-core or 047 reviews bundle. | No direct lockfile risk. |
| `tests/agent-trajectory.test.mjs` | Adds `BROWSER-AUTO-001` and `WECHAT-001` rows/specs/handoffs to durable evidence checks. | Partial. Task board has both rows Done, and their handoffs/specs exist. However, current platform status says WeChat Official Account/backend is paused, so this must be treated as historical evidence only. | Yes. Needs governance/test bundle validation with `npm run test:agent-trajectory`; verify it does not reopen WeChat active scope. | Yes. Better grouped with docs/governance/tooling tests, not platform-core. | No direct lockfile risk. |

## Package-Lock Risk Assessment

`package-lock.json` is not unexplained drift anymore: direct evidence exists from `UI-CALENDAR-METRICOOL-005-worker-handoff.md`, and current source imports `simple-icons` from `src/domain/self-media/ui/components/PlatformBadge.tsx`.

Risk remains medium because:

- `package-lock.json` must travel with the matching `package.json` dependency and UI icon usage.
- Staging `package-lock.json` without `package.json` would create a misleading lock-only change.
- Staging `package.json` without `package-lock.json` would make fresh installs less reproducible.
- `simple-icons` is a new runtime dependency, so it belongs in a dependency/UI icon acceptance bundle, not a silent tooling cleanup.

This audit found no additional package-lock-only dependency drift beyond `simple-icons`.

## Active Bundle Boundary

These files should not be folded into the active platform-core bundle by default:

- `next-env.d.ts` and `tsconfig.json` are generated temporary-dist pollution candidates.
- `scripts/smoke-self-media.mjs` is legacy smoke tooling.
- `tests/agent-trajectory.test.mjs` is governance/test evidence tooling and includes historical paused WeChat evidence.
- `package-lock.json` belongs with dependency/UI icon policy, not Types/Config/Repo/Providers/Service/Runtime.

`.gitignore` and `next.config.mjs` are accepted tooling hardening for isolated Next dist dirs, but they should still be packaged as a tooling/config pair.

## Recommended Next Acceptance Path

1. `next-dist-tooling`: stage only `.gitignore` and `next.config.mjs` after confirming `NEXT_DIST_DIR` behavior with a representative isolated smoke/E2E and `npm run typecheck`.
2. `generated-next-config-cleanup`: normalize `next-env.d.ts` and `tsconfig.json`; do not accept timestamped `.next-*` paths.
3. `ui-icon-dependency`: package `package.json`, `package-lock.json`, `PlatformBadge.tsx`, and related UI/spec/handoff evidence for `simple-icons`.
4. `legacy-smoke-harness`: package `scripts/smoke-self-media.mjs` after running `npm run test:smoke` in the intended isolated mode.
5. `governance-trajectory-test`: package `tests/agent-trajectory.test.mjs` with docs/spec/handoff policy, keeping `WECHAT-001` historical/paused.

## Verification Commands And Results

- `git diff --name-only`: PASS. Dirty tracked file list was printed successfully.
- `git diff --check`: PASS, with the existing warning only:

```text
warning: in the working copy of 'tsconfig.json', CRLF will be replaced by LF the next time Git touches it
```

## Changed Files

Auditor changed only:

```text
docs/handoffs/TOOLING-CONFIG-ATTRIBUTION-048-auditor-handoff.md
```

No code, data, package, script, config, staging, commit, rollback, or deletion action was performed.

## Orchestrator Decision Required

Yes.

Main session should decide how to split tooling/config cleanup from dependency/UI icon acceptance and whether to normalize generated Next type-path pollution before any staging.
