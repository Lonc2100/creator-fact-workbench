# LOCAL-WORKFLOW-ASSETS-POLICY-048 Auditor Handoff

Date: 2026-06-05

## Task ID

LOCAL-WORKFLOW-ASSETS-POLICY-048

## Scope

Read-only audit of untracked local workflow, documentation, spec, and script assets.

Audited paths:

- `.agents/`
- `.codex/`
- `.trellis/`
- `docs/handoffs/`
- `docs/product-specs/`
- `scripts/`

No code, data, `.gitignore`, or existing files were modified or deleted. The only written file is this handoff.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/DIRTY-WORKTREE-SCOPE-AUDIT-048-auditor-handoff.md`
- `docs/trellis-parallel-workflow.md`

## Inventory

Expanded untracked files in audited paths: 392.

Grouped count:

| Path | Count | Observed role |
| --- | ---: | --- |
| `docs/handoffs/` | 227 | Durable worker/orchestrator/auditor handoffs and status records. |
| `.trellis/` | 61 | Trellis workflow engine, specs, task packages, and workspace journals. |
| `scripts/` | 36 | Operational, smoke, audit, report, import, and platform helper scripts. |
| `.agents/` | 35 | Trellis-oriented Codex skills and reference docs. |
| `docs/product-specs/` | 26 | Product/task specs for platform, UI, workflow, and connector work. |
| `.codex/` | 7 | Project Codex agents, config, and prompt/session hooks. |

`git status --short -- .agents .codex .trellis docs/handoffs docs/product-specs scripts` also shows tracked modifications in:

- `docs/handoffs/README.md`
- `docs/product-specs/index.md`
- `scripts/smoke-self-media.mjs`

Those tracked modifications are outside the untracked-only policy recommendation, but they should be reviewed with their adjacent asset groups.

## Path Findings And Policy Recommendation

### `docs/handoffs/`

Current untracked count: 227.

Cross-reference with `CURRENT-PLATFORM-STATUS.md`:

- 69 untracked handoff files are explicitly referenced by the current status index.
- 158 untracked handoff files are not explicitly named in the current compact status file.

Recommendation:

- Should track: `CURRENT-PLATFORM-STATUS.md`, 045/047 main-session closure files, 047 worker/auditor/screenshot files, and all handoff/review files explicitly referenced in the "Important Orchestrator Reviews" table or current accepted baseline.
- Needs main-session decision: the 158 unindexed historical files. Most look project-related, but the policy choice is whether to track them as archival evidence, move stale ones to a documented archive path, or leave them local.
- Should not ignore globally: `docs/handoffs/` is the project's durable handoff source of truth. Ignoring the whole directory would break continuation and auditability.
- Keep local only: screenshot artifacts and generated local evidence should stay under `.local/`, not be represented by adding binaries to `docs/handoffs/`.

Risk:

- Leaving current status and accepted handoffs untracked makes future sessions depend on a dirty local tree.
- Tracking every historical handoff without an index may make the source-of-truth noisy, but it is safer than deletion until a retention policy exists.

### `docs/product-specs/`

Current untracked count: 26.

Files include platform specs, UI specs, browser/import specs, review/action specs, and WeChat/Bilibili/Xiaohongshu/Video Account specs.

Recommendation:

- Should track: active or accepted specs that describe shipped/accepted behavior, especially platform specs, content workflow, import real, review action backend, Bilibili account metrics boundary, and current UI/operator specs used by handoffs.
- Needs main-session decision: older UI reset/art-direction specs and paused WeChat specs. They may be useful historical context, but the main session should decide whether they remain active specs, archived specs, or deprecated references.
- Should not ignore globally: product specs are project governance, not local machine state.
- Keep local only: none identified in this directory by path alone.

Risk:

- `docs/product-specs/index.md` is tracked modified while individual specs are untracked. This creates an index-to-file drift risk.

### `scripts/`

Current untracked count: 36.

All 36 untracked script filenames appear referenced by `package.json` commands or are part of the same accepted operational script family. Examples:

- `scripts/start-operator-dev.mjs` for `npm run dev:operator`.
- Platform discovery/import/save scripts for Douyin, Xiaohongshu, Video Account, and Bilibili.
- Daily ops, trusted audit, dashboard-number audit, platform health, local-server health, content curation, and operating E2E scripts.
- `scripts/sync-wechat-official.ts` and `scripts/wechat-backend-discovery.mjs` exist, while WeChat remains paused by policy.

Recommendation:

- Should track: operational scripts referenced by `package.json` after the matching feature bundle is accepted and verified. These scripts are required for reproducing the current standing commands in `CURRENT-PLATFORM-STATUS.md`.
- Needs main-session decision: WeChat backend/sync scripts. They may be retained as paused capability, but must stay clearly gated and not treated as active default operations.
- Should not ignore globally: `scripts/` contains project verification gates and operator commands.
- Keep local only: generated reports or raw captures should not go under `scripts/`; none are visible here.

Risk:

- `package.json` can point to scripts that are untracked. A fresh checkout would have commands that fail immediately.
- Tracking scripts before bundling core/provider changes may still leave commands broken, so stage them with the related code layer and tests.

### `.trellis/`

Current untracked count: 61.

Observed breakdown:

| Subpath | Count | Meaning |
| --- | ---: | --- |
| `.trellis/scripts` | 28 | Trellis local workflow engine scripts. |
| `.trellis/tasks` | 14 | Bootstrap and three UI pilot task packages with `prd.md`, `task.json`, and logs. |
| `.trellis/spec` | 11 | Frontend/guides specs injected into worker sessions. |
| `.trellis/` root files | 5 | `.gitignore`, `.template-hashes.json`, `.version`, `config.yaml`, `workflow.md`. |
| `.trellis/workspace` | 3 | Workspace index/journal files. |

`docs/trellis-parallel-workflow.md` says Trellis is the current multi-session task-folder and spec-injection system, but also says core files remain main-session coordinated.

Recommendation:

- Should track: `.trellis/workflow.md`, `.trellis/spec/**`, and active task package definitions (`prd.md`, `task.json`) if the project wants Trellis reproducibility across machines.
- Needs main-session decision: `.trellis/scripts/**`, `.trellis/config.yaml`, `.trellis/.version`, and `.trellis/.template-hashes.json`. Tracking the engine copy makes the repo self-contained; ignoring it requires a separate install/bootstrap instruction.
- Keep local only or should ignore: `.trellis/workspace/**`, task execution logs such as `implement.jsonl` and `check.jsonl`, and per-developer/current-task/runtime files. These are session state, not product source.
- Should not track without review: any auto-commit or hook behavior. `.trellis/config.yaml` documents optional auto-commit behavior, even if the active setting is commented out.

Risk:

- If all of `.trellis/` is ignored, future workers lose the exact task packages and spec guides referenced by project docs.
- If all of `.trellis/` is tracked, personal journals and task logs may add noisy machine/session history.

### `.agents/`

Current untracked count: 35.

Observed content:

- Trellis skills such as `trellis-start`, `trellis-before-dev`, `trellis-check`, `trellis-continue`, `trellis-finish-work`, and `trellis-update-spec`.
- Trellis meta and bootstrap reference docs.

Recommendation:

- Needs main-session decision: whether project-specific Trellis skills are shared repo assets or local Codex-user assets.
- Should track only if curated: track a minimal, reviewed skill set only if the team wants every worker to load identical Trellis skills from this repo.
- Keep local only or should ignore by default: `.agents/` as a whole, especially if these are generated or user-specific skill copies. The Trellis docs already treat agent runtime files as local-only in spirit.
- Alternative: move durable workflow rules into `docs/trellis-parallel-workflow.md` and `.trellis/spec/**`, and keep `.agents/` local.

Risk:

- Tracking unreviewed agent skills can silently change future agent behavior.
- Ignoring them without preserving the key instructions elsewhere could make the Trellis workflow harder to reproduce.

### `.codex/`

Current untracked count: 7.

Files:

```text
.codex/agents/trellis-check.toml
.codex/agents/trellis-implement.toml
.codex/agents/trellis-research.toml
.codex/config.toml
.codex/hooks.json
.codex/hooks/inject-workflow-state.py
.codex/hooks/session-start.py
```

Observed behavior:

- `.codex/config.toml` is project-scoped Codex config.
- `.codex/hooks.json` registers a `UserPromptSubmit` command hook that runs `.codex/hooks/inject-workflow-state.py`.
- Hook execution is security-sensitive even if it is useful for workflow context.

Recommendation:

- Needs main-session decision before tracking: all `.codex/` files.
- Should track only after explicit security/workflow review: project-level agents and hooks, if the team wants reproducible Codex behavior.
- Keep local only or should ignore by default: user-specific Codex configuration and hooks until reviewed.
- If tracked, document that hooks require user-level enablement and one-time approval; do not assume they run everywhere.

Risk:

- Hooks are executable automation. Tracking them changes future prompt/session behavior and deserves explicit approval.
- Ignoring them may be preferable for safety, but then Trellis bootstrap must not depend on them without a manual fallback.

## Summary Recommendation Matrix

| Asset group | Default recommendation | Rationale |
| --- | --- | --- |
| Current/accepted handoffs named in `CURRENT-PLATFORM-STATUS.md` | Should track | They are source-of-truth continuation and audit records. |
| Historical/unindexed handoffs | Needs main-session decision | Likely valuable, but noisy without retention/index policy. |
| Product specs | Should track active specs; decision for stale specs | Specs are governance; stale status needs explicit labeling. |
| Package-referenced operational scripts | Should track with feature bundles | Required to reproduce `package.json` commands and standing gates. |
| Paused WeChat scripts/specs | Needs main-session decision | Keep paused boundary explicit; do not activate by accident. |
| `.trellis/spec` and active task PRDs | Should track if Trellis remains project workflow | Needed for multi-session reproducibility. |
| `.trellis/workspace` and task logs | Keep local / should ignore | Session journals and execution logs are machine/session state. |
| `.trellis/scripts` engine copy | Needs main-session decision | Self-contained repo vs external/bootstrap dependency tradeoff. |
| `.agents/` | Keep local by default; track only curated subset by decision | Agent behavior is environment-specific and potentially noisy. |
| `.codex/` | Keep local by default; track only after security review | Hooks/config can alter Codex behavior. |

## Suggested Next Steps

1. Do not delete or bulk-ignore anything yet.
2. Track current accepted handoffs/status docs first, especially the 047/048 audit chain and files referenced by `CURRENT-PLATFORM-STATUS.md`.
3. Track `docs/product-specs/` active specs together with the code bundles they govern; mark stale/paused specs explicitly before tracking them.
4. Track `scripts/` only alongside the package/core/provider/UI changes they verify, then run the matching npm gates.
5. Decide Trellis policy as a separate main-session task:
   - Track `.trellis/spec`, `.trellis/workflow.md`, and active task PRDs.
   - Keep `.trellis/workspace` and execution logs local.
   - Decide whether `.trellis/scripts` is vendored or installed externally.
6. Decide `.agents/` and `.codex/` policy last, with special attention to executable hooks.

## Verification Commands And Results

- `git status --short -- .agents .codex .trellis docs/handoffs docs/product-specs scripts`: PASS.
- `git diff --check`: PASS, with existing `tsconfig.json` CRLF warning only.

## Changed Files

Auditor changed only:

```text
docs/handoffs/LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md
```

No `.gitignore`, code, data, scripts, config, or existing docs were modified.

## Orchestrator Decision Required

Yes.

Main session should decide the repository policy for `.agents/`, `.codex/`, `.trellis/`, historical handoffs, stale specs, and paused WeChat script/spec retention before any tracking/ignore cleanup happens.
