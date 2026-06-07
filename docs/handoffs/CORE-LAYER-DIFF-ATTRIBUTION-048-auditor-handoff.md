# CORE-LAYER-DIFF-ATTRIBUTION-048 Auditor Handoff

Date: 2026-06-05

## Task ID

CORE-LAYER-DIFF-ATTRIBUTION-048

## Scope

Read-only attribution audit for dirty diff in the core domain layers only:

- Types
- Config
- Repo
- Providers
- Service
- Runtime

This audit did not change code, data, scripts, tests, local DBs, generated reports, or local evidence files. The only written file is this handoff.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md`

Additional attribution context read:

- `docs/handoffs/DOUYIN-PERSONAL-V1-METRICS-014-worker-handoff.md`
- `docs/handoffs/XIAOHONGSHU-PERSONAL-V1-METRICS-017-worker-handoff.md`
- `docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017-worker-handoff.md`
- `docs/handoffs/BILIBILI-PERSONAL-V1-METRICS-021-worker-handoff.md`
- `docs/handoffs/BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-worker-handoff.md`
- `docs/handoffs/PLATFORM-BILIBILI-ENABLE-023-rerun-worker-handoff.md`
- `docs/handoffs/PLATFORM-BILIBILI-ENABLE-023-rerun-orchestrator-review.md`
- `docs/handoffs/PLATFORM-OPS-FOUR-024-orchestrator-review.md`
- `docs/handoffs/BILIBILI-PUBLIC-ONLY-029-worker-handoff.md`
- `docs/handoffs/IMPORT-REAL-011-worker-handoff.md`
- `docs/handoffs/PLATFORM-OPERATION-HISTORY-023-worker-handoff.md`
- `docs/handoffs/POST-IMPORT-ACTION-SUGGESTIONS-028-worker-handoff.md`
- `docs/handoffs/ACCOUNT-METRIC-SNAPSHOT-MODEL-023-worker-handoff.md`
- `docs/handoffs/IMPORT-PROVENANCE-METADATA-030-worker-handoff.md`
- `docs/handoffs/REAL-DATA-SCOPE-029-worker-handoff.md`
- `docs/handoffs/CONTENT-TRUST-CURATION-031-worker-handoff.md`
- `docs/handoffs/ACTION-TO-CONTENT-WORKFLOW-037-worker-handoff.md`
- `docs/handoffs/CONTENT-DRAFT-REVIEW-038-worker-handoff.md`
- `docs/handoffs/CONTENT-LIBRARY-ALL-DRAFTS-039-worker-handoff.md`
- `docs/handoffs/PUBLISH-LEDGER-OPERATIONS-040-worker-handoff.md`
- `docs/handoffs/SAFE-WEEKLY-REPORT-UI-EXPORT-036-worker-handoff.md`
- `docs/handoffs/DAILY-OPS-ONE-COMMAND-036-worker-handoff.md`
- `docs/handoffs/DAILY-OPS-UI-RUNNER-037-worker-handoff.md`
- `docs/handoffs/CLEAN-PROFILE-SEED-FREE-030-worker-handoff.md`
- `docs/handoffs/LOCAL-SERVER-HEALTH-037-worker-handoff.md`
- `docs/handoffs/LOCAL-SERVER-OPERATING-MODE-038-worker-handoff.md`
- `docs/handoffs/DAILY-OPS-PREFLIGHT-039-worker-handoff.md`
- `docs/handoffs/WECHAT-001-worker-handoff.md`
- `docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md`

## Command Inventory

`git diff --name-only`: PASS.

Tracked dirty core-layer files:

```text
src/domain/self-media/config/self-media-config.ts
src/domain/self-media/providers/csv-preset-provider.ts
src/domain/self-media/providers/index.ts
src/domain/self-media/repo/sqlite-self-media-repo.ts
src/domain/self-media/runtime/self-media-runtime.ts
src/domain/self-media/service/review-service.ts
src/domain/self-media/service/self-media-service.ts
src/domain/self-media/types/self-media-types.ts
```

Untracked core-layer provider files:

```text
src/domain/self-media/providers/bilibili-personal-provider.ts
src/domain/self-media/providers/douyin-personal-provider.ts
src/domain/self-media/providers/video-account-personal-provider.ts
src/domain/self-media/providers/xiaohongshu-personal-provider.ts
```

Core tracked diff size:

```text
8 files changed, 3985 insertions(+), 85 deletions(-)
```

`git diff --check`: PASS, with the known warning:

```text
warning: in the working copy of 'tsconfig.json', CRLF will be replaced by LF the next time Git touches it
```

## Layer File Attribution

| File | Layer | Likely handoff/task attribution | Risk | Auditor notes |
| --- | --- | --- | --- | --- |
| `src/domain/self-media/types/self-media-types.ts` | Types | Multi-task: platform V1 metrics/save tasks `014/017/021/022/023`; `IMPORT-REAL-011`; `PLATFORM-OPERATION-HISTORY-023`; `ACCOUNT-METRIC-SNAPSHOT-MODEL-023`; `POST-IMPORT-ACTION-SUGGESTIONS-028`; `REAL-DATA-SCOPE-029`; `IMPORT-PROVENANCE-METADATA-030`; `CONTENT-TRUST-CURATION-031`; `SAFE-WEEKLY-REPORT-UI-EXPORT-036`; `ACTION-TO-CONTENT-WORKFLOW-037`; `CONTENT-DRAFT-REVIEW-038`; `DAILY-OPS-UI-RUNNER-037`; `DAILY-OPS-PREFLIGHT-039`; `CONTENT-LIBRARY-ALL-DRAFTS-039`; `WECHAT-001`. | High | This is the largest contract surface. Additions are mostly attributable, but the file mixes active four-platform contracts, paused WeChat sync shape, account snapshot read model, daily ops report views, and content workflow shapes. Needs feature-bundle verification before acceptance. |
| `src/domain/self-media/config/self-media-config.ts` | Config | `CLEAN-PROFILE-SEED-FREE-030`; platform status/readiness lineage from platform ops `019-024`; Bilibili enable rerun `023`; current four-platform operation capabilities. | Medium | Bilibili evidence file `BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-orchestrator-review.md` exists. Config also includes paused WeChat readiness, which matches current status. |
| `src/domain/self-media/repo/sqlite-self-media-repo.ts` | Repo | `CLEAN-PROFILE-SEED-FREE-030`; `IMPORT-PROVENANCE-METADATA-030`; `ACCOUNT-METRIC-SNAPSHOT-MODEL-023`. | High | `upsertAccountMetricSnapshot` / `listAccountMetricSnapshots` are attributable to account snapshot model, but current status still forbids durable Bilibili account snapshot save. Accept only as generic model/read path, not as approval to save Bilibili account metrics. |
| `src/domain/self-media/providers/csv-preset-provider.ts` | Providers | `IMPORT-REAL-011`. | Medium | Adds platform aliasing, preview confidence, XLSX/CSV parsing, native/raw preview metadata. Attribution is clear; durable `nativeMetrics/rawFields` persistence remains explicitly not implemented. |
| `src/domain/self-media/providers/index.ts` | Providers | Four personal providers from `DOUYIN-PERSONAL-V1-METRICS-014`, `XIAOHONGSHU-PERSONAL-V1-METRICS-017`, `VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017`, `BILIBILI-PERSONAL-V1-METRICS-021/022/023`. | High | Exports point at untracked provider files. If the exports are accepted without tracking the provider files, runtime imports will be fragile or fail in a clean checkout. |
| `src/domain/self-media/runtime/self-media-runtime.ts` | Runtime | Platform personal preview/import V1 tasks; platform import operations/history `020/023/024`; Bilibili enable rerun `023`; trusted-scope/content workflow tasks `031/037/038/039`; safe weekly report `036`; WeChat sync `WECHAT-001`. | High | Runtime mixes active four-platform import operations and paused WeChat sync entrypoint. It should not be accepted as a single 048 change; split by accepted feature bundle. |
| `src/domain/self-media/service/review-service.ts` | Service | `REVIEWS-FOUR-PLATFORM-EXPLAIN-026`; 045/047 paused WeChat cleanup direction. | Low-medium | Four-platform content contribution and account metric separation are accepted. The action title no longer asks to import 公众号 data, matching current paused WeChat boundary. |
| `src/domain/self-media/service/self-media-service.ts` | Service | Broad multi-task layer: platform V1 providers/imports; Bilibili durable archives save; account metric grouping; platform operation history; post-import suggestions; trusted real scope; provenance metadata; content curation; daily reports; safe weekly report; action-to-content; draft review/publish confirmation; content workbench; WeChat sync. | High | 2279 insertions across many business rules. Most hunks have plausible accepted handoff lineage, but Git cannot prove line-level attribution. This file is the main high-risk bundling surface. |

## Four Untracked Personal Provider Check

### `src/domain/self-media/providers/douyin-personal-provider.ts`

Likely attribution:

- `DOUYIN-PERSONAL-V1-METRICS-014`
- Later covered by unified four-platform save smoke lineage, especially `PLATFORM-OPS-FOUR-024`.

Support for current four-platform closed loop:

- Yes. `SelfMediaService` imports and injects `DouyinPersonalProvider`.
- Runtime exposes `previewDouyinPersonalCaptures` and `importDouyinPersonalCaptures`.
- Scripts and tests reference this provider/import path.
- Current four-platform closed-loop status includes Douyin content-level creator-center data.

Risk:

- High if left untracked. A clean checkout with `providers/index.ts` exporting this file would not reproduce the accepted Douyin path.

### `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`

Likely attribution:

- `XIAOHONGSHU-PERSONAL-V1-METRICS-017`
- Save-smoke lineage from `XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018`
- Unified four-platform smoke lineage from `PLATFORM-OPS-FOUR-024`.

Support for current four-platform closed loop:

- Yes. `SelfMediaService`, Runtime, scripts, and tests all reference the Xiaohongshu provider/import path.
- Current status says Xiaohongshu is one of the active content-level closed-loop platforms.

Risk:

- High if left untracked. It is required for reproducible Xiaohongshu creator-center import/save behavior.

### `src/domain/self-media/providers/video-account-personal-provider.ts`

Likely attribution:

- `VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017`
- Save-smoke lineage from `VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018`
- Unified four-platform smoke lineage from `PLATFORM-OPS-FOUR-024`.

Support for current four-platform closed loop:

- Yes. `SelfMediaService`, Runtime, scripts, and tests reference the Video Account provider/import path.
- Current status says Video Account is one of the active content-level closed-loop platforms.

Risk:

- High if left untracked. It is required for reproducible Video Account creator-center import/save behavior.

### `src/domain/self-media/providers/bilibili-personal-provider.ts`

Likely attribution:

- `BILIBILI-PERSONAL-V1-METRICS-021`
- `BILIBILI-PERSONAL-V1-SAVE-SMOKE-022`
- `PLATFORM-BILIBILI-ENABLE-023-rerun`
- `BILIBILI-PUBLIC-ONLY-029`
- Bilibili account metrics preview lineage `024/027` for preview-only account candidates.

Support for current four-platform closed loop:

- Yes, for archives content-level import/save.
- `SelfMediaService`, Runtime, scripts, and tests reference Bilibili parse/import paths.
- Current status accepts Bilibili content save for archives/work metrics only.
- The provider also contains account metric preview helpers, but current accepted boundary says account diagnostics/date-key rows remain preview-only and must not be saved into durable account snapshots.

Risk:

- High if left untracked because Bilibili closed-loop archives import depends on it.
- High if misunderstood as approval for durable Bilibili account snapshots. It supports preview candidates, not approved account save.

## High-Risk Attribution Findings

### High Risk: Broad Service/Types Diff Cannot Be Accepted As One Task

`self-media-types.ts` and `self-media-service.ts` combine many historical feature lines. The audit found plausible handoff lineage for the major hunks, but the current Git state does not isolate them by commit or task.

Required main-session action:

- Bundle by accepted feature family and run the matching verification, rather than committing these files as one undifferentiated core-layer diff.

### High Risk: Untracked Providers Are Required For Current Four-Platform Behavior

The four untracked personal-provider files support the accepted four-platform closed loop. They are not optional local notes.

Required main-session action:

- Attribute and include them in the platform-core acceptance bundle, together with matching scripts/tests/handoffs, or explicitly prove another tracked implementation replaces them.

### High Risk: Paused WeChat Core Diff Is Attributed But Not Current Mainline

WeChat official sync types/service/runtime additions are attributable to `WECHAT-001`, and backend discovery is attributable to `WECHAT-BACKEND-V0-DISCOVERY-016`. However, current accepted status says WeChat Official Account / backend is paused.

Required main-session action:

- Do not bundle WeChat sync as part of active four-platform closure.
- If kept, document it as historical/paused code path and ensure default dashboard/reviews/action/evidence scopes continue excluding paused WeChat.

### High Risk: AccountMetricSnapshot Is A Model, Not Bilibili Account Save Approval

`AccountMetricSnapshot` types/repo/service dashboard grouping are attributable to `ACCOUNT-METRIC-SNAPSHOT-MODEL-023`. Current status accepts the model but explicitly does not approve Bilibili durable account snapshot save.

Required main-session action:

- Keep account snapshot model acceptance separate from any Bilibili account save task.
- Verify Bilibili provider/scripts still do not call `upsertAccountMetricSnapshot` for real Bilibili account diagnostics.

### Medium Risk: CSV/XLSX Real Preview Is Attributed But Separate From Current Four-Platform Raw Capture Path

`csv-preset-provider.ts` is attributable to `IMPORT-REAL-011`. It adds platform-native preview rows and XLSX parsing but intentionally does not add durable `nativeMetrics/rawFields` persistence.

Required main-session action:

- Keep it in an import-preview bundle, not in the four personal-provider raw-capture bundle.

## No Clearly Unknown Core File Found

Within the inspected core-layer files, the audit did not find a file-level diff that has no plausible handoff/task lineage.

Important caveat:

- This is file/hunk-level attribution by names, symbols, and handoff evidence. It is not proof that every changed line is accepted. The broad service/types diffs still need main-session bundling and verification.

## Recommended Core Acceptance Bundles

1. Platform core bundle:
   - Four untracked personal providers.
   - `providers/index.ts`.
   - Platform portions of `types`, `config`, `service`, `runtime`.
   - Relevant platform scripts/tests.
   - Verify with `npm run smoke:platforms-save`, `npm run smoke:platform-operations-e2e`, `npm run test:self-media`, `npm run typecheck`, `git diff --check`.

2. Trusted operating scope bundle:
   - Real scope, provenance metadata, curation, trusted audit/report shapes.
   - Verify with `npm run check:local-data-quarantine`, `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`, `npm run e2e:content-curation`, `npm run test:self-media`, `git diff --check`.

3. Workflow bundle:
   - Action-to-content, draft review, content workbench, publish ledger.
   - Verify with `npm run smoke:operating-action-to-content`, `npm run smoke:draft-review-ui-e2e`, `npm run test:self-media`, `npm run test:ui-harness`, `git diff --check`.

4. Daily/reporting bundle:
   - Safe weekly, daily ops, local server health, daily gate views.
   - Verify with `npm run ops:daily-self-media -- --preflight-health`, `npm run check:local-server-health -- --strict --require-trusted-data --check-page`, `npm run report:trusted-weekly:safe`, `npm run test:self-media`, `git diff --check`.

5. Paused WeChat bundle:
   - WeChat official sync and backend discovery artifacts.
   - Keep marked paused unless user explicitly reopens scope.
   - Verify default UI exclusion if retained.

## Verification Commands And Results

- `git diff --name-only`: PASS.
- `git diff --name-only -- src/domain/self-media/config src/domain/self-media/providers src/domain/self-media/repo src/domain/self-media/service src/domain/self-media/runtime src/domain/self-media/types`: PASS, listed 8 tracked dirty core files.
- `git ls-files --others --exclude-standard -- src/domain/self-media/config src/domain/self-media/providers src/domain/self-media/repo src/domain/self-media/service src/domain/self-media/runtime src/domain/self-media/types`: PASS, listed 4 untracked personal-provider files.
- `git diff --check`: PASS, with existing `tsconfig.json` CRLF warning only.

## Changed Files

Auditor changed only:

```text
docs/handoffs/CORE-LAYER-DIFF-ATTRIBUTION-048-auditor-handoff.md
```

## Known Issues / Residual Risk

- Git history does not isolate accepted historical tasks, so this audit cannot provide line-perfect provenance.
- Several handoffs used for attribution are themselves untracked in the current worktree.
- Some current accepted behavior likely depends on untracked scripts/tests/API routes outside this core-layer audit; those were intentionally not audited here except when needed to confirm provider references.
- No typecheck, unit tests, smoke tests, or live browser checks were run because this task was a read-only diff attribution audit.

## Orchestrator Decision Required

Yes.

Main session should decide feature-bundle packaging and verification order before committing, ignoring, or archiving any dirty core-layer files.
