# DIRTY-WORKTREE-SCOPE-AUDIT-048 Auditor Handoff

Date: 2026-06-05

## Task ID

DIRTY-WORKTREE-SCOPE-AUDIT-048

## Scope

Read-only audit of the current dirty Git worktree.

This audit did not change code, data, run formatters, delete files, or roll back anything. The only written file is this handoff.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md`

Additional audit context read:

- `docs/quality-execution-system.md`
- `docs/golden-principles.md`

## Baseline

- Branch: `main`
- Recent head: `ecb3dd8 Add WeChat official account connector`
- 047 accepted baseline:
  - Four active content-level platforms remain Douyin, Xiaohongshu, Video Account, and Bilibili.
  - WeChat Official Account / backend remains paused.
  - Bilibili account-level metrics remain preview-only.
  - Default `/reviews` evidence tables no longer show paused WeChat / Official Account blocking evidence.

## Command Inventory

### `git status --short`

PASS. Command completed.

Observed:

- `git status --short` visible lines: 350.
- Tracked modified files: 48.
- Expanded untracked files from `git ls-files --others --exclude-standard`: 402.

Note: `git status --short` folds some untracked directories such as `.agents/`, `.codex/`, and `.trellis/`, while `git ls-files --others --exclude-standard` expands their files. This is why the visible status line count and expanded untracked file count differ.

### `git diff --name-only`

PASS. Command completed.

Tracked modified file list:

```text
.gitignore
AGENTS.md
docs/cleanup-manifest.md
docs/context/current-state.md
docs/generated/template-doctor-report.md
docs/handoffs/README.md
docs/product-specs/index.md
docs/task-board.md
next-env.d.ts
next.config.mjs
package-lock.json
package.json
scripts/smoke-self-media.mjs
src/app/api/self-media/action-items/route.ts
src/app/api/self-media/content-versions/route.ts
src/app/api/self-media/import/preview/route.ts
src/app/calendar/page.tsx
src/app/content/page.tsx
src/app/globals.css
src/app/import/page.tsx
src/domain/self-media/config/self-media-config.ts
src/domain/self-media/providers/csv-preset-provider.ts
src/domain/self-media/providers/index.ts
src/domain/self-media/repo/sqlite-self-media-repo.ts
src/domain/self-media/runtime/self-media-runtime.ts
src/domain/self-media/service/review-service.ts
src/domain/self-media/service/self-media-service.ts
src/domain/self-media/types/self-media-types.ts
src/domain/self-media/ui/components/PlatformBadge.tsx
src/domain/self-media/ui/components/SidebarNav.tsx
src/domain/self-media/ui/foundations/tokens.css
src/domain/self-media/ui/patterns/ContentManagement.tsx
src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx
src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx
src/domain/self-media/ui/patterns/PublishCalendar.tsx
src/domain/self-media/ui/primitives/Panel.tsx
src/domain/self-media/ui/screens/CalendarPage.tsx
src/domain/self-media/ui/screens/ContentPage.tsx
src/domain/self-media/ui/screens/DashboardPage.tsx
src/domain/self-media/ui/screens/ImportPage.tsx
src/domain/self-media/ui/screens/LeadsPage.tsx
src/domain/self-media/ui/screens/OverviewPage.tsx
src/domain/self-media/ui/screens/ReviewsPage.tsx
src/domain/self-media/ui/screens/UiLabPage.tsx
tests/agent-trajectory.test.mjs
tests/self-media-contract.test.ts
tests/ui-harness.test.mjs
tsconfig.json
```

Tracked diff shortstat:

```text
48 files changed, 19158 insertions(+), 928 deletions(-)
```

### `git diff --check`

PASS. Command completed with the existing warning:

```text
warning: in the working copy of 'tsconfig.json', CRLF will be replaced by LF the next time Git touches it
```

No whitespace error was reported.

## Modified Files By Source Category

### Accepted handoff lineage, but not cleanly staged

These tracked modified files appear consistent with already accepted 030-047 platform, operator UI, daily ops, content workflow, and paused-evidence cleanup work. They are not isolated by Git task commits, so the safest conclusion is: accepted lineage likely, but main-session packaging still required.

Files:

```text
docs/handoffs/README.md
docs/task-board.md
src/app/api/self-media/action-items/route.ts
src/app/api/self-media/content-versions/route.ts
src/app/api/self-media/import/preview/route.ts
src/app/calendar/page.tsx
src/app/content/page.tsx
src/app/import/page.tsx
src/domain/self-media/ui/components/PlatformBadge.tsx
src/domain/self-media/ui/components/SidebarNav.tsx
src/domain/self-media/ui/foundations/tokens.css
src/domain/self-media/ui/patterns/ContentManagement.tsx
src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx
src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx
src/domain/self-media/ui/patterns/PublishCalendar.tsx
src/domain/self-media/ui/primitives/Panel.tsx
src/domain/self-media/ui/screens/CalendarPage.tsx
src/domain/self-media/ui/screens/ContentPage.tsx
src/domain/self-media/ui/screens/DashboardPage.tsx
src/domain/self-media/ui/screens/ImportPage.tsx
src/domain/self-media/ui/screens/LeadsPage.tsx
src/domain/self-media/ui/screens/OverviewPage.tsx
src/domain/self-media/ui/screens/ReviewsPage.tsx
src/domain/self-media/ui/screens/UiLabPage.tsx
tests/self-media-contract.test.ts
tests/ui-harness.test.mjs
```

Notable 047-specific accepted files inside this set:

- `src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx`
- `tests/ui-harness.test.mjs`

These contain the accepted paused WeChat evidence filter, but both also carry broader UI/test history in the same tracked diff.

### Accepted or project-related governance/docs, but still dirty

These are governance/index/status files that correspond to accepted handoff practices or current project context, but they are still tracked modified:

```text
AGENTS.md
docs/cleanup-manifest.md
docs/context/current-state.md
docs/generated/template-doctor-report.md
docs/product-specs/index.md
```

Risk: low-to-medium. They are docs-only, but they update agent behavior and project governance, so they should be reviewed as a docs/governance batch before commit.

### Tooling/package/config changes requiring main-session decision

These affect build, dependency, or TypeScript/Next configuration:

```text
.gitignore
next-env.d.ts
next.config.mjs
package-lock.json
package.json
scripts/smoke-self-media.mjs
tests/agent-trajectory.test.mjs
tsconfig.json
```

Risk: medium. These may be legitimate for accepted smoke/E2E/runtime work, but they should not be swept in with UI-only acceptance. Package and config changes need a specific verification bundle.

## Core Layer Audit

### Tracked modified core-layer files

These are Service / Runtime / Types / Repo / Providers / Config layer files with tracked modifications:

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

Core-layer diff stat:

```text
8 files changed, 3985 insertions(+), 85 deletions(-)
```

Layer-by-layer status:

| Layer | Files | Current audit status |
| --- | ---: | --- |
| Types | 1 modified | Needs main-session attribution before acceptance. |
| Config | 1 modified | Needs main-session attribution before acceptance. |
| Repo | 1 modified | Needs main-session attribution before acceptance. |
| Providers | 2 modified + 4 untracked provider files | Needs main-session attribution before acceptance. |
| Service | 2 modified | Needs main-session attribution before acceptance. |
| Runtime | 1 modified | Needs main-session attribution before acceptance. |

Conclusion: yes, there are uncommitted core-layer changes that are not attributable to a single currently active task by Git state alone. They likely belong to accepted historical feature families, but the present worktree does not prove that without a main-session bundling decision.

### Untracked core-layer provider files

```text
src/domain/self-media/providers/bilibili-personal-provider.ts
src/domain/self-media/providers/douyin-personal-provider.ts
src/domain/self-media/providers/video-account-personal-provider.ts
src/domain/self-media/providers/xiaohongshu-personal-provider.ts
```

Likely source: accepted platform personal discovery/import/save-smoke work for four active content-level platforms.

Risk: high if left untracked, because current accepted four-platform behavior appears to depend on these providers. They should be attributed to platform handoffs and included in the platform-core acceptance bundle, or deliberately excluded only after verification proves they are not required.

## Untracked Files By Source Category

Expanded untracked inventory has 402 files.

Top-level grouping:

```text
253 docs
61 .trellis
36 scripts
35 .agents
10 src
7 .codex
```

Operational grouping:

```text
225 docs/handoffs
61 .trellis
36 scripts
35 .agents
26 docs/product-specs
7 .codex
6 src/app/api
4 src/domain/self-media/providers
2 other docs
```

### Accepted handoff corresponding

These untracked handoff/status files are directly named in the 047 current status baseline or are clearly part of the documented accepted platform/operator history:

```text
docs/handoffs/CURRENT-PLATFORM-STATUS.md
docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-045-orchestrator-review.md
docs/handoffs/MAIN-SESSION-STATUS-CLOSURE-047-orchestrator-review.md
docs/handoffs/PAUSED-PLATFORM-EVIDENCE-AUDIT-047-auditor-handoff.md
docs/handoffs/PAUSED-PLATFORM-EVIDENCE-CLEANUP-047-worker-handoff.md
docs/handoffs/REVIEWS-PAUSED-EVIDENCE-SCREENSHOT-047-worker-handoff.md
docs/handoffs/REMAINING-SURFACE-POLISH-045-worker-handoff.md
docs/handoffs/LIVE-OPERATOR-WALKTHROUGH-045-worker-handoff.md
docs/handoffs/MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md
docs/handoffs/CALENDAR-REAL-SCHEDULING-WORKFLOW-044-orchestrator-review.md
docs/handoffs/OPERATOR-UX-FINAL-POLISH-044-orchestrator-review.md
docs/handoffs/DASHBOARD-LIVE-NUMBER-AUDIT-044-orchestrator-review.md
docs/handoffs/DAILY-OPERATING-CLOSURE-043-orchestrator-review.md
docs/handoffs/IMPORT-WARNING-COPY-DATA-ONLY-043-orchestrator-review.md
docs/handoffs/DASHBOARD-DATA-ONLY-042-orchestrator-review.md
docs/handoffs/CONTENT-CALENDAR-DATA-ONLY-042-orchestrator-review.md
docs/handoffs/IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042-orchestrator-review.md
```

There are many more accepted worker/orchestrator handoffs under `docs/handoffs/`; the current status file explicitly references 69 of the 225 untracked handoff filenames. The remaining handoffs still look project-related, but they need either indexing or archival decision because they are not all explicitly named in the compact status file.

### Untracked but related project artifacts

These are likely real project artifacts that correspond to accepted or historically reviewed work, but they are not tracked:

```text
docs/product-specs/*.md
docs/runbooks/self-media-daily-ops.md
docs/trellis-parallel-workflow.md
scripts/*personal*.mjs
scripts/*platform*.mjs
scripts/*daily*.mjs
scripts/*trusted*.mjs
scripts/*operating*.mjs
scripts/*curation*.mjs
scripts/start-operator-dev.mjs
src/app/api/self-media/action-items/content/route.ts
src/app/api/self-media/content-workbench/route.ts
src/app/api/self-media/contents/trust-scope/route.ts
src/app/api/self-media/platform-imports/operations/route.ts
src/app/api/self-media/reports/trusted-weekly-safe/route.ts
src/app/api/self-media/wechat/sync/route.ts
src/domain/self-media/providers/*personal-provider.ts
```

Risk: high. These look like actual implementation, API, provider, and verification assets for accepted behavior. Leaving them untracked makes future audit/reproduction fragile.

### Clearly local metadata / possible workflow pollution

These are not product runtime files by default and need a main-session decision before being tracked:

```text
.agents/
.codex/
.trellis/
```

Assessment:

- `.agents/` contains Trellis skill files.
- `.codex/` contains local agent/config/hook files.
- `.trellis/` contains workflow scripts, specs, task logs, and workspace journals.

These may be intentional local workflow assets, but they are also the most obvious candidates for "do not commit by default" or "move to project tooling only after explicit approval." No deletion or ignore change was performed.

### Obvious outer-layer miswrite

No additional parent-directory handoff file is visible in this repository's `git status`. The previous 047 audit handoff is now correctly under:

```text
docs/handoffs/PAUSED-PLATFORM-EVIDENCE-AUDIT-047-auditor-handoff.md
```

The current obvious non-product pollution candidates are the local agent/workflow metadata directories listed above, not an active misplaced parent file.

## Risk List

1. High: core-layer changes are present and broad. Types, Config, Repo, Providers, Service, and Runtime all have uncommitted modifications. Even if historically accepted, they need main-session attribution before any commit or cleanup.
2. High: four untracked provider files likely back accepted platform behavior. If they are omitted, four-platform import/preview/save behavior may become unreproducible.
3. High: many untracked scripts and API routes look like accepted operational gates and UI workflows. They should be bundled by feature and verified rather than left loose.
4. Medium: package/config/test changes are tracked modified and large. They need verification as tooling/config, not folded into UI-only tasks.
5. Medium: `docs/handoffs/` has 225 untracked files. Many are valuable source-of-truth handoffs; some are historical or not indexed in `CURRENT-PLATFORM-STATUS.md`. This needs doc retention/indexing policy.
6. Medium: `.agents/`, `.codex/`, and `.trellis/` are local workflow metadata. Tracking them may expose local agent setup noise; ignoring them may lose project workflow context. This needs an explicit policy decision.
7. Low: `git diff --check` has only the known `tsconfig.json` CRLF warning, no whitespace errors.

## Recommended Cleanup / Acceptance Order

1. Freeze deletion/rollback. Keep the current no-delete rule until every dirty bucket is attributed.
2. Create a main-session acceptance matrix from `CURRENT-PLATFORM-STATUS.md`: accepted task ID -> handoff -> code/scripts/docs files -> required verification.
3. First package and verify the 047-only surface: `EvidenceReviewReport.tsx`, `tests/ui-harness.test.mjs`, 047 handoffs, and status/task-board docs. This is the smallest accepted slice.
4. Then package platform-core work by layer order: Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI. Include the four untracked personal provider files and platform scripts in the same reviewed bundle.
5. Then package operating workflow APIs/scripts: action-to-content, content workbench, platform operations, daily ops, trusted weekly safe report, local server health, and E2E scripts.
6. Then package UI data-only surfaces: dashboard, import, content, calendar, reviews, sidebar, CSS/tokens, and UI harness tests.
7. Then decide docs retention: track accepted handoffs/specs/runbooks that are current source-of-truth; archive or ignore historical handoffs only by explicit main-session decision.
8. Decide `.agents/`, `.codex/`, and `.trellis/` policy last. Either track them as intentional project workflow tooling, or add explicit ignore rules / move instructions in a separate approved cleanup task. Do not delete them from this audit.

## Verification Commands And Results

- `git status --short`: PASS. Dirty worktree observed and inventoried.
- `git diff --name-only`: PASS. 48 tracked modified files listed.
- `git diff --check`: PASS, with existing `tsconfig.json` CRLF warning only.

## Changed Files

Auditor changed only:

```text
docs/handoffs/DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md
```

No code files, data files, generated reports, local DBs, or local screenshot artifacts were changed by this audit.

## Known Issues / Residual Risk

- This audit classifies by file path, status baseline, and handoff naming. It does not prove every line in each broad tracked diff belongs to an accepted task.
- Because historical accepted work is not committed, Git cannot currently isolate accepted-vs-unaccepted changes without a main-session attribution pass.
- The untracked file count is high enough that future cleanup should avoid manual ad hoc staging. Use feature bundles and verification gates.

## Orchestrator Decision Required

Yes.

Main session should decide how to bundle, track, ignore, or archive the dirty buckets. No destructive cleanup should happen until that decision exists.
