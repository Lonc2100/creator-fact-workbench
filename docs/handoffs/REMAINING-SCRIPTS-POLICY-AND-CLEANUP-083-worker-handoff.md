# REMAINING-SCRIPTS-POLICY-AND-CLEANUP-083 worker handoff

## Task

- Task ID: `REMAINING-SCRIPTS-POLICY-AND-CLEANUP-083`
- Goal: audit remaining untracked scripts plus modified smoke/trajectory files, classify submit/local/paused/delete policy, and output exact-path cleanup candidates.

## Safety

- No files deleted.
- No `Remove-Item`.
- No `git add .`.
- No staging.
- No package/script exposure changes.
- No WeChat reopening.
- No browser, DB, or `.local` write gates were run.

## Current Script Inventory

Dirty script/test scope:

- Modified tracked file: `scripts/smoke-self-media.mjs`
- Modified tracked file: `tests/agent-trajectory.test.mjs`
- Untracked scripts:
  - `scripts/bilibili-personal-discovery.mjs`
  - `scripts/calendar-real-scheduling-smoke-044.mjs`
  - `scripts/check-browser-automation.mjs`
  - `scripts/content-curation-e2e.mjs`
  - `scripts/dashboard-number-trust-audit.mjs`
  - `scripts/douyin-personal-discovery.mjs`
  - `scripts/draft-review-ui-e2e-039.mjs`
  - `scripts/operating-e2e-action-to-content.mjs`
  - `scripts/operating-e2e-dashboard-import.mjs`
  - `scripts/sync-wechat-official.ts`
  - `scripts/video-account-personal-discovery.mjs`
  - `scripts/wechat-backend-discovery.mjs`
  - `scripts/xiaohongshu-personal-discovery.mjs`

`package.json` is currently clean and no longer exposes active-looking `sync:wechat`, `discover:wechat-backend`, `discover:*`, `check:browser`, `audit:dashboard-numbers`, or the untracked E2E scripts. This matches `PACKAGE-SCRIPT-SCOPE-SPLIT-081`: active product commands and diagnostic/paused scopes are split.

## Classification Matrix

| Path | Class | Submit policy | Reason |
| --- | --- | --- | --- |
| `scripts/calendar-real-scheduling-smoke-044.mjs` | diagnostic package | Can submit in `diagnostic-regression-scripts` package, without package exposure | Accepted calendar workflow regression; uses isolated sqlite/port and writes reports under `.local`. |
| `scripts/content-curation-e2e.mjs` | diagnostic package | Can submit in `diagnostic-regression-scripts` package, without package exposure | Accepted content curation E2E; uses isolated sqlite and screenshots. |
| `scripts/dashboard-number-trust-audit.mjs` | diagnostic package, harness dependency | Should submit in diagnostic package before relying on clean checkout | `tests/ui-harness.test.mjs` reads this script; fixture mode uses isolated sqlite, live mode is read-only. |
| `scripts/draft-review-ui-e2e-039.mjs` | diagnostic package | Can submit in diagnostic package, without package exposure | Accepted draft review / publish ledger E2E; uses isolated sqlite and temporary server. |
| `scripts/operating-e2e-action-to-content.mjs` | diagnostic package | Can submit in diagnostic package, without package exposure | Accepted action-to-content E2E; uses isolated sqlite and screenshots. |
| `scripts/operating-e2e-dashboard-import.mjs` | diagnostic package | Can submit in diagnostic package, without package exposure | Accepted dashboard/import E2E; uses isolated sqlite, health report, and screenshots. |
| `scripts/smoke-self-media.mjs` | legacy smoke diagnostic | Can submit only after running `npm run test:smoke` or an explicit smoke gate decision | Modified hardening moves port to 3201, uses Windows process-tree cleanup, confirms publish manually, checks trusted scope stability, and softens fragile UI editor/drag assumptions. |
| `scripts/douyin-personal-discovery.mjs` | collector companion, not default product logic | Can submit in separate `collector-discovery-companion` package; do not add active package command unless Orchestrator chooses | User-driven browser capture helper. Sanitizes request data and writes only under `.local/douyin-personal-v0`, but uses browser profile and raw capture directories. |
| `scripts/xiaohongshu-personal-discovery.mjs` | collector companion, not default product logic | Can submit in separate collector package; do not add active package command by default | Same pattern as Douyin for Xiaohongshu creator backend discovery. |
| `scripts/video-account-personal-discovery.mjs` | collector companion, not default product logic | Can submit in separate collector package; do not add active package command by default | Video Account is active four-platform content scope, but this script is still a user-driven browser helper with `.local` raw/profile outputs. |
| `scripts/bilibili-personal-discovery.mjs` | collector companion, not default product logic | Can submit in separate collector package; do not add active package command by default | Bilibili content-level discovery helper; account metrics remain preview/diagnostic only. |
| `scripts/check-browser-automation.mjs` | local/browser diagnostic tool | Keep local or submit only in explicit browser-tooling package | Useful probe from `BROWSER-AUTO-001`, but not product mainline and not currently exposed by `package.json`. |
| `scripts/sync-wechat-official.ts` | paused WeChat, should not be exposed | Do not submit; exact delete candidate | Loads `.env.local` and calls `syncWechatOfficialAnalytics`; would reopen paused WeChat sync and can write through service if run. |
| `scripts/wechat-backend-discovery.mjs` | paused WeChat backend, should not be exposed | Do not submit; exact delete candidate | Browser capture helper for `mp.weixin.qq.com`; writes `.local/wechat-backend-v0/raw` and profile data if run. WeChat backend remains paused. |
| `tests/agent-trajectory.test.mjs` | trajectory governance test | Do not submit as-is | Current diff adds `WECHAT-001` and `BROWSER-AUTO-001` to the current phase trajectory. The Browser reference may be historical, but adding `WECHAT-001` risks re-promoting paused WeChat into current evidence. |

## Recommended Submit Packages

### 1. `diagnostic-regression-scripts`

Submit together:

- `scripts/calendar-real-scheduling-smoke-044.mjs`
- `scripts/content-curation-e2e.mjs`
- `scripts/dashboard-number-trust-audit.mjs`
- `scripts/draft-review-ui-e2e-039.mjs`
- `scripts/operating-e2e-action-to-content.mjs`
- `scripts/operating-e2e-dashboard-import.mjs`

Rules:

- Do not add active-looking package commands in the same commit.
- Keep them as diagnostic/regression assets, not default product workflow.
- Required minimum verification before commit: `node --check` for all six, `npm run test:ui-harness`, `git diff --check`.
- Run their heavy browser gates only serially and only when explicitly requested.

### 2. `collector-discovery-companion`

Submit separately:

- `scripts/douyin-personal-discovery.mjs`
- `scripts/xiaohongshu-personal-discovery.mjs`
- `scripts/video-account-personal-discovery.mjs`
- `scripts/bilibili-personal-discovery.mjs`

Rules:

- Treat as user-driven local capture helpers, not automatic refresh.
- Keep `.local/**/raw` and `.local/**/chrome-profile` ignored and local.
- Do not expose as active package commands unless the Orchestrator intentionally adds a clearly labeled collector/tooling interface.
- Required minimum verification before commit: `node --check` for all four, secret/header/cookie sanitization review, `git diff --check`.

### 3. `legacy-smoke-hardening`

Submit separately only after smoke acceptance:

- `scripts/smoke-self-media.mjs`

Rules:

- This is diagnostic smoke tooling, not product logic.
- It should not be bundled with unrelated UI/product changes.
- Required verification before commit: `npm run test:smoke` or explicit Orchestrator decision to defer because it launches Next/Browser.

## Keep Local / Do Not Submit Now

- `scripts/check-browser-automation.mjs`: keep as local/browser diagnostic unless a browser-tooling package is explicitly requested.
- `tests/agent-trajectory.test.mjs`: do not submit as-is. If retained later, split Browser and WeChat treatment, and keep WeChat marked paused/historical rather than current active trajectory.

## Paused WeChat Must Not Be Exposed

The following must not be submitted or added to active package scripts unless the user explicitly reopens WeChat:

- `scripts/sync-wechat-official.ts`
- `scripts/wechat-backend-discovery.mjs`

Current policy sources:

- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`: WeChat Official Account / backend remains paused; do not run or advertise `sync:wechat`, `discover:wechat-backend`, or WeChat routes as active release scope.
- `docs/product-specs/index.md`: paused WeChat must not be added to active release scope without explicit reopening.
- `PACKAGE-SCRIPT-SCOPE-SPLIT-081`: package scripts now omit `sync:wechat` and `discover:wechat-backend`.

## Exact Delete Candidate List

No deletion was executed. If the user confirms cleanup in a later deletion task, the safe exact-path candidates are:

1. `scripts/sync-wechat-official.ts`
   - Reason: paused WeChat sync entrypoint; not exposed by current `package.json`; can write through service if run; no current active product scope.
2. `scripts/wechat-backend-discovery.mjs`
   - Reason: paused WeChat backend browser discovery; not exposed by current `package.json`; produces raw/profile `.local/wechat-backend-v0` artifacts if run; no current active product scope.

Deletion must still use one explicit command per file, after human confirmation:

```powershell
Remove-Item -LiteralPath "D:\codex work\自媒体创作\Data Collection and Background Analysis\scripts\sync-wechat-official.ts"
Remove-Item -LiteralPath "D:\codex work\自媒体创作\Data Collection and Background Analysis\scripts\wechat-backend-discovery.mjs"
```

Do not delete directories. Do not use wildcards. Do not use `git clean`. Do not delete `.local`, DBs, browser profiles, cookies, raw captures, or backups.

## Verification Performed

- `git status -sb`: confirmed current remaining dirty scope.
- `git status --porcelain=v1 --untracked-files=all -- scripts tests/agent-trajectory.test.mjs package.json`: confirmed target script/test scope.
- `rg` reference scan across `docs`, `package.json`, `tests`, `src`, and `scripts`.
- `node --check` for all untracked `.mjs` scripts: PASS.
- `node --check scripts/smoke-self-media.mjs`: PASS.
- `node --check tests/agent-trajectory.test.mjs`: PASS.
- `npm run test:agent-trajectory`: PASS.
- `npm run test:ui-harness`: PASS.
- `git diff --check`: PASS.

Not run:

- `npm run test:smoke` and browser/E2E smoke gates. They are heavy and should stay serialized.

## Next Recommendation

1. Commit `diagnostic-regression-scripts` first, because `dashboard-number-trust-audit.mjs` is already read by the tracked UI harness.
2. Then decide whether to commit `collector-discovery-companion` as local capture helpers without package exposure.
3. Delete paused WeChat script candidates only in a separate exact-path deletion task after user confirmation.
4. Do not submit `tests/agent-trajectory.test.mjs` as currently modified; avoid putting paused WeChat back into the current phase trajectory.
