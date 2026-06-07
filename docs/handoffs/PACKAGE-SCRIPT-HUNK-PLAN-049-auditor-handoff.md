# PACKAGE-SCRIPT-HUNK-PLAN-049 Auditor Handoff

## Task ID

PACKAGE-SCRIPT-HUNK-PLAN-049

## Runtime

- Started: 2026-06-05 19:53:27 +08:00
- Finished: 2026-06-05 19:53:27 +08:00
- Elapsed: under 15 minutes
- Workload class: normal
- <15min explanation or extra-depth pass>: Extra-depth pass completed. Read the runtime quality protocol, inspected the full `package.json` diff, listed every current script/dependency, and cross-checked referenced script file status before writing the hunk plan.

## Scope

Plan future hunk-level staging for `package.json`.

Boundaries kept:

- Did not stage.
- Did not commit.
- Did not modify `package.json`.
- Did not delete files.
- Wrote only this handoff.

## Required Context Read

- `docs/handoffs/BUNDLE-SCOPE-RESOLVE-049-auditor-handoff.md`
- `docs/handoffs/PLATFORM-CORE-STAGING-DRYRUN-049-worker-handoff.md`
- `docs/handoffs/WORKER-RUNTIME-QUALITY-PROTOCOL-049-worker-handoff.md`

## Current Diff Summary

`package.json` currently has one mixed diff region:

- `dev` port changed from 3001 to 3200.
- `start` port changed from 3001 to 3200.
- `dev:operator` added.
- 36 new script entries added after `check:wechat`.
- `simple-icons` dependency added.

This whole-file diff cannot be assigned to one bundle.

## Current Diff Classification Table

| Hunk / Entry | Current command or dependency | Classification | Future bundle | Stage now with platform-core? |
| --- | --- | --- | --- | --- |
| `dev` port 3200 | `next dev --hostname 127.0.0.1 --port 3200` | local operator/default port tooling | `next-dist-tooling` or operator tooling | No |
| `start` port 3200 | `next start --hostname 127.0.0.1 --port 3200` | local operator/default port tooling | `next-dist-tooling` or operator tooling | No |
| `dev:operator` | `node scripts/start-operator-dev.mjs` | local operator tooling | `next-dist-tooling` or operator tooling | No |
| `sync:wechat` | `tsx scripts/sync-wechat-official.ts` | paused WeChat | paused historical / diagnostics | No |
| `check:browser` | `node scripts/check-browser-automation.mjs` | browser tooling | later tooling/browser bundle | No |
| `discover:douyin` | `node scripts/douyin-personal-discovery.mjs` | active four-platform discovery | platform-core companion | Optional |
| `discover:xiaohongshu` | `node scripts/xiaohongshu-personal-discovery.mjs` | active four-platform discovery | platform-core companion | Optional |
| `discover:video-account` | `node scripts/video-account-personal-discovery.mjs` | active four-platform discovery | platform-core companion | Optional |
| `discover:bilibili` | `node scripts/bilibili-personal-discovery.mjs` | active four-platform discovery | platform-core companion | Optional |
| `discover:wechat-backend` | `node scripts/wechat-backend-discovery.mjs` | paused WeChat backend | paused historical / diagnostics | No |
| `import:douyin` | `tsx scripts/douyin-personal-import.mjs` | active platform-core | platform-core | Yes |
| `import:xiaohongshu` | `tsx scripts/xiaohongshu-personal-import.mjs` | active platform-core | platform-core | Yes |
| `import:video-account` | `tsx scripts/video-account-personal-import.mjs` | active platform-core | platform-core | Yes |
| `import:bilibili` | `tsx scripts/bilibili-personal-import.mjs` | active platform-core | platform-core | Yes |
| `preview:bilibili-account-metrics` | `tsx scripts/bilibili-account-metrics-preview.mjs` | Bilibili account diagnostics | Bilibili diagnostics | No |
| `health:platform-data` | `node scripts/platform-data-health.mjs` | active platform proof/health | platform-core or platform-ops | Yes |
| `check:real-capture-freshness` | `node scripts/real-capture-freshness-check.mjs` | operating freshness | daily ops / reporting | No |
| `check:local-data-quarantine` | `node scripts/local-data-quarantine-report.mjs` | trusted-scope diagnostics | daily ops / reporting | No |
| `check:local-server-health` | `node scripts/local-server-health.mjs` | local server diagnostics | next/operator/daily ops | No |
| `audit:trusted-dashboard` | `node scripts/trusted-dashboard-audit.mjs` | operating audit | daily ops / reporting | No |
| `audit:dashboard-numbers` | `node --import tsx scripts/dashboard-number-trust-audit.mjs` | dashboard audit | daily ops / reporting | No |
| `check:clean-profile` | `tsx scripts/clean-profile-status.mjs` | profile diagnostics | daily ops / reporting | No |
| `report:trusted-weekly` | `tsx scripts/trusted-weekly-report.mjs` | reporting | daily ops / reporting | No |
| `report:trusted-weekly:safe` | `tsx scripts/trusted-weekly-report.mjs --redacted-only` | reporting | daily ops / reporting | No |
| `report:daily-ops:safe` | `node scripts/daily-ops-redacted-summary.mjs` | daily ops reporting | daily ops / reporting | No |
| `e2e:content-curation` | `node --import tsx scripts/content-curation-e2e.mjs` | UI/workflow E2E | operator workflow | No |
| `smoke:operating-dashboard-import` | `node --import tsx scripts/operating-e2e-dashboard-import.mjs` | operating E2E | operator workflow | No |
| `smoke:operating-action-to-content` | `node --import tsx scripts/operating-e2e-action-to-content.mjs` | operating E2E | operator workflow | No |
| `smoke:draft-review-ui-e2e` | `node --import tsx scripts/draft-review-ui-e2e-039.mjs` | UI/workflow E2E | operator workflow | No |
| `smoke:calendar-real-scheduling` | `node --import tsx scripts/calendar-real-scheduling-smoke-044.mjs` | UI/workflow E2E | calendar UI/workflow | No |
| `smoke:douyin-save` | `tsx scripts/douyin-personal-save-smoke.mjs` | active platform-core | platform-core | Yes |
| `smoke:xiaohongshu-save` | `tsx scripts/xiaohongshu-personal-save-smoke.mjs` | active platform-core | platform-core | Yes |
| `smoke:video-account-save` | `tsx scripts/video-account-personal-save-smoke.mjs` | active platform-core | platform-core | Yes |
| `smoke:bilibili-save` | `tsx scripts/bilibili-personal-save-smoke.mjs` | active platform-core | platform-core | Yes |
| `smoke:platforms-save` | `tsx scripts/platform-personal-save-smoke.mjs --platform=all` | active platform-core | platform-core | Yes |
| `smoke:platform-operations-e2e` | `node scripts/platform-operations-e2e-smoke.mjs` | active platform-core proof | platform-core | Yes |
| `smoke:platform-ops-with-health` | `node scripts/platform-ops-with-health-smoke.mjs` | active platform-core proof/health | platform-core | Yes |
| `gate:daily-platform-ops` | `node scripts/daily-platform-ops-gate.mjs` | daily ops | daily ops / reporting | No |
| `ops:daily-self-media` | `node scripts/daily-self-media-ops.mjs` | daily ops | daily ops / reporting | No |
| `simple-icons` | `^16.22.0` | UI icon dependency | UI icon dependency | No |

## Platform-Core Package Hunks

These script entries can enter a platform-core package hunk after main-session approval:

```text
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

Optional platform-core companion hunks:

```text
discover:douyin
discover:xiaohongshu
discover:video-account
discover:bilibili
```

Rationale:

- The dry-run verification required the import/save/operation/health smoke commands.
- Discovery commands are active-platform companions but were not required by `PLATFORM-CORE-STAGING-DRYRUN-049`.

## Must Exclude From Platform-Core Package Hunks

### Paused WeChat

```text
sync:wechat
discover:wechat-backend
```

Existing `check:wechat` predates this diff and remains outside the new staging hunk discussion.

### Bilibili Diagnostics

```text
preview:bilibili-account-metrics
```

Bilibili account metrics remain preview-only and should not be packaged as active platform-core durable behavior.

### Daily Ops / Reporting / Health Beyond Platform-Core

```text
check:real-capture-freshness
check:local-data-quarantine
check:local-server-health
audit:trusted-dashboard
audit:dashboard-numbers
check:clean-profile
report:trusted-weekly
report:trusted-weekly:safe
report:daily-ops:safe
gate:daily-platform-ops
ops:daily-self-media
```

### UI / Operating E2E

```text
e2e:content-curation
smoke:operating-dashboard-import
smoke:operating-action-to-content
smoke:draft-review-ui-e2e
smoke:calendar-real-scheduling
```

### Next / Operator Tooling

```text
dev
start
dev:operator
```

The 3200 port and `dev:operator` changes belong with `.gitignore`, `next.config.mjs`, and `scripts/start-operator-dev.mjs`.

### UI Icon Dependency

```text
simple-icons
```

This belongs with `package-lock.json`, `PlatformBadge.tsx`, and the required icon CSS/UI evidence.

### Browser Tooling

```text
check:browser
```

This belongs to a later browser tooling bundle.

## Recommended Path

Recommendation: do a small package cleanup task before staging, not manual whole-file staging.

Reason:

- The current `package.json` diff is one contiguous mixed hunk in Git.
- Whole-file staging would incorrectly mix platform-core, paused WeChat, Bilibili diagnostics, daily ops, UI E2E, next-dist tooling, browser tooling, and `simple-icons`.
- Interactive hunk staging is possible but fragile because entries are adjacent and JSON comma placement matters.

Preferred next task:

1. Edit `package.json` into a bundle-friendly order or split plan while preserving behavior.
2. Keep only platform-core package entries in the platform-core staging lane.
3. Move or defer non-platform-core script additions to their owning package bundles.
4. Verify `npm run typecheck`, `npm run test:self-media`, and the platform smoke commands after cleanup.

If the main session chooses hunk-level staging anyway:

- Use patch-mode staging with a reviewed patch, not broad `git add package.json`.
- Stage only the platform-core entries listed above.
- Re-open `package.json` after staging to ensure JSON syntax and comma placement are valid.
- Run `npm run typecheck` before proceeding.

## Verification

- `git diff --check`: PASS.
- handoff trailing-whitespace check: PASS.

## Changed Files

This auditor changed only:

```text
docs/handoffs/PACKAGE-SCRIPT-HUNK-PLAN-049-auditor-handoff.md
```

## Orchestrator Decision Required

Yes.

Main session should decide whether to run a package cleanup task before staging or perform reviewed hunk-level staging manually.
