# OPERATOR-VIEW-DATA-ONLY-041 Orchestrator Decision

## Decision

Default user-facing pages are not yet fully cleaned for real operation. The trusted data scope is mostly established, but the UI still exposes too many local/debug/internal signals.

Going forward, every dashboard-like page must follow the Operator View Data Only rule:

- Default view shows business data only: metrics, charts, rankings, content tables, schedule tables, and user-actionable tasks.
- Default view must hide internal audit, local file paths, handoff/report paths, run ids, API urls, npm commands, raw capture folders, evidence files, health-probe internals, and implementation/debug wording.
- Internal diagnostics may remain available only behind a clearly collapsed advanced/developer diagnostics area or a dedicated diagnostics route. They must not dominate the first screen.
- Default rows must be filtered to real operating information. Demo, smoke, fixture, test, sample, legacy polluted, unknown, paused WeChat, account-preview-only, and untrusted local rows must not appear in default charts/tables unless the user explicitly chooses an all-local/debug filter.
- Publish records are local manual confirmations, not real platform API proof and not trusted metric evidence.
- Bilibili account-level metrics remain preview-only and must not be mixed into content dashboards.

## Page Rules

### `/dashboard`

Default dashboard should contain only:

- core KPI cards;
- platform/content trend charts;
- content ranking/performance tables;
- filtered action tasks that matter to operation;
- concise freshness/status badges only when they affect whether data can be trusted.

Hide from default dashboard:

- `.local` paths, report paths, safe weekly local paths;
- `npm run` commands;
- audit command blocks;
- API urls;
- raw internal status labels such as `trusted audit`, `daily ops gate`, `preflight`, `pageReady`, `apiReady`, `stale/old`, unless collapsed under diagnostics;
- implementation disclaimers repeated across panels.

### `/calendar`

Default calendar should show real actionable scheduling information only:

- scheduled or publish-confirmation rows tied to trusted creator-center content or explicitly user-created content drafts;
- manual publish ledger rows only as a compact table, clearly separate from platform metric evidence;
- empty state if no real actionable schedule exists.

Hide from default calendar:

- fake-looking layout cards created only by test/demo/smoke/local-debug state;
- untrusted/manual/csv/external rows unless the user explicitly enables all-local/debug view;
- disabled decorative controls that imply unavailable capability.

### `/content`

Default content workbench should open on rows that are useful for operation:

- trusted creator-center content;
- user-created drafts from action workflow;
- scheduled/review-needed items.

All-local archive rows can remain available through filters, but the first view must not feel like a dump of every local record.

### `/import`

Default import page should focus on:

- platform import actions;
- latest real import summary;
- whether data is fresh enough to trust;
- preview/save result summaries.

Move health scripts, report paths, preflight internals, run ids, raw directories, and audit details into advanced diagnostics.

### `/reviews`

Default reviews should show:

- conclusion;
- metric table;
- evidence summary table;
- action items.

Do not expose local report paths, audit internals, raw evidence ids, or debug fields in the main review reading flow.

## Acceptance Gate For Workers

Workers touching any user-facing page must add or update tests/smoke assertions so the default viewport does not visibly include:

- `.local`;
- `docs/handoffs`;
- `report.json`;
- `report.md`;
- `D:\`;
- `npm run`;
- `http://127.0.0.1`;
- `/api/self-media`;
- `runId`;
- `rawDir`;
- `evidenceFile`;
- `preflight`;
- `pageReady`;
- `apiReady`;
- `smoke`;
- `fixture`;
- `demo/fake`.

Exceptions are allowed only inside collapsed advanced diagnostics or explicit all-local/debug views.

## Current User Feedback

The user reviewed `http://localhost:3200/dashboard` and `/calendar` on June 5, 2026 and reported:

- calendar still has fake-looking calendar layout/cards;
- dashboard shows unnecessary internal fields, file/archive paths, and internal audit/recheck panels;
- the user only wants data, charts, and tables by default;
- this filtering principle applies to all dashboards/pages.

## Next Work Recommendation

Split implementation into parallel tasks:

1. `DASHBOARD-DATA-ONLY-041`: clean `/dashboard` default view.
2. `CALENDAR-REAL-SCHEDULE-041`: clean `/calendar` default view and fake-looking rows.
3. `IMPORT-DIAGNOSTICS-ADVANCED-041`: move `/import` internals into advanced diagnostics.
4. `CONTENT-REVIEWS-FILTERED-041`: apply the same default filtering principle to `/content` and `/reviews`.

Each worker should write a handoff and screenshot, then use the Short Chat Protocol.
