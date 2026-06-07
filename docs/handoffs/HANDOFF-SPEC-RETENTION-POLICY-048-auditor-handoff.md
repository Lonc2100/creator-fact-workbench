# HANDOFF-SPEC-RETENTION-POLICY-048 auditor handoff

Date: 2026-06-05
Mode: read-only policy audit. No code edits, no deletion, no staging, no commit.

## Context read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md`
- `docs/handoffs/WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md`

## Scope

Audited untracked files under:

- `docs/handoffs/`
- `docs/product-specs/`

This task did not move files, delete files, update indexes, stage, commit, or modify code/data.

## Inventory

Pre-handoff inventory from `git ls-files --others --exclude-standard -- docs/handoffs docs/product-specs`:

| Path | Untracked count | Notes |
| --- | ---: | --- |
| `docs/handoffs/` | 235 | Handoffs, orchestrator reviews, auditor reports, status closures, historical UI/backend notes. |
| `docs/product-specs/` | 26 | Active platform specs, indexed specs, UI reset/art-direction specs, paused WeChat specs. |

Additional status:

- `docs/handoffs/README.md` is tracked modified and should be used as the handoff index before broad tracking decisions.
- `docs/product-specs/index.md` is tracked modified and currently references 9 of the 26 untracked specs.
- 74 untracked handoff files are directly referenced by `CURRENT-PLATFORM-STATUS.md`.
- 86 untracked handoff files are referenced by `WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md`.
- 161 untracked handoff files are not directly referenced by `CURRENT-PLATFORM-STATUS.md`.

## Minimal executable policy

### 1. Current must track

Track these in the first docs/status bundle after main-session approval because they are current continuation, accepted-state, or active-bundle governance:

- Current status and current handoff indexes:
  - `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - `docs/handoffs/MAIN-SESSION-HANDOFF-044-next-main-chat.md`
  - `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md`
  - `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md`
  - `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-048-orchestrator-review.md`
- 048 dirty-worktree/bundle governance chain:
  - `docs/handoffs/DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md`
  - `docs/handoffs/WORKTREE-ACCEPTANCE-MATRIX-048-worker-handoff.md`
  - `docs/handoffs/CORE-LAYER-DIFF-ATTRIBUTION-048-auditor-handoff.md`
  - `docs/handoffs/LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md`
  - `docs/handoffs/PLATFORM-CORE-BUNDLE-PLAN-048-worker-handoff.md`
  - `docs/handoffs/PLATFORM-CORE-BUNDLE-VERIFY-048-worker-handoff.md`
  - `docs/handoffs/HANDOFF-SPEC-RETENTION-POLICY-048-auditor-handoff.md`
- 047 reviews paused-evidence accepted chain:
  - `docs/handoffs/PAUSED-PLATFORM-EVIDENCE-CLEANUP-047-worker-handoff.md`
  - `docs/handoffs/PAUSED-PLATFORM-EVIDENCE-AUDIT-047-auditor-handoff.md`
  - `docs/handoffs/REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047-worker-handoff.md`
  - `docs/handoffs/REVIEWS-PAUSED-EVIDENCE-BUNDLE-VERIFY-048-auditor-handoff.md`
- Active baseline handoffs explicitly named in `CURRENT-PLATFORM-STATUS.md`, especially:
  - four-platform runbook/ops reviews,
  - trusted real-data/provenance/quarantine reviews,
  - dashboard/reviews/account-boundary reviews,
  - daily ops/local health reviews,
  - operator data-only UI reviews,
  - action/content/calendar workflow reviews.

The complete current-status referenced untracked handoff set is the 74 files returned by the audit command. They should be tracked before depending on a clean checkout for continuation.

Current product specs that should track:

- `docs/product-specs/import-real-011.md`
- `docs/product-specs/douyin-personal-v0.md`
- `docs/product-specs/xiaohongshu-personal-v0.md`
- `docs/product-specs/xiaohongshu-personal-v1.md`
- `docs/product-specs/video-account-personal-v0.md`
- `docs/product-specs/video-account-personal-v1.md`
- `docs/product-specs/bilibili-personal-v0.md`
- `docs/product-specs/bilibili-account-metrics-022.md`
- `docs/product-specs/content-workflow-011.md`
- `docs/product-specs/review-action-backend-011.md`

Index note:
- `douyin-personal-v0.md` is active but not currently referenced by `docs/product-specs/index.md`; tracking should be paired with an index update in a separate docs/index task.

### 2. Can track but needs index

These are project-related and can be tracked, but should not enter the repo without being indexed or labeled in `docs/handoffs/README.md`, `CURRENT-PLATFORM-STATUS.md`, or an archive index.

Handoff categories:

- Worker counterparts for accepted orchestrator reviews when they are not directly named by current status.
- Platform discovery/import worker handoffs used by the acceptance matrix but not all named in `CURRENT-PLATFORM-STATUS.md`.
- 048 planning handoffs not yet accepted into `CURRENT-PLATFORM-STATUS.md`, for example:
  - `docs/handoffs/NEXT-MAINLINE-CANDIDATES-048-worker-handoff.md`
  - `docs/handoffs/PLATFORM-CORE-BUNDLE-AUDIT-048-auditor-handoff.md`
- Early backend/import/content handoffs that still explain tracked behavior but are not current entrypoints:
  - `docs/handoffs/BACKEND-PRACTICAL-011-orchestrator-plan.md`
  - `docs/handoffs/BACKEND-SPEC-011-orchestrator-review.md`
  - `docs/handoffs/BACKEND-SPEC-011-worker-handoff.md`
  - `docs/handoffs/CONTENT-WORKFLOW-010-worker-handoff.md`
  - `docs/handoffs/CONTENT-WORKFLOW-011-worker-handoff.md`
  - `docs/handoffs/REVIEW-ACTION-010-worker-handoff.md`

Product specs that can track if indexed/labeled:

- `docs/product-specs/browser-auto-001.md`
- `docs/product-specs/ui-dashboard-tables-002.md`
- `docs/product-specs/ui-diag-001.md`
- `docs/product-specs/ui-review-actions-002.md`
- `docs/product-specs/ui-theme-clean-002.md`

Rule:
- If a file is useful for future workers, add it to an index with status: `active`, `accepted`, `superseded`, `historical`, or `paused`.
- Do not track more handoffs/specs as anonymous loose files.

### 3. Archive / historical

Keep these as historical context only unless a future UI/research task explicitly reopens them. They may be tracked under an archive policy, but should not be treated as active mainline specs.

Historical UI handoffs:

- `docs/handoffs/AUD-007-parallel-ui-workers-report.md`
- `docs/handoffs/CALENDAR-UI-worker-handoff.md`
- `docs/handoffs/DASHBOARD-UI-worker-handoff.md`
- `docs/handoffs/FIGMA-FIRST-UI-REDESIGN-001-orchestrator-handoff.md`
- `docs/handoffs/REVIEW-PANEL-UI-worker-handoff.md`
- `docs/handoffs/UI-ART-DIRECTION-003-worker-handoff.md`
- `docs/handoffs/UI-ART-DIRECTION-004-worker-handoff.md`
- `docs/handoffs/UI-CALENDAR-HANDOFF-007-next-chat.md`
- `docs/handoffs/UI-CALENDAR-METRICOOL-005-worker-handoff.md`
- `docs/handoffs/UI-CALENDAR-METRICOOL-006-worker-handoff.md`
- `docs/handoffs/UI-CALENDAR-POLISH-009-worker-handoff.md`
- `docs/handoffs/UI-DASHBOARD-POLISH-009-worker-handoff.md`
- `docs/handoffs/UI-POLISH-001-orchestrator-handoff.md`
- `docs/handoffs/UI-POLISH-009-orchestrator-summary.md`
- `docs/handoffs/UI-RESET-CALENDAR-001-worker-handoff.md`
- `docs/handoffs/UI-RESET-DASHBOARD-REVIEWS-001-worker-handoff.md`
- `docs/handoffs/UI-REVIEW-DASHBOARD-THEME-002-worker-handoff.md`
- `docs/handoffs/UI-REVIEWS-POLISH-009-worker-handoff.md`

Historical UI/product specs:

- `docs/product-specs/figma-first-ui-redesign-001.md`
- `docs/product-specs/ui-art-direction-003.md`
- `docs/product-specs/ui-art-direction-004.md`
- `docs/product-specs/ui-calendar-metricool-005.md`
- `docs/product-specs/ui-calendar-metricool-006.md`
- `docs/product-specs/ui-polish-001.md`
- `docs/product-specs/ui-reset-calendar-001.md`
- `docs/product-specs/ui-reset-dashboard-001.md`
- `docs/product-specs/ui-reset-reviews-001.md`

Archive rule:
- Keep them out of current acceptance bundles.
- Track only if an archive index marks them as historical/superseded.
- Do not delete during 048 cleanup.

### 4. Paused WeChat historical

Current status says WeChat Official Account/backend is paused. These files may be retained as paused historical context, but must not enter active four-platform bundles or be described as reopened.

Paused WeChat handoffs:

- `docs/handoffs/WECHAT-001-worker-handoff.md`
- `docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md`

Paused WeChat specs:

- `docs/product-specs/wechat-001.md`
- `docs/product-specs/wechat-backend-v0.md`

Policy:
- Track only with explicit `paused` label.
- Keep out of `platform-core-four`, daily ops active gates, and default UI acceptance narratives.
- Reopen only with explicit user approval.

### 5. Do not recommend tracking local evidence

No binary screenshot/report evidence files were found under the audited untracked `docs/handoffs/` or `docs/product-specs/` paths.

Do not track by default:

- `.local/**`
- screenshots,
- Playwright trace/video artifacts,
- smoke report JSON/Markdown,
- raw platform capture payloads,
- local sqlite databases,
- trusted weekly full reports that may include local/private content titles.

Evidence rule:
- Handoffs may reference local evidence paths.
- Only redacted summaries should enter docs.
- Raw/local evidence remains local unless a separate redaction/export task explicitly approves a shareable artifact.

## Product spec index status

Currently indexed untracked specs:

- `docs/product-specs/bilibili-account-metrics-022.md`
- `docs/product-specs/bilibili-personal-v0.md`
- `docs/product-specs/content-workflow-011.md`
- `docs/product-specs/import-real-011.md`
- `docs/product-specs/review-action-backend-011.md`
- `docs/product-specs/video-account-personal-v0.md`
- `docs/product-specs/video-account-personal-v1.md`
- `docs/product-specs/xiaohongshu-personal-v0.md`
- `docs/product-specs/xiaohongshu-personal-v1.md`

Currently unindexed untracked specs:

- `docs/product-specs/browser-auto-001.md`
- `docs/product-specs/douyin-personal-v0.md`
- `docs/product-specs/figma-first-ui-redesign-001.md`
- `docs/product-specs/ui-art-direction-003.md`
- `docs/product-specs/ui-art-direction-004.md`
- `docs/product-specs/ui-calendar-metricool-005.md`
- `docs/product-specs/ui-calendar-metricool-006.md`
- `docs/product-specs/ui-dashboard-tables-002.md`
- `docs/product-specs/ui-diag-001.md`
- `docs/product-specs/ui-polish-001.md`
- `docs/product-specs/ui-reset-calendar-001.md`
- `docs/product-specs/ui-reset-dashboard-001.md`
- `docs/product-specs/ui-reset-reviews-001.md`
- `docs/product-specs/ui-review-actions-002.md`
- `docs/product-specs/ui-theme-clean-002.md`
- `docs/product-specs/wechat-001.md`
- `docs/product-specs/wechat-backend-v0.md`

## Handoff index status

`CURRENT-PLATFORM-STATUS.md` directly references 74 untracked handoffs. Those are the safest first tracking set because future workers already depend on them.

The 161 unreferenced handoffs should not be deleted. They should be handled by one of two policies:

1. Track with an index label if they explain accepted behavior or useful historical design decisions.
2. Track under a documented archive/historical index if they are superseded.

Do not leave a large unindexed tracked handoff pile; that recreates the current ambiguity inside the repo.

## Recommended execution order

1. Track current-status handoffs and 048 docs/status handoffs first.
2. Track indexed active product specs and add the missing active Douyin spec to the product-spec index in a separate docs-index task.
3. Track active platform worker handoffs with the platform-core bundle if they are needed to explain provider/script acceptance.
4. Label paused WeChat files before tracking them.
5. Move historical UI/backend notes into an archive/index policy before tracking them broadly.
6. Keep local evidence under `.local/**` out of Git.

## Verification commands

Commands run for this audit:

```powershell
git status --short -- docs/handoffs docs/product-specs
git ls-files --others --exclude-standard -- docs/handoffs
git ls-files --others --exclude-standard -- docs/product-specs
```

Final verification after writing this handoff should run:

```powershell
git status --short -- docs/handoffs docs/product-specs
git diff --check
```

## Changed files

This auditor wrote only:

- `docs/handoffs/HANDOFF-SPEC-RETENTION-POLICY-048-auditor-handoff.md`

## Orchestrator decision required

Yes.

Main session should decide the exact docs/status bundle and whether historical UI/backend handoffs are tracked in-place with labels or under a future archive index. No delete/move/index-change decision was made by this task.
