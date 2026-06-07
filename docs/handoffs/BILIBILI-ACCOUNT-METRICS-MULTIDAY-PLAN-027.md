# BILIBILI-ACCOUNT-METRICS-MULTIDAY-PLAN-027

## Purpose

Run a 2-3 day Bilibili account-level metric observation window before any durable `AccountMetricSnapshot` save task.

Current state:

- `overview_stat_num` has one stable canonical candidate on repeated same-day preview.
- The candidate is still same-date evidence, not multi-day semantic proof.
- `index_stat`, `overview_compare`, and `overview_stat_graph` remain rejected.
- `dateKeyRows` remain diagnostics only.
- No `AccountMetricSnapshot` should be saved during this plan.
- Dashboard/review content totals must remain unchanged by account metric preview work.
- WeChat Official Account / WeChat backend remains paused.

## Daily Run Window

Run once per calendar day for three consecutive days if possible. If a day is missed, continue until there are three actual run days.

Recommended timing:

- Run after Bilibili creator-center daily stats have likely refreshed.
- Use the same local machine and repo root:
  - `D:\codex work\自媒体创作\Data Collection and Background Analysis`
- Keep the same target page to reduce endpoint drift:
  - `https://member.bilibili.com/platform/data-up/overview`

## Daily Commands

Set a day key for local report copies:

```powershell
$day = Get-Date -Format "yyyy-MM-dd"
$out = ".local\bilibili-account-metrics-v0\multiday\$day"
New-Item -ItemType Directory -Force -Path $out | Out-Null
```

Run Bilibili discovery:

```powershell
npm run discover:bilibili -- --target=https://member.bilibili.com/platform/data-up/overview --duration=90000 --max-captures=160
```

During the discovery window, manually use the browser if needed:

- confirm login if prompted;
- open or refresh data center;
- click account overview / overview / trend modules if visible;
- do not bypass CAPTCHA or risk-control prompts;
- do not collect public content in bulk.

Run Bilibili import preview only:

```powershell
npm run import:bilibili
```

Run account metrics candidate preview:

```powershell
npm run preview:bilibili-account-metrics
```

Run platform data health:

```powershell
npm run health:platform-data
```

Copy same-day summary artifacts for comparison:

```powershell
Copy-Item ".local\bilibili-personal-v0\capture-summary.json" "$out\capture-summary.json"
Copy-Item ".local\bilibili-personal-v0\field-report.md" "$out\field-report.md"
Copy-Item ".local\bilibili-personal-v1\mapping-preview.json" "$out\mapping-preview.json"
Copy-Item ".local\bilibili-account-metrics-v0\account-preview.json" "$out\account-preview.json"
Copy-Item ".local\platform-data-health\report.json" "$out\platform-data-health-report.json"
Copy-Item ".local\platform-data-health\report.md" "$out\platform-data-health-report.md"
```

Do not copy `.local\bilibili-personal-v0\raw\` into the multiday folder. Raw captures may remain local under `.local`, but they must not be committed to git or pasted into handoffs.

## Daily Checklist

For each day, record these summary fields in the next worker note or orchestrator review:

| Check | Expected |
| --- | --- |
| discovery target | `https://member.bilibili.com/platform/data-up/overview` |
| discovery loginState | `logged_in_or_accessible` or clearly explained if not |
| discovery jsonCaptures | non-zero |
| discovery endpointCount | non-zero |
| import preview saved | `false` |
| import preview previewOnly | `true` |
| account preview saved | `false` |
| account preview previewOnly | `true` |
| candidateCount | at least 1 is useful; 0 requires diagnosis |
| canonical endpoint | `overview_stat_num` |
| rejected endpoints | still reject `index_stat`, `overview_compare`, `overview_stat_graph` |
| health report | `ok` or documented warnings |
| dashboard/review content totals | unchanged by account preview itself |

## Three-Day Acceptance Standard

After three actual run days, durable save can only be considered if all of these are true:

1. At least two different `AccountMetricSnapshot` candidate dates exist across the saved daily `account-preview.json` files.
2. Each accepted candidate comes from `overview_stat_num`.
3. `overview_stat_num` dedupe remains stable:
   - group by normalized `snapshotDate`;
   - select the highest non-zero signal row for the date;
   - tie-break by latest `capturedAt`;
   - lower-signal same-date rows remain rejected as duplicates.
4. Rejected rules do not drift:
   - `index_stat` remains aggregate/cumulative and is not a daily snapshot;
   - `overview_compare` remains comparison/range evidence and is not a direct daily metric;
   - `overview_stat_graph` remains graph diagnostic until series/axis semantics are mapped;
   - `dateKeyRows` remain diagnostics only.
5. `views` and `followersDelta` values are plausible day-level increments:
   - non-negative unless a future spec explicitly accepts negative deltas;
   - not obviously cumulative account totals;
   - not copied from comparison rows.
6. `npm run health:platform-data` stays acceptable or explains only freshness/local-evidence warnings.
7. Dashboard/review content totals do not change from account preview work.
8. No raw payload, cookie, token, header, credential, comment body, or danmu text appears in reports or handoffs.

If these pass, the next task may be a spec-first durable save proposal for one canonical `AccountMetricSnapshot` per `platform/source/date`.

## Continue Preview-Only If

Remain preview-only and do not open durable save if any of these happen:

- all runs produce only the same candidate date;
- candidate dates are missing or invalid;
- accepted candidates come from anything other than `overview_stat_num`;
- dedupe changes unexpectedly;
- rejected endpoint rules drift;
- `views` or `followersDelta` look cumulative, comparison-based, or otherwise implausible;
- account preview changes dashboard/review content totals;
- any report exposes raw payload, cookie, token, headers, credentials, comment body, or danmu text;
- health report flags unresolved stale/missing evidence that affects Bilibili account preview.

If only the same day repeats, treat the result as stronger same-date stability evidence, not multi-day proof. Continue `preview:bilibili-account-metrics` only and collect additional days.

## Files To Keep Local

Daily comparison files should remain under:

```text
.local/bilibili-account-metrics-v0/multiday/YYYY-MM-DD/
```

Expected local summary files:

- `capture-summary.json`
- `field-report.md`
- `mapping-preview.json`
- `account-preview.json`
- `platform-data-health-report.json`
- `platform-data-health-report.md`

Raw captures remain only under platform raw folders such as:

```text
.local/bilibili-personal-v0/raw/
```

Do not commit `.local` daily artifacts or raw captures unless the orchestrator explicitly requests a sanitized fixture in a separate task.

## Explicit Non-Goals

- Do not save `AccountMetricSnapshot`.
- Do not change Repo/SQLite save behavior.
- Do not change dashboard/review totals.
- Do not add browser collection buttons.
- Do not continue WeChat Official Account / WeChat backend work.
- Do not paste raw payload into docs, handoffs, or chat.
