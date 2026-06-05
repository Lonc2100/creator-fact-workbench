# PLATFORM-CORE-BUNDLE-AUDIT-048 Auditor Handoff

Date: 2026-06-05

## Task ID

PLATFORM-CORE-BUNDLE-AUDIT-048

## Scope

Read-only audit of the proposed `platform-core-four` acceptance bundle.

Audit goals:

- Check whether the platform-core bundle list follows `Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI`.
- Check whether the active bundle includes all four personal provider files.
- Check whether paused WeChat scripts/routes/specs are excluded from active bundle scope.
- Check whether there is a Bilibili account metrics durable-save risk.
- Decide whether to recommend moving to the next packaging/staging plan.

Boundaries kept:

- Did not change code.
- Did not delete files or directories.
- Did not stage or commit.
- Did not run smoke/E2E/browser commands.
- Wrote only this audit handoff.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-048-orchestrator-review.md`
- `docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md`
- `docs/handoffs/CORE-LAYER-DIFF-ATTRIBUTION-048-auditor-handoff.md`

Additional context read for protocol:

- `docs/handoffs/README.md`

## Audit Findings

### Layer Order

PASS.

`PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md` uses the fixed order:

```text
Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI
```

The active bundle file list is organized in that order:

1. Types: `src/domain/self-media/types/self-media-types.ts`
2. Config: `src/domain/self-media/config/self-media-config.ts`
3. Repo: `src/domain/self-media/repo/sqlite-self-media-repo.ts`
4. Providers: four personal providers plus `providers/index.ts`
5. Service: `self-media-service.ts`, `review-service.ts`
6. Runtime: `self-media-runtime.ts`
7. UI: import/dashboard/reviews platform surfaces and supporting labels/patterns

This matches `AGENTS.md` and the 048 closure direction.

### Four Personal Providers

PASS.

The active bundle includes all four personal provider files:

```text
src/domain/self-media/providers/douyin-personal-provider.ts
src/domain/self-media/providers/xiaohongshu-personal-provider.ts
src/domain/self-media/providers/video-account-personal-provider.ts
src/domain/self-media/providers/bilibili-personal-provider.ts
```

Filesystem/Git check:

| File | Exists | Git status |
| --- | --- | --- |
| `src/domain/self-media/providers/douyin-personal-provider.ts` | yes | untracked |
| `src/domain/self-media/providers/xiaohongshu-personal-provider.ts` | yes | untracked |
| `src/domain/self-media/providers/video-account-personal-provider.ts` | yes | untracked |
| `src/domain/self-media/providers/bilibili-personal-provider.ts` | yes | untracked |

Audit note: the untracked status is expected from the dirty-worktree baseline, but these files are platform-core critical. The next packaging plan should include them before any clean-checkout validation.

### WeChat Paused Scope

PASS.

The active platform-core plan does not include WeChat paused files as active bundle files. It explicitly excludes:

```text
scripts/sync-wechat-official.ts
scripts/wechat-backend-discovery.mjs
src/app/api/self-media/wechat/sync/route.ts
docs/product-specs/wechat-001.md
docs/product-specs/wechat-backend-v0.md
docs/handoffs/WECHAT-001-worker-handoff.md
docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md
```

The plan also says shared files may contain WeChat compatibility branches, but those must be marked paused/historical and kept outside the active four-platform acceptance narrative.

This matches `CURRENT-PLATFORM-STATUS.md` and `MAIN-SESSION-STATUS-CLOSURE-048-orchestrator-review.md`: WeChat Official Account / backend remains paused unless the user explicitly reopens it.

### Bilibili Account Metrics Durable-Save Risk

PASS with guardrails.

Current accepted scope remains Bilibili archives/content-level metrics only. Account-level diagnostics remain preview-only.

Evidence checked:

- `PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md` explicitly says Bilibili account metric/date-key structures are preview/diagnostic only and not durable save approval.
- `scripts/bilibili-account-metrics-preview.mjs` is excluded from active platform-core as optional diagnostics only.
- `src/domain/self-media/config/self-media-config.ts` contains guidance to keep `accountMetrics/dateKeyRows` diagnostic-only.
- `src/domain/self-media/providers/bilibili-personal-provider.ts` exposes preview helpers and returns account preview state with `saved: false` / `previewOnly: true` for account snapshot candidates.
- `scripts/bilibili-personal-save-smoke.mjs` checks Bilibili `accountMetrics` and `dateKeyRows` remain diagnostics.
- `scripts/platform-personal-save-smoke.mjs` asserts Bilibili account metrics/date-key diagnostics do not persist `AccountMetricSnapshot` rows and do not enter content dashboard totals.

Search result for `upsertAccountMetricSnapshot`:

- Real implementation: `src/domain/self-media/repo/sqlite-self-media-repo.ts` defines the repo method.
- Runtime/provider/scripts: no real Bilibili save path calling it was found.
- Tests: `tests/self-media-contract.test.ts` uses synthetic `repo.upsertAccountMetricSnapshot(...)` rows to test account trend behavior.

Conclusion: no active Bilibili durable account-save path was found in this audit. The next packaging plan must preserve the existing guardrails and avoid staging `scripts/bilibili-account-metrics-preview.mjs` as active platform-core behavior.

### Active Bundle Exclusions

PASS.

The plan correctly keeps these out of active platform-core:

- WeChat paused scripts/routes/specs/handoffs.
- `src/domain/self-media/providers/csv-preset-provider.ts`.
- `scripts/bilibili-account-metrics-preview.mjs`.
- `.local/**`.
- `.agents/**`, `.codex/**`, `.trellis/**`.
- broad UI polish and secondary surfaces not required for the four-platform closed loop.
- `package-lock.json`, pending separate tooling/config attribution.

Audit note: `src/domain/self-media/providers/csv-preset-provider.ts` is a tracked dirty file in the worktree, but the plan correctly assigns it to a separate import-preview/legacy CSV lane rather than active four-platform raw capture.

## Packaging Recommendation

Recommend proceeding to the next packaging/staging plan, but not to staging directly from this audit.

The next plan should:

1. Freeze the active platform-core manifest exactly enough to prove the four-platform closed loop.
2. Keep layer order: Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI.
3. Include all four personal provider files.
4. Include only the scripts/API/tests needed to prove active four-platform import/save/health behavior.
5. Keep WeChat paused files out of active scope.
6. Keep Bilibili account preview diagnostics out of durable-save scope.
7. Leave `package-lock.json`, broad tooling config, `.agents/`, `.codex/`, `.trellis/`, and CSV/import-preview files for separate policy or bundle lanes.

Suggested verification before any staging:

```powershell
npm run typecheck
npm run test:self-media
npm run smoke:platforms-save
npm run smoke:platform-operations-e2e
npm run smoke:platform-ops-with-health
git diff --check
```

If UI files remain in the platform-core bundle, also run:

```powershell
npm run test:ui-harness
```

Use `gate:daily-platform-ops` only when the 3200 operator server is intentionally healthy.

## Verification Commands And Results

- `git diff --name-only`: PASS. Command completed and listed tracked dirty files.
- `git ls-files --others --exclude-standard`: PASS. Command completed and listed untracked files, including the four personal provider files and excluded paused WeChat files.
- `git diff --check`: PASS, with the existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.

Additional read-only checks:

- Provider existence/status check: PASS, all four personal provider files exist and are untracked.
- WeChat exclusion search in platform-core plan: PASS, paused WeChat paths appear under explicit exclusions.
- Bilibili account durable-save search: PASS with guardrails, no runtime/provider/script call to `upsertAccountMetricSnapshot` was found.

## Changed Files

Auditor changed only:

```text
docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md
```

## Known Issues / Residual Risk

- This audit reviews the plan and current file inventory; it does not run typecheck, unit tests, smoke tests, or browser checks.
- Broad shared files may still contain paused WeChat compatibility branches and Bilibili account preview helpers. Packaging notes must explicitly label those as inactive/diagnostic where retained.
- The worktree remains broad and dirty. This audit does not accept every line of the core-layer diff.
- Actual staging still needs a main-session packaging plan and verification pass.

## Orchestrator Decision Required

Yes.

The audit recommends moving to the next packaging/staging plan, but the main session must decide the exact active manifest and when to stage after verification.
