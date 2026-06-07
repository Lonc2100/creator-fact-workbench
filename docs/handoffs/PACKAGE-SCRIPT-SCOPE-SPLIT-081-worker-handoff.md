# PACKAGE-SCRIPT-SCOPE-SPLIT-081 worker handoff

## Scope

- Split `package.json` script names by active, diagnostic/e2e, Bilibili preview-only, and paused WeChat scopes.
- Kept the change to package/tooling only.
- Did not delete files.
- Did not use `git add .`.
- Did not promote paused WeChat, browser discovery, or Bilibili account metrics into active release scope.

## Script scope outcome

### Active commands kept

- App/runtime basics: `dev`, `dev:operator`, `build`, `start`, `typecheck`.
- Standard project checks/tests: `context:check`, `lint:arch`, `test:*`, `verify:*`.
- Four-platform content-level imports: `import:douyin`, `import:xiaohongshu`, `import:video-account`, `import:bilibili`.
- Daily operating gates: `gate:daily-platform-ops`, `ops:daily-self-media`.

### Diagnostic/e2e commands made explicit

Canonical diagnostic entries now exist for health, audits, safe reports, and smoke/e2e checks:

- `diagnostic:platform-data-health`
- `diagnostic:real-capture-freshness`
- `diagnostic:local-data-quarantine`
- `diagnostic:local-server-health`
- `diagnostic:trusted-dashboard-audit`
- `diagnostic:clean-profile`
- `diagnostic:trusted-weekly-report`
- `diagnostic:trusted-weekly-report:safe`
- `diagnostic:daily-ops-summary:safe`
- `diagnostic:e2e:douyin-save`
- `diagnostic:e2e:xiaohongshu-save`
- `diagnostic:e2e:video-account-save`
- `diagnostic:e2e:bilibili-save`
- `diagnostic:e2e:platforms-save`
- `diagnostic:e2e:platform-operations`
- `diagnostic:e2e:platform-ops-with-health`

Existing compatibility aliases such as `health:platform-data`, `check:local-server-health`, `audit:trusted-dashboard`, `report:*`, and `smoke:*` now delegate to the canonical diagnostic names.

### Bilibili account metrics

- Added `preview-only:bilibili-account-metrics`.
- Included `scripts/bilibili-account-metrics-preview.mjs` so the command points at a tracked file.
- The script reports `previewOnly: true` and `saved: false`; no durable account snapshot save path was added.
- Removed the active-looking `preview:bilibili-account-metrics` package script name.

### Paused WeChat

- Replaced active-looking `check:wechat` with `paused:wechat:check`.
- Did not add `sync:wechat`.
- Did not add `discover:wechat-backend`.
- WeChat remains paused and is not part of active default product commands.

### Excluded from this package/tooling bundle

The following dirty/untracked command targets were intentionally not added to package scripts:

- `check:browser`
- `discover:douyin`
- `discover:xiaohongshu`
- `discover:video-account`
- `discover:bilibili`
- `discover:wechat-backend`
- `sync:wechat`
- `audit:dashboard-numbers`
- `e2e:content-curation`
- `smoke:operating-dashboard-import`
- `smoke:operating-action-to-content`
- `smoke:draft-review-ui-e2e`
- `smoke:calendar-real-scheduling`

## Validation

Required by task:

- `npm run typecheck`
- `npm run test:self-media`
- `git diff --check`

Additional package sanity checks:

- `node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).join('\\n'))"`
- `rg` check confirmed removed package script names are absent from `package.json`.

## Files intended for commit

- `package.json`
- `scripts/bilibili-account-metrics-preview.mjs`
- `docs/handoffs/PACKAGE-SCRIPT-SCOPE-SPLIT-081-worker-handoff.md`

No unrelated dirty files are part of this package/tooling bundle.
