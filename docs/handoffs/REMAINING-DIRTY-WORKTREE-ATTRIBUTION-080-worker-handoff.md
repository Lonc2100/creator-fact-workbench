# REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080 worker handoff

## Task

- Task ID: `REMAINING-DIRTY-WORKTREE-ATTRIBUTION-080`
- Started: 2026-06-07T11:40:00+08:00
- Finished: 2026-06-07T11:57:12+08:00
- Elapsed: about 17 minutes
- Workload class: normal
- Goal: audit the remaining modified files and untracked scripts, attribute them by product/diagnostic/historical/paused/preview/local-tool class, and output submit/delete/keep-untracked/main-decision lists.

## Safety

- No files deleted.
- No `git add .`.
- No staging.
- No rollback of user or prior-worker changes.
- No database writes.
- No `.local` cleanup.

## Current inventory

Current `git status --short` shows:

- 13 modified files.
- 14 untracked files under `scripts/`.
- 1 modified script: `scripts/smoke-self-media.mjs`.

So the current worktree has 15 script-related dirty entries, but only 14 are untracked scripts. The task wording says "15 untracked scripts"; the actual git state is "14 untracked scripts + 1 modified script".

Additional non-script untracked files observed:

- `docs/handoffs/SAFE-LEGACY-SCRIPTS-CLEANUP-080-worker-handoff.md`
- `docs/trellis-parallel-workflow.md`

## Modified file attribution

| File | Attribution | Action class | Reason |
| --- | --- | --- | --- |
| `AGENTS.md` | governance/process mainline | can submit with governance bundle | Adds Trellis read rule and worker boundary. Not product UI. Pair with `docs/trellis-parallel-workflow.md`. |
| `docs/agent-playbook.md` | governance/process mainline | can submit with governance bundle | Adds parallel long-cycle and runtime quality protocol. Compatible with current handoff discipline. |
| `docs/cleanup-manifest.md` | cleanup governance | can submit with cleanup/context bundle | Records 2026-06-05 parent cleanup/AiToEarn boundary. No deletion command embedded. |
| `docs/context/current-state.md` | cleanup/context governance | can submit with cleanup/context bundle | Updates parent-directory statement to avoid treating `AiToEarn` as active context. |
| `docs/generated/template-doctor-report.md` | generated evidence | needs main-session decision | Timestamp-only generated report refresh. Usually not worth committing alone unless the bundle intentionally records regenerated verification evidence. |
| `docs/golden-principles.md` | governance/process mainline | can submit with governance bundle | Adds long-cycle and runtime quality rules plus existing entropy scan entry. |
| `docs/handoffs/README.md` | governance/process mainline | can submit with governance bundle | Adds current entry, short chat protocol, relay contract, entropy retention, archive rules. |
| `package.json` | mixed tooling/package exposure | needs main-session decision | Adds commands for active discovery, diagnostics, Bilibili preview, and paused WeChat. Must not be submitted without deciding whether paused WeChat commands should be advertised. |
| `scripts/smoke-self-media.mjs` | diagnostic/tooling, legacy smoke | can submit only after legacy-smoke verification | Attributed by prior docs to legacy smoke hardening: port 3201, Windows process-tree cleanup, `confirm_publish`, trusted totals unchanged, softer UI editor/drag assumptions. Requires `npm run test:smoke` before staging. |
| `src/domain/self-media/providers/csv-preset-provider.ts` | product mainline, import-real preview | can submit with import-real bundle | Attributed to `IMPORT-REAL-011`: XLSX parsing, platform-native aliases, preview rows, confidence, no durable raw/native persistence. Needs import-real/self-media tests before staging. |
| `src/domain/self-media/ui/screens/LeadsPage.tsx` | product UI polish | can submit with small UI polish bundle | Chinese eyebrow copy change from `CRM light` to `增长线索`; low risk. |
| `src/domain/self-media/ui/screens/UiLabPage.tsx` | UI harness/theme experiment | needs main-session decision | Adds theme preview cards inside `/ui-lab`; useful but internal/lab-only, should be paired with UI theme docs/tests if kept. |
| `tests/agent-trajectory.test.mjs` | governance/test trajectory | needs main-session decision | Expands trajectory to `BROWSER-AUTO-001` and `WECHAT-001`; risks treating paused WeChat as current active evidence unless paired with paused labeling/index decisions. |

## Untracked script attribution

| Script | Attribution | Action class | Reason |
| --- | --- | --- | --- |
| `scripts/douyin-personal-discovery.mjs` | product mainline companion, active four-platform discovery | can submit with collector/tooling bundle | Accepted discovery lineage; writes sanitized raw capture only under `.local/douyin-personal-v0/`. |
| `scripts/xiaohongshu-personal-discovery.mjs` | product mainline companion, active four-platform discovery | can submit with collector/tooling bundle | Accepted discovery lineage; writes sanitized raw capture only under `.local/xiaohongshu-personal-v0/`. |
| `scripts/video-account-personal-discovery.mjs` | product mainline companion, active four-platform discovery | can submit with collector/tooling bundle | Accepted discovery lineage; writes sanitized raw capture only under `.local/video-account-personal-v0/`. |
| `scripts/bilibili-personal-discovery.mjs` | product mainline companion, active four-platform discovery | can submit with collector/tooling bundle | Accepted Bilibili content-level discovery; account fields remain diagnostic/preview only. |
| `scripts/calendar-real-scheduling-smoke-044.mjs` | diagnostic regression, calendar workflow | can submit with diagnostic smoke bundle | Accepted by `CALENDAR-REAL-SCHEDULING-WORKFLOW-044`; uses isolated sqlite/port. |
| `scripts/content-curation-e2e.mjs` | diagnostic regression, content curation | can submit with diagnostic smoke bundle | Accepted isolated Playwright proof; uses isolated sqlite. |
| `scripts/dashboard-number-trust-audit.mjs` | diagnostic regression, dashboard trust | can submit with diagnostic smoke bundle | Accepted by dashboard number audit 043/044; fixture mode isolated, live mode read-only. |
| `scripts/draft-review-ui-e2e-039.mjs` | diagnostic regression, draft review/publish ledger | can submit with diagnostic smoke bundle | Accepted by 039/040/041; uses isolated sqlite and temporary server. |
| `scripts/operating-e2e-action-to-content.mjs` | diagnostic regression, action-to-content | can submit with diagnostic smoke bundle | Accepted isolated browser E2E; uses isolated sqlite. |
| `scripts/operating-e2e-dashboard-import.mjs` | diagnostic regression, dashboard/import | can submit with diagnostic smoke bundle | Accepted isolated browser smoke; uses isolated sqlite. |
| `scripts/bilibili-account-metrics-preview.mjs` | Bilibili preview/diagnostic only | keep untracked unless Orchestrator promotes diagnostics | Preview-only command. Current guardrail: do not promote account metrics into durable account snapshots or content totals. |
| `scripts/check-browser-automation.mjs` | local/browser tooling diagnostic | keep untracked or submit only with tooling bundle | Browser CLI probe; useful local diagnostic but not product mainline. |
| `scripts/sync-wechat-official.ts` | paused WeChat | keep untracked unless user explicitly reopens WeChat | Current status says do not run or advertise `sync:wechat` as active release scope. |
| `scripts/wechat-backend-discovery.mjs` | paused WeChat backend | keep untracked unless user explicitly reopens WeChat backend | Current status says WeChat backend remains paused. |

## Four action lists

### Can Submit

Submit only in small, named bundles with matching verification:

- Governance/process bundle:
  - `AGENTS.md`
  - `docs/agent-playbook.md`
  - `docs/golden-principles.md`
  - `docs/handoffs/README.md`
  - `docs/trellis-parallel-workflow.md`
- Cleanup/context bundle:
  - `docs/cleanup-manifest.md`
  - `docs/context/current-state.md`
- Import-real product bundle:
  - `src/domain/self-media/providers/csv-preset-provider.ts`
- UI copy bundle:
  - `src/domain/self-media/ui/screens/LeadsPage.tsx`
- Diagnostic smoke bundle:
  - `scripts/calendar-real-scheduling-smoke-044.mjs`
  - `scripts/content-curation-e2e.mjs`
  - `scripts/dashboard-number-trust-audit.mjs`
  - `scripts/draft-review-ui-e2e-039.mjs`
  - `scripts/operating-e2e-action-to-content.mjs`
  - `scripts/operating-e2e-dashboard-import.mjs`
- Collector companion bundle:
  - `scripts/douyin-personal-discovery.mjs`
  - `scripts/xiaohongshu-personal-discovery.mjs`
  - `scripts/video-account-personal-discovery.mjs`
  - `scripts/bilibili-personal-discovery.mjs`
- Legacy smoke bundle, only after running the intended smoke:
  - `scripts/smoke-self-media.mjs`

### Should Delete

No exact-path delete recommendation from this audit.

Reason: every dirty script is either accepted diagnostic evidence, active/companion collector tooling, paused WeChat history, Bilibili preview, or a browser/local diagnostic. The prior `SAFE-LEGACY-SCRIPTS-CLEANUP-080` handoff also stopped because no approved exact deletion list existed.

Deletion still requires a separate user-approved exact path list and one explicit `Remove-Item -LiteralPath ...` per file.

### Keep Untracked For Now

- `scripts/bilibili-account-metrics-preview.mjs`: Bilibili account preview only; keep out of active package unless explicitly promoted as diagnostic-only.
- `scripts/check-browser-automation.mjs`: local/browser tool; keep out of product mainline unless packaged as tooling.
- `scripts/sync-wechat-official.ts`: paused WeChat; do not advertise as active.
- `scripts/wechat-backend-discovery.mjs`: paused WeChat backend; do not advertise as active.
- `docs/handoffs/SAFE-LEGACY-SCRIPTS-CLEANUP-080-worker-handoff.md`: keep as safety evidence for the aborted cleanup attempt; do not treat as deletion approval.

### Needs Main-Session Decision

- `package.json`: currently exposes active, diagnostic, Bilibili preview, browser tooling, and paused WeChat commands together. Decide whether to split package scripts by bundle and whether paused WeChat commands should be absent, hidden, or explicitly labeled.
- `tests/agent-trajectory.test.mjs`: decide whether Browser Auto and WeChat belong in trajectory tests now, given WeChat is paused.
- `docs/generated/template-doctor-report.md`: decide whether generated timestamp refresh belongs in commits.
- `src/domain/self-media/ui/screens/UiLabPage.tsx`: decide whether the theme preview experiment should be accepted as UI harness state or left out.
- `scripts/bilibili-account-metrics-preview.mjs`: decide whether package exposure is acceptable as diagnostics-only.
- `scripts/sync-wechat-official.ts` and `scripts/wechat-backend-discovery.mjs`: decide only if user explicitly reopens WeChat scope.
- Any future deletion of scripts: requires explicit exact-path approval.

## Verification performed

- `git status --short`: confirmed current inventory.
- `git diff --stat`: confirmed 13 modified files.
- `git status --porcelain=v1 --untracked-files=all -- scripts`: confirmed script state.
- `node --check` for 13 untracked `.mjs` scripts: PASS.
- `git diff --check`: PASS.
- Targeted trailing whitespace scan on reviewed docs: PASS, no matches.

Not run:

- Heavy browser/E2E/smoke gates. This was an attribution audit, and heavy gates are serialized by project rules.

## Next recommendation

1. First decide `package.json` policy. It is the highest-risk mixing point.
2. Submit governance docs separately from product/import/provider work.
3. Keep paused WeChat and Bilibili account preview out of active release language unless explicitly reopened/promoted.
4. Do not delete any scripts in the next cleanup turn unless the user gives exact approved paths.

## Orchestrator decision required

Yes. The main-session decision is required for package script exposure, paused WeChat treatment, Bilibili preview packaging, generated report policy, and any deletion.
