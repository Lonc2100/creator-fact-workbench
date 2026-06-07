# PLATFORM-RUNBOOK-019

## Purpose

This runbook turns the accepted platform logged-in capture/import loops into a repeatable local operating procedure.

Scope:

- Closed-loop content import platforms: Douyin personal creator center, Xiaohongshu creator center, Video Account assistant / creator backend, and Bilibili creator center archives.
- Paused: WeChat Official Account backend and WeChat public account backend discovery.
- Out of scope: public crawling, CAPTCHA bypass, password collection, token/header storage, raw payload sharing in chat.

## Current Status As Of PLATFORM-RUNBOOK-STATUS-024

Current closed-loop platforms:

- Douyin: personal creator-center content and stable per-work metrics.
- Xiaohongshu: creator-center notes and stable per-note metrics.
- Video Account: assistant / creator backend posts and stable per-post metrics.
- Bilibili: creator-center `archives` works and content-level per-work metrics only.

Bilibili boundary:

- Durable save is accepted for Bilibili archives content-level works and per-work metrics.
- Bilibili `accountMetrics` and `dateKeyRows` are diagnostics only and must not be written into content, platform metric, platform version, or content-level metric snapshot records.
- Bilibili comment body text, danmu text, raw payloads, cookies, tokens, request headers, and credentials are not durable save targets.

Account-level metrics boundary:

- `AccountMetricSnapshot` is the account/platform/date-level model.
- `AccountMetricSnapshot` is separate from content-level `MetricSnapshot`.
- Account snapshots can support future account trend panels and account-level analytics.
- Account snapshots do not participate in content totals, weekly/monthly review content totals, saved review `metricSnapshotIds`, or content-level dashboard metric totals.

Import operation history boundary:

- `/import` operation history is local internal audit history for platform `preview`, `save`, and `save_smoke` actions.
- It records only summary/audit fields: created time, actor, platform, action, source, status, content count, metric count, warning count/summary, and run id.
- It does not record raw payloads, cookies, tokens, request headers, raw captures, platform response bodies, passwords, or credentials.
- Preview operations are traceable through operation history even though they do not create `ImportRun`; save operations remain traceable through both import runs and operation history.

WeChat / Official Account backend work remains paused. Do not resume WeChat backend discovery, mapping, sync, or public account backend work from this runbook unless the user explicitly reopens that scope.

## Required Working Directory

Always run commands from the project root:

```powershell
Set-Location -LiteralPath 'D:\codex work\自媒体创作\Data Collection and Background Analysis'
Get-Location
```

`Get-Location` must show the project root above. Do not run `npm` from `C:\Program Files\PowerShell\7`; that directory has no project `package.json` and commonly causes `npm ENOENT` or "cannot find package.json" failures.

If unsure, run:

```powershell
Test-Path -LiteralPath '.\package.json'
```

It must return `True`.

## Shared Safety Rules

- The collector observes only the user's own logged-in creator/admin pages.
- The user logs in manually in the browser when required.
- Do not ask for, paste, save, or commit passwords, cookies, auth headers, tokens, full request headers, or raw platform payloads.
- Raw captures stay local under `.local/<platform>-personal-v0/raw/`.
- Preview and smoke evidence stay local under `.local/<platform>-personal-v1/`.
- Do not paste raw payload JSON into chat. Share only command output summaries, `field-report.md` conclusions, `endpoints.json` endpoint names, and `mapping-preview.json` counts/warnings.
- Run one platform collector at a time unless a task explicitly defines separate CDP ports.

## Why The Login Browser Is Not The Daily Browser

The default discover scripts launch Chrome or Edge with an independent profile under `.local/<platform>-personal-v0/chrome-profile`.

This is intentional:

- independent profile: platform login cookies/session storage are scoped to this project collector profile;
- safer: daily browser cookies, extensions, open tabs, and personal browsing state are not exposed to the collector;
- repeatable: the same local profile can be reused for later captures on the same machine;
- no daily-browser pollution: platform login prompts, risk checks, and collector debugging do not alter the user's normal browser profile.

Avoid `--no-launch` unless you deliberately started a known collector browser with remote debugging. If `--no-launch` attaches to an everyday browser on the same CDP port, the run is no longer using the preferred isolated profile.

## Login State Lifecycle

Login state usually persists because the platform stores session cookies/local storage in `.local/<platform>-personal-v0/chrome-profile`.

It can expire or become invalid when:

- the platform session naturally times out;
- the user logs out in the collector browser;
- password/security settings change;
- the platform requests QR login, CAPTCHA, device verification, or risk-control confirmation;
- `.local/<platform>-personal-v0/chrome-profile` is deleted or moved;
- the browser executable/profile becomes incompatible after machine or browser changes;
- the collector is pointed at the wrong CDP endpoint.

When login expires, rerun the discover command, complete the normal platform login manually in the opened collector browser, then rerun discovery. Do not bypass challenges.

## Docker Restart Boundary

The default runbook commands are Windows PowerShell commands executed from the local project root, not Docker commands.

Docker restart effects:

- Current local browser login state: not affected if the browser profile is on the Windows host under `.local/<platform>-personal-v0/chrome-profile`.
- Local captures: not affected if `.local/` is on the host workspace.
- Local Repo/SQLite: not affected if `.local/self-media.sqlite` is on the host workspace.
- Running collector/import/smoke process: interrupted if it was running inside a container or if the process depended on a containerized service.
- Container-local files: can be lost if they were written only inside an ephemeral container and not mounted to the host workspace.

After a Docker restart, rerun the current command from the host project root. If the repo is mounted into Docker, verify whether `.local/` is host-mounted before assuming captures or SQLite data survived.

## Platform Commands

### Douyin

Target:

```text
https://creator.douyin.com/creator-micro/data-center/operation
```

Discover:

```powershell
npm run discover:douyin
```

Useful discover variants:

```powershell
npm run discover:douyin -- --duration=120000 --max-captures=120
npm run discover:douyin -- --target=https://creator.douyin.com/creator-micro/data-center/operation
npm run discover:douyin -- --no-launch --cdp=http://127.0.0.1:9222
```

During discovery, log in manually if prompted, then open/refresh the normal data-center modules for overview, works, item analysis, and metrics.

Expected local V0 outputs:

- `.local/douyin-personal-v0/raw/`
- `.local/douyin-personal-v0/endpoints.json`
- `.local/douyin-personal-v0/field-report.md`

Import preview:

```powershell
npm run import:douyin
```

Preview output:

- `.local/douyin-personal-v1/mapping-preview.json`
- expected source: `douyin_creator_center`
- preview default: `saved: false`

Save:

```powershell
npm run import:douyin -- --save
```

Smoke:

```powershell
npm run smoke:douyin-save
```

Smoke output:

- `.local/douyin-personal-v1/save-smoke-report.json`

Known mapping boundaries:

- maps personal work-list content and stable content metrics;
- skips unmatched hot video/topic rows to avoid public/bulk contamination;
- comment content and follower delta remain outside the stable V1 import path unless a later task confirms them.

### Xiaohongshu

Target:

```text
https://creator.xiaohongshu.com/
```

Discover:

```powershell
npm run discover:xiaohongshu
```

Useful discover variants:

```powershell
npm run discover:xiaohongshu -- --duration=120000 --max-captures=120
npm run discover:xiaohongshu -- --target=https://creator.xiaohongshu.com/
npm run discover:xiaohongshu -- --no-launch --cdp=http://127.0.0.1:9222
```

During discovery, log in manually if prompted, then open/refresh the normal creator center modules for account overview, note list, note detail, fans, and metrics.

Expected local V0 outputs:

- `.local/xiaohongshu-personal-v0/raw/`
- `.local/xiaohongshu-personal-v0/endpoints.json`
- `.local/xiaohongshu-personal-v0/field-report.md`

Import preview:

```powershell
npm run import:xiaohongshu
```

Preview output:

- `.local/xiaohongshu-personal-v1/mapping-preview.json`
- expected source: `xiaohongshu_creator_center`
- preview default: `saved: false`

Save:

```powershell
npm run import:xiaohongshu -- --save
```

Smoke:

```powershell
npm run smoke:xiaohongshu-save
```

Smoke output:

- `.local/xiaohongshu-personal-v1/save-smoke-report.json`

Known mapping boundaries:

- maps stable personal note identity and content metrics;
- skips topic/recommendation captures that look like public-note browsing;
- comment content and account aggregates remain outside the stable V1 import path unless a later task confirms them.

### Video Account

Target:

```text
https://channels.weixin.qq.com/platform
```

Discover:

```powershell
npm run discover:video-account
```

Useful discover variants:

```powershell
npm run discover:video-account -- --duration=120000 --max-captures=120
npm run discover:video-account -- --target=https://channels.weixin.qq.com/platform
npm run discover:video-account -- --no-launch --cdp=http://127.0.0.1:9222
```

During discovery, log in manually if prompted, then open/refresh the normal assistant / creator backend modules for overview, works/data, fans, referral, and comments. Private messages and personal interaction content are not import targets.

Expected local V0 outputs:

- `.local/video-account-personal-v0/raw/`
- `.local/video-account-personal-v0/endpoints.json`
- `.local/video-account-personal-v0/field-report.md`

Import preview:

```powershell
npm run import:video-account
```

Preview output:

- `.local/video-account-personal-v1/mapping-preview.json`
- expected source: `video_account_creator_center`
- preview default: `saved: false`

Save:

```powershell
npm run import:video-account -- --save
```

Smoke:

```powershell
npm run smoke:video-account-save
```

Smoke output:

- `.local/video-account-personal-v1/save-smoke-report.json`

Known mapping boundaries:

- maps stable personal post-list content and per-post metrics;
- skips private-message endpoints and rows with missing/redacted object IDs;
- comment/bullet-chat text, private messages, account aggregates, and official-account referral/click metrics remain outside the stable V1 import path unless a later task confirms them.

### Bilibili

Target:

```text
https://member.bilibili.com/creator/home
```

Discover:

```powershell
npm run discover:bilibili
```

Useful discover variants:

```powershell
npm run discover:bilibili -- --duration=120000 --max-captures=120
npm run discover:bilibili -- --target=https://member.bilibili.com/creator/home
npm run discover:bilibili -- --no-launch --cdp=http://127.0.0.1:9222
```

During discovery, log in manually if prompted, then open/refresh the normal creator center modules for archives/work list and creator analytics. Do not collect public browsing data.

Expected local V0 outputs:

- `.local/bilibili-personal-v0/raw/`
- `.local/bilibili-personal-v0/endpoints.json`
- `.local/bilibili-personal-v0/field-report.md`

Import preview:

```powershell
npm run import:bilibili
```

Preview output:

- `.local/bilibili-personal-v1/mapping-preview.json`
- expected source: `bilibili_creator_center`
- preview default: `saved: false`

Save:

```powershell
npm run import:bilibili -- --save
```

Smoke:

```powershell
npm run smoke:bilibili-save
```

Smoke output:

- `.local/bilibili-personal-v1/save-smoke-report.json`

Known mapping boundaries:

- maps only accepted creator-center `archives` content-level works and per-work metrics;
- saves `Content`, `PlatformMetric`, `ContentPlatformVersion`, and content-level `MetricSnapshot` for mapped archive content IDs;
- keeps Bilibili `accountMetrics` and `dateKeyRows` as preview/report diagnostics only;
- does not save account overview/stat diagnostics, survey/date-key diagnostics, comment body text, danmu text, raw payloads, cookies, tokens, headers, or credentials.

Account metrics diagnostic preview:

```powershell
npm run preview:bilibili-account-metrics
```

This command is for account-level diagnostics and future `AccountMetricSnapshot` planning only. It must not be treated as a content import/save command, and its `accountMetrics` / `dateKeyRows` output must not be copied into content-level records.

## Field Validation Checklist

After discover:

```powershell
Get-Content -LiteralPath '.local/<platform>-personal-v0/field-report.md'
```

Validate:

- `Login state` is `logged_in_or_accessible` or otherwise explained by real manual login state;
- `JSON captures` is greater than `0`;
- target coverage includes the expected account/work/metric fields;
- endpoint candidates are platform creator/admin endpoints, not login-only or unrelated utility endpoints.

After import preview:

```powershell
Get-Content -LiteralPath '.local/<platform>-personal-v1/mapping-preview.json'
```

Validate without pasting raw payload:

- `saved` is `false` for preview-only runs;
- `payload.source` matches the platform source;
- `contentCount` and `metricCount` are greater than `0` for a useful import;
- warnings are understood and match known boundaries.
- for Bilibili, verify useful content rows come from accepted `archives` work data, not account overview/stat or survey/date-key diagnostics.

After save:

- `mapping-preview.json` should show `saved: true`;
- import runs are append-style records;
- content, platform versions, metrics, and metric snapshots are upserted for the mapped content IDs.
- for Bilibili, saved rows must remain archives content-level only; `accountMetrics` and `dateKeyRows` must remain unsaved diagnostics.

After smoke:

```powershell
Get-Content -LiteralPath '.local/<platform>-personal-v1/save-smoke-report.json'
```

Validate:

- `passed` is `true`;
- `source` matches the platform source;
- content, metrics, platform versions, metric snapshots, dashboard, and weekly/monthly review checks are present;
- safety checks pass.

## Account-Level Metrics Model

Use this distinction whenever a platform exposes account aggregates:

- `MetricSnapshot`: content/platform-version level. It belongs to a content item and can participate in content-level dashboard/review totals.
- `AccountMetricSnapshot`: account/platform/date level. It belongs to an account trend and stays separate from content totals.

Current accepted behavior:

- `AccountMetricSnapshot` can be listed and grouped separately for account trend views.
- Weekly and monthly review totals do not include account snapshots.
- Saved review `metricSnapshotIds` remain content-level IDs only.
- Bilibili `accountMetrics` and `dateKeyRows` are not persisted yet, even though the account-level model exists.

Do not "promote" account diagnostics into content metrics to make dashboards look complete. If future work wants to save account-level Bilibili metrics, it must use a separate account-metrics task and write `AccountMetricSnapshot`, not content-level `MetricSnapshot`.

## Import Operation History On /import

The `/import` page shows local operation history for platform operations.

It records:

- created time;
- actor;
- platform;
- action: `preview`, `save`, or `save_smoke`;
- source;
- status;
- content count;
- metric count;
- warning count and warning summary;
- run id.

It does not record:

- raw payloads;
- raw captures;
- platform response bodies;
- cookies;
- tokens;
- auth/request headers;
- passwords or credentials.

Use operation history as a compact local audit trail only. Do not treat it as proof that raw platform payloads are safe to paste into docs, tests, issues, or chat.

## Failure Recovery

### npm ENOENT Or Missing package.json

Likely cause:

- PowerShell is in `C:\Program Files\PowerShell\7` or another non-project directory;
- `npm` or Node is not available in PATH;
- the command was run from a container/path that does not contain this project.

Recover:

```powershell
Set-Location -LiteralPath 'D:\codex work\自媒体创作\Data Collection and Background Analysis'
Get-Location
Test-Path -LiteralPath '.\package.json'
npm --version
node --version
```

Rerun the intended command only after `package.json` is visible.

### Not Logged In

Symptoms:

- `loginState` is `needs_login` or `maybe_logged_in_with_login_prompt`;
- the browser shows QR login, phone login, CAPTCHA, or security verification;
- `ok` is `false` for Video Account because login prompt remains.

Recover:

- complete normal login manually in the collector browser;
- do not paste passwords, QR screenshots, cookies, or tokens into chat;
- rerun the discover command after login completes;
- if the wrong browser was attached, close it and rerun without `--no-launch` so the script opens the isolated profile.

### 0 Captures

Symptoms:

- command prints `captures: 0`;
- `field-report.md` says no JSON responses were captured;
- raw directory has no useful new files.

Recover:

- verify the collector browser is logged in;
- refresh the target page while the discover command is still running;
- click the platform's normal overview, work/note/post list, data, fans, and detail modules;
- increase capture duration: `--duration=120000`;
- increase capture cap if needed: `--max-captures=120`;
- avoid `--no-launch` unless the CDP endpoint is known-good;
- rerun discover, then inspect `field-report.md` rather than raw JSON.

### Typecheck Fail

Recover:

```powershell
npm run typecheck
```

If this runbook task only changed docs, do not make broad business-code fixes. Record the failing TypeScript file and error in the handoff, then ask the Orchestrator to decide whether the failure is pre-existing or should become a separate code task.

### Harness Fail

Recover:

```powershell
npm run verify:harness
```

Identify the first failing subcommand. For runbook-only work, do not normalize unrelated code or generated files just to force the harness green. Record the failing gate and whether `git diff --check` still passed.

### Raw Payload Should Not Be Shared

Do not paste `.local/*/raw/*.json` contents into chat, docs, issues, or tests.

Allowed to share:

- command names and high-level output counts;
- sanitized endpoint names from `field-report.md` or `endpoints.json`;
- `mapping-preview.json` summary fields such as source, counts, `saved`, and warnings;
- smoke report pass/fail and aggregate check counts.

If detailed field proof is needed, point to the local file path and summarize the field paths.

## WeChat / Official Account Pause

Do not continue WeChat Official Account backend discovery, WeChat backend V1 mapping, or WeChat public account backend work from this runbook.

WeChat backend V0 is historical context only. It remains paused until the user explicitly reopens it.

Existing scripts such as `discover:wechat-backend`, `check:wechat`, and `sync:wechat` may remain in the repo, but they are not part of PLATFORM-RUNBOOK-019 execution.

## Quick Command Matrix

| Platform | Discover | Import preview | Save | Smoke |
| --- | --- | --- | --- | --- |
| Douyin | `npm run discover:douyin` | `npm run import:douyin` | `npm run import:douyin -- --save` | `npm run smoke:douyin-save` |
| Xiaohongshu | `npm run discover:xiaohongshu` | `npm run import:xiaohongshu` | `npm run import:xiaohongshu -- --save` | `npm run smoke:xiaohongshu-save` |
| Video Account | `npm run discover:video-account` | `npm run import:video-account` | `npm run import:video-account -- --save` | `npm run smoke:video-account-save` |
| Bilibili | `npm run discover:bilibili` | `npm run import:bilibili` | `npm run import:bilibili -- --save` | `npx tsx scripts/bilibili-personal-save-smoke.mjs` |

Account-level diagnostics that are not content saves:

| Platform | Diagnostic command | Durable save status |
| --- | --- | --- |
| Bilibili | `npm run preview:bilibili-account-metrics` | Diagnostics only; `accountMetrics` and `dateKeyRows` do not enter durable content-level records. |
